"""Shared Appium fixtures and helpers for Drone4Dengue mobile tests."""

from __future__ import annotations

import os
import json
import shutil
import sqlite3
import subprocess
import time
from datetime import datetime
from pathlib import Path
from tempfile import NamedTemporaryFile
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import pytest
from dotenv import load_dotenv
from selenium.common.exceptions import TimeoutException, WebDriverException
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


THIS_DIR = Path(__file__).resolve().parent
REPO_ROOT = THIS_DIR.parent

try:
    from setup_test_account import (
        DEFAULT_API_URL,
        DEFAULT_COMPANY_ID,
        DEFAULT_EMAIL,
        DEFAULT_PASSWORD,
        post_json as post_setup_json,
        response_message as setup_response_message,
    )
except ImportError:
    DEFAULT_API_URL = "http://127.0.0.1:4000"
    DEFAULT_COMPANY_ID = "comp-999"
    DEFAULT_EMAIL = "appium.user@drone4dengue.local"
    DEFAULT_PASSWORD = "TestPass1!"
    post_setup_json = None
    setup_response_message = None

load_dotenv(REPO_ROOT / ".env", override=False)
load_dotenv(REPO_ROOT / "tests" / ".env", override=False)
load_dotenv(THIS_DIR / ".env", override=True)

APPIUM_SERVER = os.getenv(
    "APPIUM_SERVER",
    os.getenv("APPIUM_SERVER_URL", "http://127.0.0.1:4723"),
)
APPIUM_SERVER_URL = APPIUM_SERVER

ANDROID_DEVICE_NAME = os.getenv(
    "ANDROID_DEVICE_NAME",
    os.getenv("DEVICE_NAME", "Android Emulator"),
)
DEVICE_NAME = ANDROID_DEVICE_NAME

ANDROID_PLATFORM_VERSION = os.getenv(
    "ANDROID_PLATFORM_VERSION",
    os.getenv("PLATFORM_VERSION", ""),
)
PLATFORM_VERSION = ANDROID_PLATFORM_VERSION

ANDROID_APP_PACKAGE = os.getenv(
    "ANDROID_APP_PACKAGE",
    os.getenv("APP_PACKAGE", "com.adamarbain.dengueeyemobileapp"),
)
APP_PACKAGE = ANDROID_APP_PACKAGE

ANDROID_APP_ACTIVITY = os.getenv(
    "ANDROID_APP_ACTIVITY",
    os.getenv("APP_ACTIVITY", "com.adamarbain.dengueeyemobileapp.MainActivity"),
)
APP_ACTIVITY = ANDROID_APP_ACTIVITY

ANDROID_NO_RESET = os.getenv("ANDROID_NO_RESET", "true").lower() == "true"
ANDROID_ADB_EXEC_TIMEOUT = int(os.getenv("ANDROID_ADB_EXEC_TIMEOUT", "60000"))
ANDROID_UIAUTOMATOR2_SERVER_READ_TIMEOUT = int(
    os.getenv("ANDROID_UIAUTOMATOR2_SERVER_READ_TIMEOUT", "60000")
)
EXPO_DEV_SERVER_URL = os.getenv("EXPO_DEV_SERVER_URL", "http://10.0.2.2:8081")

TEST_MOBILE_EMAIL = os.getenv(
    "TEST_MOBILE_EMAIL",
    os.getenv("MOBILE_TEST_EMAIL", os.getenv("TEST_EMAIL", DEFAULT_EMAIL)),
)
TEST_MOBILE_PASSWORD = os.getenv(
    "TEST_MOBILE_PASSWORD",
    os.getenv("MOBILE_TEST_PASSWORD", os.getenv("TEST_PASSWORD", DEFAULT_PASSWORD)),
)
TEST_EMAIL = TEST_MOBILE_EMAIL
TEST_PASSWORD = TEST_MOBILE_PASSWORD

TEST_ADMIN_EMAIL = os.getenv("TEST_ADMIN_EMAIL", "admin1@drone4dengue.com")
TEST_ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "adminpass1")
TEST_COMPANY_ID = os.getenv("TEST_COMPANY_ID", DEFAULT_COMPANY_ID)
API_URL = os.getenv("API_URL", DEFAULT_API_URL).rstrip("/")
APPIUM_CREATE_TEST_ACCOUNT = os.getenv("APPIUM_CREATE_TEST_ACCOUNT", "true").lower() not in {
    "0",
    "false",
    "no",
}


def pytest_configure(config):
    config.addinivalue_line("markers", "appium: native mobile Appium tests")
    config.addinivalue_line("markers", "uc1: UC-1 Login Account tests")
    config.addinivalue_line("markers", "uc2: UC-2 Register Account tests")
    config.addinivalue_line("markers", "uc4: UC-4 Edit Profile tests")
    config.addinivalue_line("markers", "uc12: UC-12 Manage Settings tests")
    config.addinivalue_line("markers", "uc14: UC-14 Get Recommendations tests")


@pytest.fixture(scope="session")
def driver():
    """Create a session-level Android Appium driver for suites that use ``driver``."""
    mobile_driver = create_appium_driver(no_reset=True, clear_auth=False)
    yield mobile_driver
    safe_quit_driver(mobile_driver)


@pytest.fixture()
def appium_driver():
    """Create a fresh Android Appium session for isolated mobile tests."""
    mobile_driver = create_appium_driver(
        no_reset=ANDROID_NO_RESET,
        clear_auth=True,
    )
    yield mobile_driver
    safe_quit_driver(mobile_driver)


@pytest.fixture()
def login_screen(appium_driver):
    """Route the app to the unauthenticated Login screen."""
    open_expo_dev_server_if_needed(appium_driver)
    accept_disclaimer_if_needed(appium_driver)
    dismiss_location_error_if_needed(appium_driver)
    log_out_if_needed(appium_driver)
    wait_for_login_screen(appium_driver)
    return appium_driver


@pytest.fixture(scope="session")
def logged_in_driver(driver):
    """Log in once and return an authenticated Appium driver."""
    ensure_logged_in(driver)
    return driver


@pytest.fixture()
def logged_in_mobile():
    """Return an authenticated Appium driver isolated to one mobile test."""
    mobile_driver = create_appium_driver(no_reset=True, clear_auth=False)
    ensure_logged_in(mobile_driver)
    yield mobile_driver
    safe_quit_driver(mobile_driver)


@pytest.fixture(scope="session")
def mobile_test_account():
    """Create or verify the reusable mobile account before login-dependent tests."""
    if APPIUM_CREATE_TEST_ACCOUNT:
        ensure_mobile_test_account_exists()

    return {
        "email": TEST_MOBILE_EMAIL,
        "password": TEST_MOBILE_PASSWORD,
        "companyId": TEST_COMPANY_ID,
    }


@pytest.fixture(autouse=True)
def prepare_mobile_test_account(request):
    """Keep UC-1/UC-2/authorized Appium tests self-contained when the API is up."""
    needs_mobile_account = (
        request.node.get_closest_marker("uc1")
        or request.node.get_closest_marker("uc2")
        or "logged_in_driver" in request.fixturenames
        or "logged_in_mobile" in request.fixturenames
    )
    if needs_mobile_account:
        request.getfixturevalue("mobile_test_account")


def ensure_mobile_test_account_exists():
    if post_setup_json is None or setup_response_message is None:
        return

    register_payload = {
        "email": TEST_MOBILE_EMAIL,
        "password": TEST_MOBILE_PASSWORD,
        "name": os.getenv("TEST_MOBILE_NAME", "Appium Test User"),
        "username": os.getenv("TEST_MOBILE_USERNAME", "appiumtestuser"),
        "companyId": TEST_COMPANY_ID,
    }

    status, body = setup_account_request(f"{API_URL}/auth/register", register_payload)
    if 200 <= status < 300:
        return

    message = setup_response_message(body)
    if status == 409 and "already" in message.lower():
        login_status, login_body = setup_account_request(
            f"{API_URL}/auth/login",
            {"email": TEST_MOBILE_EMAIL, "password": TEST_MOBILE_PASSWORD},
        )
        if 200 <= login_status < 300:
            return

        pytest.fail(
            "Mobile test account already exists, but the configured password does not work. "
            f"Run `python appium-conftest/setup_test_account.py --email {TEST_MOBILE_EMAIL}` "
            f"or update appium-conftest/.env. API said: {setup_response_message(login_body)}"
        )

    if "company" in message.lower():
        pytest.skip(
            f"Cannot create Appium mobile test account because company {TEST_COMPANY_ID} is missing. "
            "Seed the local database, then run `python appium-conftest/setup_test_account.py`."
        )

    pytest.skip(f"Cannot prepare Appium mobile test account via {API_URL}: HTTP {status}: {message}")


def setup_account_request(url: str, payload: dict) -> tuple[int, dict]:
    try:
        return post_setup_json(url, payload)
    except SystemExit as exc:
        pytest.skip(
            f"Cannot reach API while preparing Appium mobile test account at {API_URL}. "
            "Start server-api or set APPIUM_CREATE_TEST_ACCOUNT=false to use an existing account."
        )


def create_appium_driver(no_reset: bool = True, clear_auth: bool = False):
    pytest.importorskip("appium")

    from appium import webdriver
    from appium.options.android import UiAutomator2Options

    if clear_auth:
        clear_mobile_auth_storage()

    options = UiAutomator2Options()
    options.platform_name = "Android"
    options.device_name = ANDROID_DEVICE_NAME
    options.automation_name = "UiAutomator2"
    options.app_package = ANDROID_APP_PACKAGE
    options.app_activity = ANDROID_APP_ACTIVITY
    options.auto_grant_permissions = True
    options.no_reset = no_reset
    options.full_reset = False
    options.new_command_timeout = 240
    options.set_capability("adbExecTimeout", ANDROID_ADB_EXEC_TIMEOUT)
    options.set_capability("uiautomator2ServerReadTimeout", ANDROID_UIAUTOMATOR2_SERVER_READ_TIMEOUT)
    options.set_capability("settings[waitForIdleTimeout]", 0)
    options.set_capability("settings[waitForSelectorTimeout]", 5000)

    # if ANDROID_PLATFORM_VERSION:
    #     options.platform_version = ANDROID_PLATFORM_VERSION

    try:
        driver = webdriver.Remote(APPIUM_SERVER_URL, options=options)
        driver.implicitly_wait(0)
        return driver
    except Exception as exc:
        pytest.skip(f"Could not connect to Appium Android session: {exc}")


def safe_quit_driver(driver):
    try:
        driver.quit()
    except WebDriverException:
        pass
    except Exception:
        pass


def ensure_logged_in(driver):
    open_expo_dev_server_if_needed(driver)
    accept_disclaimer_if_needed(driver)
    dismiss_location_error_if_needed(driver)

    if is_text_visible(driver, "Dashboard", timeout=10) or is_text_visible(driver, "Profile", timeout=3):
        return driver

    if not is_text_visible(driver, "Welcome Back", timeout=10):
        pytest.skip("Mobile app did not open to Login or Dashboard. Check emulator/app installation.")

    login_with_credentials(driver, TEST_MOBILE_EMAIL, TEST_MOBILE_PASSWORD)
    wait_for_text(driver, "Dashboard", timeout=40)
    return driver


def uiautomator_string(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"')


def text_selector(text: str) -> str:
    return f'new UiSelector().text("{uiautomator_string(text)}")'


def text_contains_selector(text: str) -> str:
    return f'new UiSelector().textContains("{uiautomator_string(text)}")'


def desc_contains_selector(text: str) -> str:
    return f'new UiSelector().descriptionContains("{uiautomator_string(text)}")'


def wait_for_element(driver, locator, timeout: int = 20):
    return WebDriverWait(driver, timeout).until(EC.presence_of_element_located(locator))


def wait_for_text(driver, text: str, timeout: int = 20):
    from appium.webdriver.common.appiumby import AppiumBy

    return wait_for_element(
        driver,
        (AppiumBy.ANDROID_UIAUTOMATOR, text_contains_selector(text)),
        timeout=timeout,
    )


def tap_text(driver, text: str, timeout: int = 20):
    element = wait_for_tappable_label(driver, text, timeout)
    tap_element_center(driver, element)
    return element


def tap_last_text(driver, text: str, timeout: int = 20):
    WebDriverWait(driver, timeout).until(lambda d: len(find_tappable_labels(d, text)) > 0)
    elements = find_tappable_labels(driver, text)
    tap_element_center(driver, elements[-1])
    return elements[-1]


def wait_for_tappable_label(driver, text: str, timeout: int = 20):
    try:
        return WebDriverWait(driver, timeout).until(
            lambda d: (matches[0] if (matches := find_tappable_labels(d, text)) else False)
        )
    except TimeoutException:
        hide_keyboard(driver)
        scroll_screen_up(driver)
        return WebDriverWait(driver, 8).until(
            lambda d: (matches[0] if (matches := find_tappable_labels(d, text)) else False)
        )


def find_tappable_labels(driver, text: str):
    from appium.webdriver.common.appiumby import AppiumBy

    desc_matches = driver.find_elements(
        AppiumBy.ANDROID_UIAUTOMATOR,
        desc_contains_selector(text),
    )
    clickable_desc_matches = [
        element
        for element in desc_matches
        if str(element.get_attribute("clickable")).lower() == "true"
    ]
    if clickable_desc_matches:
        return clickable_desc_matches

    return driver.find_elements(
        AppiumBy.ANDROID_UIAUTOMATOR,
        text_contains_selector(text),
    )


def tap_element_center(driver, element):
    rect = element.rect
    x = int(rect["x"] + rect["width"] / 2)
    y = int(rect["y"] + rect["height"] / 2)

    try:
        driver.execute_script("mobile: clickGesture", {"x": x, "y": y})
    except Exception:
        element.click()


def tap_screen_row_containing_text(driver, text: str, timeout: int = 20):
    element = wait_for_text(driver, text, timeout=timeout)
    rect = element.rect
    size = driver.get_window_size()
    y = int(rect["y"] + rect["height"] / 2)

    try:
        driver.execute_script(
            "mobile: clickGesture",
            {"x": int(size["width"] * 0.5), "y": y},
        )
    except Exception:
        tap_element_center(driver, element)
    return element


def is_text_visible(driver, text: str, timeout: int = 4) -> bool:
    try:
        wait_for_text(driver, text, timeout)
        return True
    except TimeoutException:
        return False


def open_expo_dev_server_if_needed(driver):
    if is_text_visible(driver, "Development Build", timeout=6):
        tap_text(driver, EXPO_DEV_SERVER_URL, timeout=10)


def accept_disclaimer_if_needed(driver):
    if not is_text_visible(driver, "Medical Disclaimer", timeout=8):
        return

    try:
        scroll_to_text(driver, "I Understand")
    except Exception:
        for _ in range(4):
            driver.swipe(500, 1500, 500, 500, 700)
            if is_text_visible(driver, "I Understand", timeout=1):
                break

    wait_for_text(driver, "I Understand & Accept", timeout=10)
    time.sleep(0.5)

    for _ in range(3):
        tap_last_text(driver, "I Understand & Accept", timeout=10)
        if not is_text_visible(driver, "Medical Disclaimer", timeout=2):
            return
        time.sleep(0.5)


def dismiss_location_error_if_needed(driver):
    location_error_texts = (
        "Failed to get location",
        "Location Error",
        "Unable to get current location",
        "Error getting location",
    )
    if not any(is_text_visible(driver, text, timeout=1) for text in location_error_texts):
        return

    try:
        tap_last_text(driver, "OK", timeout=5)
    except Exception:
        try:
            tap_text(driver, "OK", timeout=3)
        except Exception:
            pass
    time.sleep(0.5)


def log_out_if_needed(driver):
    if not is_text_visible(driver, "Dashboard", timeout=12):
        return

    dismiss_location_error_if_needed(driver)
    tap_text(driver, "Profile", timeout=10)
    tap_text(driver, "Log Out", timeout=15)
    tap_last_text(driver, "Log Out", timeout=10)


def wait_for_login_screen(driver):
    return_to_login_if_on_non_login_auth_screen(driver)
    wait_for_text(driver, "Welcome Back", timeout=60)


def return_to_login_if_on_non_login_auth_screen(driver):
    if is_text_visible(driver, "Terms and Privacy Policy", timeout=2):
        driver.back()
        time.sleep(0.5)

    if is_text_visible(driver, "Create Account", timeout=3):
        tap_last_text(driver, "Sign In", timeout=10)
        time.sleep(0.5)


def find_text_inputs(driver, minimum: int = 1, timeout: int = 20):
    return edit_texts(driver, minimum=minimum, timeout=timeout)


def edit_texts(driver, minimum: int, timeout: int = 20):
    from appium.webdriver.common.appiumby import AppiumBy

    return WebDriverWait(driver, timeout).until(
        lambda d: (
            fields
            if len(fields := d.find_elements(AppiumBy.CLASS_NAME, "android.widget.EditText")) >= minimum
            else False
        )
    )


def fill_edit_texts(driver, values: list[str]):
    fields = edit_texts(driver, len(values))
    for field, value in zip(fields, values):
        replace_field_text(field, value, driver=driver)
    hide_keyboard(driver)
    time.sleep(0.3)
    return fields


def fill_register_form(driver, email: str, password: str, confirm_password: str | None = None):
    fields = edit_texts(driver, 3)
    replace_field_text(fields[0], email, driver=driver, use_clipboard=True)

    fields = edit_texts(driver, 3)
    replace_field_text(fields[1], password, driver=driver, use_clipboard=True)
    hide_keyboard(driver)

    fields = edit_texts(driver, 3)
    replace_field_text(fields[2], confirm_password or password, driver=driver, use_clipboard=True)
    hide_keyboard(driver)
    time.sleep(0.3)
    return fields


def replace_field_text(
    field,
    value: str,
    driver=None,
    use_keyevents: bool = False,
    use_clipboard: bool = False,
):
    if driver is None:
        field.click()
    else:
        tap_element_center(driver, field)
    field.clear()
    time.sleep(0.2)

    if use_clipboard and driver is not None and paste_text(driver, value):
        time.sleep(0.2)
        return

    if use_keyevents:
        type_text_with_keyevents(driver, value)
    else:
        field.send_keys(value)
    time.sleep(0.2)


def paste_text(driver, value: str) -> bool:
    try:
        driver.set_clipboard_text(value)
        driver.press_keycode(279)
        time.sleep(0.4)
        return True
    except Exception:
        return False


def type_text_with_keyevents(driver, value: str):
    if driver is None:
        raise ValueError("driver is required when use_keyevents=True")

    keycodes = {
        **{str(number): 7 + number for number in range(10)},
        **{chr(ord("a") + offset): 29 + offset for offset in range(26)},
        ".": 56,
        "@": 77,
        "!": 8,
    }
    shift_chars = set("ABCDEFGHIJKLMNOPQRSTUVWXYZ!")
    meta_shift_on = 1

    for character in value:
        key = character.lower()
        if key not in keycodes:
            raise ValueError(f"Unsupported key event character: {character!r}")
        driver.press_keycode(
            keycodes[key],
            metastate=meta_shift_on if character in shift_chars else None,
        )
        time.sleep(0.05)


def hide_keyboard(driver):
    for _ in range(3):
        tap_keyboard_done(driver)

        try:
            if not driver.is_keyboard_shown():
                return
        except Exception:
            pass

        try:
            driver.hide_keyboard()
        except Exception:
            pass

        time.sleep(0.5)
        try:
            if not driver.is_keyboard_shown():
                return
        except Exception:
            pass


dismiss_keyboard = hide_keyboard


def tap_keyboard_done(driver):
    try:
        size = driver.get_window_size()
        driver.execute_script(
            "mobile: clickGesture",
            {"x": int(size["width"] - 80), "y": int(size["height"] - 220)},
        )
    except Exception:
        pass


def scroll_screen_up(driver):
    try:
        size = driver.get_window_size()
        driver.swipe(
            int(size["width"] * 0.5),
            int(size["height"] * 0.78),
            int(size["width"] * 0.5),
            int(size["height"] * 0.32),
            600,
        )
    except Exception:
        pass


def tap_terms_conditions_link(driver):
    label = wait_for_text(driver, "I agree to DengueEye", timeout=10)
    rect = label.rect
    driver.execute_script(
        "mobile: clickGesture",
        {
            "x": int(rect["x"] + rect["width"] * 0.68),
            "y": int(rect["y"] + rect["height"] * 0.25),
        },
    )
    time.sleep(0.5)


def scroll_to_text(driver, text: str):
    from appium.webdriver.common.appiumby import AppiumBy

    return driver.find_element(
        AppiumBy.ANDROID_UIAUTOMATOR,
        'new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView('
        f'new UiSelector().textContains("{uiautomator_string(text)}"));',
    )


def open_register_screen(driver):
    tap_text(driver, "Sign Up")
    wait_for_text(driver, "Create Account", timeout=20)
    return driver


def login_with_credentials(driver, email: str, password: str):
    fill_edit_texts(driver, [email, password])
    tap_text(driver, "Sign In")


def expanded_details_probe(details: str) -> str:
    compact_details = " ".join(details.split())
    if len(compact_details) <= 95:
        return compact_details[:35]
    return compact_details[85:125]


def open_action_tab(driver):
    dismiss_location_error_if_needed(driver)
    tap_text(driver, "Action")
    dismiss_location_error_if_needed(driver)
    wait_for_text(driver, "Get preventive recommendations", timeout=20)


def open_recommendations_for_risk(driver, label: str):
    open_action_tab(driver)
    risk = label.replace(" Risk", "").lower()

    for _ in range(2):
        dismiss_location_error_if_needed(driver)
        tap_screen_row_containing_text(driver, label)
        dismiss_location_error_if_needed(driver)
        if is_text_visible(driver, f"for {risk} risk", timeout=8):
            wait_for_text(driver, "Recommendations", timeout=10)
            return

    wait_for_text(driver, f"for {risk} risk", timeout=12)
    wait_for_text(driver, "Recommendations", timeout=10)


def api_get_json(path: str, expected_status: int = 200):
    """Small stdlib JSON client so the Appium suite does not need requests."""
    url = f"{API_URL}{path}"
    request = Request(url, headers={"Accept": "application/json"})
    try:
        with urlopen(request, timeout=10) as response:
            body = response.read().decode("utf-8")
            status = response.getcode()
    except HTTPError as exc:
        body = exc.read().decode("utf-8")
        status = exc.code
    except URLError as exc:
        pytest.skip(f"API service is not reachable at {API_URL}: {exc}")

    if status != expected_status:
        pytest.fail(f"GET {url} returned {status}, expected {expected_status}. Body: {body[:500]}")

    try:
        return json.loads(body)
    except json.JSONDecodeError:
        pytest.fail(f"GET {url} did not return valid JSON. Body: {body[:500]}")


@pytest.fixture(scope="session")
def recommendations_by_risk():
    return {
        risk: api_get_json(f"/recommendations/{risk}")
        for risk in ("high", "medium", "low")
    }


def clear_mobile_auth_storage():
    adb = find_adb()
    if not adb:
        return

    package = ANDROID_APP_PACKAGE
    try:
        subprocess.run(
            [adb, "shell", "am", "force-stop", package],
            check=False,
            capture_output=True,
            timeout=10,
        )
        db_bytes = subprocess.run(
            [adb, "exec-out", "run-as", package, "cat", "databases/RKStorage"],
            check=True,
            capture_output=True,
            timeout=15,
        ).stdout
    except Exception:
        return

    if not db_bytes.startswith(b"SQLite format 3"):
        return

    with NamedTemporaryFile(delete=False, suffix=".sqlite") as temp:
        temp.write(db_bytes)
        temp_path = Path(temp.name)

    try:
        with sqlite3.connect(temp_path) as connection:
            connection.execute(
                "delete from catalystLocalStorage where key in ('token', 'token_exp')"
            )
            connection.commit()

        with temp_path.open("rb") as updated_db:
            write_storage_command = (
                f"run-as {package} sh -c "
                "'cat > databases/RKStorage && rm -f databases/RKStorage-journal'"
            )
            subprocess.run(
                [adb, "shell", write_storage_command],
                input=updated_db.read(),
                check=True,
                capture_output=True,
                timeout=15,
            )
    except Exception:
        return
    finally:
        try:
            temp_path.unlink()
        except OSError:
            pass


def find_adb():
    configured = os.getenv("ADB_PATH")
    candidates = [
        configured,
        shutil.which("adb"),
    ]

    local_app_data = os.getenv("LOCALAPPDATA")
    if local_app_data:
        candidates.append(str(Path(local_app_data) / "Android" / "Sdk" / "platform-tools" / "adb.exe"))

    android_home = os.getenv("ANDROID_HOME") or os.getenv("ANDROID_SDK_ROOT")
    if android_home:
        candidates.append(str(Path(android_home) / "platform-tools" / "adb.exe"))

    for candidate in candidates:
        if candidate and Path(candidate).exists():
            return candidate
    return None


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()

    if report.when != "call" or not report.failed:
        return

    mobile_driver = (
        item.funcargs.get("login_screen")
        or item.funcargs.get("logged_in_driver")
        or item.funcargs.get("logged_in_mobile")
        or item.funcargs.get("appium_driver")
        or item.funcargs.get("driver")
    )
    if not mobile_driver:
        return

    screenshot_dir = THIS_DIR / "screenshots"
    screenshot_dir.mkdir(exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    screenshot_path = screenshot_dir / f"{item.name}_{timestamp}.png"

    try:
        mobile_driver.save_screenshot(str(screenshot_path))
    except Exception:
        return

    if item.config.pluginmanager.hasplugin("html"):
        from pytest_html import extras

        report.extras = getattr(report, "extras", [])
        report.extras.append(extras.image(str(screenshot_path)))
