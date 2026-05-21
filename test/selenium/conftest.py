"""Shared Selenium fixtures and helpers for the admin web test suites."""

from __future__ import annotations

import json
import os
import platform
import time
from datetime import datetime, timedelta
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import pytest
from dotenv import load_dotenv
from selenium import webdriver
from selenium.common.exceptions import (
    NoSuchElementException,
    TimeoutException,
    WebDriverException,
)
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


# Test configuration

THIS_DIR = Path(__file__).resolve().parent
REPO_ROOT = THIS_DIR.parent

# Load shared project config first, then allow this suite's .env to override it.
load_dotenv(REPO_ROOT / ".env", override=False)
load_dotenv(REPO_ROOT / "tests" / ".env", override=False)
load_dotenv(THIS_DIR / ".env", override=True)

DOWNLOAD_DIR = REPO_ROOT / "downloads"
DOWNLOAD_DIR.mkdir(exist_ok=True)

BASE_URL = (
    os.getenv("ADMIN_URL")
    or os.getenv("BASE_URL")
    or "http://localhost:3000"
).rstrip("/")
API_URL = (os.getenv("API_URL") or "http://localhost:4000").rstrip("/")
MOBILE_BASE_URL = (
    os.getenv("MOBILE_BASE_URL")
    or "http://localhost:8081"
).rstrip("/")

ADMIN_EMAIL = (
    os.getenv("ADMIN_EMAIL")
    or os.getenv("TEST_ADMIN_EMAIL")
    or "admin1@drone4dengue.com"
)
ADMIN_PASSWORD = (
    os.getenv("ADMIN_PASSWORD")
    or os.getenv("TEST_ADMIN_PASSWORD")
    or "adminpass1"
)

# Backward-compatible names used by the UC-12/UC-14 tests.
TEST_ADMIN_EMAIL = ADMIN_EMAIL
TEST_ADMIN_PASSWORD = ADMIN_PASSWORD

ASSETS_DIR = THIS_DIR / "assets"
TEST_IMAGE = str(ASSETS_DIR / "test_image.png")
TEST_PDF = str(ASSETS_DIR / "test_document.pdf")

DEFAULT_WAIT = int(os.getenv("SELENIUM_WAIT", "15"))
HEADLESS = os.getenv("HEADLESS", "true").lower() != "false"
USE_WEBDRIVER_MANAGER = (
    os.getenv("USE_WEBDRIVER_MANAGER", "true").lower() != "false"
)


def pytest_configure(config):
    """Register custom pytest markers used across the Selenium suites."""
    config.addinivalue_line("markers", "uc4: UC-4 Edit Profile tests")
    config.addinivalue_line("markers", "uc5: UC-5 Drone Management tests")
    config.addinivalue_line("markers", "uc6: UC-6 Media Upload tests")
    config.addinivalue_line("markers", "uc10: UC-10 Generate Report tests")
    config.addinivalue_line("markers", "uc12: UC-12 Manage Settings tests")
    config.addinivalue_line("markers", "uc14: UC-14 Get Recommendations tests")
    config.addinivalue_line("markers", "selenium: browser-based Selenium tests")
    config.addinivalue_line("markers", "appium: native mobile Appium tests")
    config.addinivalue_line("markers", "api: API-level tests")


# Generic wait and interaction helpers

def wait_for(driver, condition, timeout=DEFAULT_WAIT):
    return WebDriverWait(driver, timeout).until(condition)


def wait_for_url_contains(driver, fragment, timeout=DEFAULT_WAIT):
    return wait_for(driver, EC.url_contains(fragment), timeout)


def wait_for_element(driver, by, locator, timeout=DEFAULT_WAIT):
    return wait_for(driver, EC.presence_of_element_located((by, locator)), timeout)


def wait_for_clickable(driver, by, locator, timeout=DEFAULT_WAIT):
    return wait_for(driver, EC.element_to_be_clickable((by, locator)), timeout)


def wait_for_visible(driver, by, locator, timeout=DEFAULT_WAIT):
    return wait_for(driver, EC.visibility_of_element_located((by, locator)), timeout)


def wait_for_text(driver, by, locator, text, timeout=DEFAULT_WAIT):
    return wait_for(driver, EC.text_to_be_present_in_element((by, locator), text), timeout)


def accept_alert(driver, timeout=8):
    """Accept a browser alert or confirm dialog and return its message."""
    wait_for(driver, EC.alert_is_present(), timeout)
    alert = driver.switch_to.alert
    text = alert.text
    alert.accept()
    return text


def xpath_literal(value: str) -> str:
    """Create an XPath-safe text literal."""
    if "'" not in value:
        return f"'{value}'"
    if '"' not in value:
        return f'"{value}"'

    parts = value.split("'")
    return "concat(" + ', "\'", '.join(f"'{part}'" for part in parts) + ")"


def visible_text(driver, text: str, timeout: int = DEFAULT_WAIT):
    """Find a visible element containing text without matching huge containers."""
    text_literal = xpath_literal(text)
    text_like_elements = (
        "self::a or self::button or self::div or self::h1 or self::h2 or "
        "self::h3 or self::label or self::p or self::span"
    )
    xpath = (
        f"//*[({text_like_elements}) "
        f"and contains(normalize-space(.), {text_literal}) "
        "and string-length(normalize-space(.)) < 1000]"
    )
    return wait_for(driver, EC.visibility_of_element_located((By.XPATH, xpath)), timeout)


def click_visible_text(driver, text: str, timeout: int = DEFAULT_WAIT):
    """Click a visible element found by text."""
    element = visible_text(driver, text, timeout=timeout)
    scroll_into_view(driver, element)

    try:
        element.click()
    except WebDriverException:
        driver.execute_script("arguments[0].click();", element)

    return element


def scroll_into_view(driver, element):
    """Scroll an element into the center of the viewport."""
    driver.execute_script(
        "arguments[0].scrollIntoView({block: 'center'});",
        element,
    )
    time.sleep(0.2)
    return element


def dismiss_any_dialog(driver, timeout=6):
    """
    Dismiss either a browser alert or a common on-page success dialog.

    Returns the alert text if a browser alert was found, otherwise None.
    """
    try:
        return accept_alert(driver, timeout=timeout)
    except Exception:
        pass

    for xpath in (
        "//button[contains(.,'Great!')]",
        "//button[contains(.,'OK') or contains(.,'Close') or "
        "contains(.,'Got it') or contains(.,'Dismiss')]",
    ):
        try:
            wait_for_clickable(driver, By.XPATH, xpath, timeout=timeout).click()
            time.sleep(0.3)
            return None
        except Exception:
            pass

    return None


def dismiss_confirm_and_success_dialog(driver, timeout=8, confirm_text="Confirm"):
    """
    Dismiss a React confirm dialog, then the success dialog that follows it.

    Image deletions may pass confirm_text="Delete"; drone deletions usually use
    the default "Confirm".
    """
    try:
        wait_for_clickable(
            driver,
            By.XPATH,
            f"//button[contains(.,'{confirm_text}')]",
            timeout=4,
        ).click()
        time.sleep(0.8)
    except Exception:
        pass

    try:
        wait_for_clickable(
            driver,
            By.XPATH,
            "//button[contains(.,'Great!')]",
            timeout=timeout,
        ).click()
        time.sleep(0.5)
    except Exception:
        pass


# Browser and login fixtures

@pytest.fixture(scope="session")
def driver():
    """Create one Chrome instance for the Selenium suite."""
    chrome_options = Options()

    if HEADLESS:
        chrome_options.add_argument("--headless=new")

    prefs = {
        "download.default_directory": str(DOWNLOAD_DIR),
        "download.prompt_for_download": False,
    }
    chrome_options.add_experimental_option("prefs", prefs)

    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--disable-notifications")
    chrome_options.add_argument("--disable-web-security")
    chrome_options.add_argument("--allow-running-insecure-content")
    chrome_options.add_argument("--window-size=1920,1080")

    if platform.system() == "Linux":
        chrome_options.binary_location = "/usr/bin/google-chrome"

    service = Service()
    if USE_WEBDRIVER_MANAGER:
        try:
            from webdriver_manager.chrome import ChromeDriverManager

            service = Service(ChromeDriverManager().install())
        except Exception:
            # Selenium Manager or a chromedriver on PATH can still start Chrome.
            service = Service()

    try:
        browser = webdriver.Chrome(service=service, options=chrome_options)
    except WebDriverException as exc:
        pytest.fail(f"Could not start Chrome WebDriver: {exc}")

    browser.implicitly_wait(5)
    yield browser
    browser.quit()


def do_login(driver, email=ADMIN_EMAIL, password=ADMIN_PASSWORD):
    """Navigate to the admin app and submit credentials if not already logged in."""
    if not email or not password:
        pytest.fail("Admin credentials are missing. Set ADMIN_EMAIL/ADMIN_PASSWORD in .env.")

    driver.set_window_size(1366, 900)
    driver.get(BASE_URL)
    wait = WebDriverWait(driver, DEFAULT_WAIT)

    try:
        email_field = wait.until(EC.element_to_be_clickable((By.ID, "email")))
    except TimeoutException:
        if "/dashboard" in driver.current_url:
            return driver

        try:
            driver.find_element(By.ID, "password")
        except NoSuchElementException:
            return driver
        raise

    email_field.clear()
    email_field.send_keys(email)

    password_field = wait_for_clickable(driver, By.ID, "password")
    password_field.clear()
    password_field.send_keys(password)

    try:
        login_button = wait_for_clickable(driver, By.CSS_SELECTOR, "button[type='submit']")
    except TimeoutException:
        login_button = wait_for_clickable(
            driver,
            By.XPATH,
            "//button[contains(text(),'LOGIN') or contains(text(),'LOGGING IN')]",
        )
    login_button.click()

    wait_for_url_contains(driver, "/dashboard", timeout=DEFAULT_WAIT)
    time.sleep(1)
    return driver


@pytest.fixture(scope="session", autouse=True)
def logged_in(driver):
    """Keep the shared Selenium browser authenticated for tests that use driver."""
    return do_login(driver)


@pytest.fixture(scope="session")
def admin_driver(driver):
    """Explicit authenticated admin browser fixture."""
    return do_login(driver)


@pytest.fixture()
def settings_page(admin_driver):
    """Open UC-12 Settings and wait until its heading is visible."""
    admin_driver.get(f"{BASE_URL}/settings")
    wait_for(
        admin_driver,
        EC.presence_of_element_located((By.XPATH, "//h1[contains(., 'Settings')]")),
        timeout=20,
    )
    return admin_driver


@pytest.fixture()
def report_generation_page(admin_driver):
    """Open Report Generation and wait until the form is loaded."""
    admin_driver.get(f"{BASE_URL}/reports")
    wait_for(
        admin_driver,
        EC.presence_of_element_located(
            (By.XPATH, "//h1[contains(text(), 'Report Generation')]")
        ),
        timeout=20,
    )
    return admin_driver


def go_to_drone_management(driver):
    """Navigate to the Drone Management page."""
    driver.get(f"{BASE_URL}/drone-management")
    wait_for(
        driver,
        EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'Drone Management')]")
        ),
        timeout=20,
    )
    time.sleep(2)


@pytest.fixture()
def drone_page(admin_driver):
    """Navigate to Drone Management before each test that needs it."""
    go_to_drone_management(admin_driver)
    return admin_driver


@pytest.fixture(scope="session")
def mobile_driver(driver):
    """Open the mobile app through Expo Web with a local web auth token."""
    driver.set_window_size(390, 844)
    driver.get(MOBILE_BASE_URL)
    wait_for(driver, lambda d: d.execute_script("return document.readyState") == "complete", timeout=20)

    token_exp = int((datetime.now() + timedelta(days=7)).timestamp() * 1000)
    driver.execute_script(
        """
        window.localStorage.setItem('token', 'fake_token_for_uc14_web_tests');
        window.localStorage.setItem('token_exp', arguments[0]);
        """,
        str(token_exp),
    )

    driver.get(f"{MOBILE_BASE_URL}/action")
    return driver


# API helpers used by UC-14 web tests

def api_get_json(path: str, expected_status: int = 200):
    """Small stdlib JSON client so the suite does not need requests."""
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
        pytest.fail(
            f"GET {url} returned {status}, expected {expected_status}. Body: {body[:500]}"
        )

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


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """Take a screenshot on test failure and attach it to pytest-html reports."""
    outcome = yield
    report = outcome.get_result()

    if report.when != "call" or not report.failed:
        return

    browser = (
        item.funcargs.get("settings_page")
        or item.funcargs.get("report_generation_page")
        or item.funcargs.get("drone_page")
        or item.funcargs.get("admin_driver")
        or item.funcargs.get("mobile_driver")
        or item.funcargs.get("logged_in_mobile")
        or item.funcargs.get("appium_driver")
        or item.funcargs.get("driver")
    )

    if not browser:
        return

    screenshot_dir = THIS_DIR / "screenshots"
    screenshot_dir.mkdir(exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = screenshot_dir / f"{item.name}_{timestamp}.png"
    browser.save_screenshot(str(path))

    if item.config.pluginmanager.hasplugin("html"):
        from pytest_html import extras

        report.extras = getattr(report, "extras", [])
        report.extras.append(extras.image(str(path)))
