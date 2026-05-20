
import os
import time
import platform
from datetime import datetime
from pathlib import Path
import pytest
from dotenv import load_dotenv
from selenium import webdriver
from selenium.common.exceptions import WebDriverException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# ─── Test Configuration ───────────────────────────────────────────────────────

THIS_DIR = Path(__file__).resolve().parent
REPO_ROOT = THIS_DIR.parent

load_dotenv(REPO_ROOT / ".env", override=False)
load_dotenv(THIS_DIR / ".env", override=True)

DOWNLOAD_DIR = REPO_ROOT / "downloads"
DOWNLOAD_DIR.mkdir(exist_ok=True)

BASE_URL   = os.getenv("ADMIN_URL",  "http://localhost:3000")
API_URL    = os.getenv("API_URL",    "http://localhost:4000")

# Update these credentials to match your seeded admin account
ADMIN_EMAIL    = os.getenv("ADMIN_EMAIL",    "")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")

# Paths to test assets
ASSETS_DIR  = os.path.join(os.path.dirname(__file__), "assets")
TEST_IMAGE  = os.path.join(ASSETS_DIR, "test_image.png")
TEST_PDF    = os.path.join(ASSETS_DIR, "test_document.pdf")

DEFAULT_WAIT = 15  # seconds

# ─── Helpers ─────────────────────────────────────────────────────────────────

def wait_for(driver, condition, timeout=DEFAULT_WAIT):
    return WebDriverWait(driver, timeout).until(condition)


def wait_for_url_contains(driver, fragment, timeout=DEFAULT_WAIT):
    WebDriverWait(driver, timeout).until(EC.url_contains(fragment))


def wait_for_element(driver, by, locator, timeout=DEFAULT_WAIT):
    return wait_for(driver, EC.presence_of_element_located((by, locator)), timeout)


def wait_for_clickable(driver, by, locator, timeout=DEFAULT_WAIT):
    return wait_for(driver, EC.element_to_be_clickable((by, locator)), timeout)


def wait_for_visible(driver, by, locator, timeout=DEFAULT_WAIT):
    return wait_for(driver, EC.visibility_of_element_located((by, locator)), timeout)


def wait_for_text(driver, by, locator, text, timeout=DEFAULT_WAIT):
    return wait_for(driver, EC.text_to_be_present_in_element((by, locator), text), timeout)


def accept_alert(driver, timeout=8):
    """
    Wait for a browser alert() / confirm() dialog, read its text, accept it,
    and return the message.  Raises TimeoutException if no alert appears.

    Use this after any action that calls window.alert() in the app, e.g.:
      alert('Drone created successfully!')
      alert('Drone updated successfully!')
      alert('Failed to create drone: ...')
      alert('Please upload an image or video file')
    """
    WebDriverWait(driver, timeout).until(EC.alert_is_present())
    alert = driver.switch_to.alert
    text = alert.text
    alert.accept()
    return text

def pytest_configure(config):
    """Register custom pytest markers."""
    config.addinivalue_line("markers", "uc10: UC-10 Generate Report tests")
    config.addinivalue_line("markers", "uc4: UC-4 Edit Profile tests")
    config.addinivalue_line("markers", "uc5: UC-5 Drone Management tests")
    config.addinivalue_line("markers", "uc6: UC-6 Media Upload tests")
    config.addinivalue_line("markers", "selenium: browser-based Selenium tests")
    config.addinivalue_line("markers", "appium: mobile app Appium tests")

def xpath_literal(value: str) -> str:
    """Create XPath-safe text literal."""
    if "'" not in value:
        return f"'{value}'"

    if '"' not in value:
        return f'"{value}"'

    parts = value.split("'")
    return "concat(" + ', "\'", '.join(f"'{part}'" for part in parts) + ")"


def visible_text(driver, text: str, timeout: int = DEFAULT_WAIT):
    """Find visible element containing text."""
    text_literal = xpath_literal(text)

    xpath = (
        f"//*[contains(normalize-space(.), {text_literal})]"
    )

    return WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((By.XPATH, xpath))
    )


def click_visible_text(driver, text: str, timeout: int = DEFAULT_WAIT):
    """Click visible text element."""
    element = visible_text(driver, text, timeout)

    driver.execute_script(
        "arguments[0].scrollIntoView({block: 'center'});",
        element
    )

    time.sleep(0.2)

    try:
        element.click()
    except WebDriverException:
        driver.execute_script("arguments[0].click();", element)

    return element


def scroll_into_view(driver, element):
    """Scroll element into view."""
    driver.execute_script(
        "arguments[0].scrollIntoView({block: 'center'});",
        element
    )

    time.sleep(0.2)

    return element

def dismiss_any_dialog(driver, timeout=6):
    """
    Attempt to dismiss *either* a browser alert() *or* an on-page success /
    confirm dialog (the custom React ConfirmDialog / success toast).

    Always call this after CRUD operations so the UI is clean for the next step.
    Handles the full dialog sequence:
      1. Browser alert() - accept it
      2. React ConfirmDialog (Confirm/Cancel buttons) - click the dismiss button
      3. React Success dialog (Great! / Close / Got it / OK button) - click it

    Returns the alert text if a browser alert was found, else None.
    """
    # 1. Try browser alert first (highest priority)
    try:
        WebDriverWait(driver, timeout).until(EC.alert_is_present())
        alert = driver.switch_to.alert
        text = alert.text
        alert.accept()
        return text
    except Exception:
        pass

    # 2. Try on-page dialog buttons (Success "Great!" button or Confirm "Cancel" button)
    # This handles the case where a success dialog appears after confirmation
    try:
        # Try to find "Great!" button (success dialog)
        great_btn = WebDriverWait(driver, timeout).until(
            EC.element_to_be_clickable((By.XPATH,
                "//button[contains(.,'Great!')]"))
        )
        great_btn.click()
        time.sleep(0.3)
        return None
    except Exception:
        pass

    # 3. Try on-page OK / Close / Got it / Dismiss button
    try:
        ok_btn = WebDriverWait(driver, timeout).until(
            EC.element_to_be_clickable((By.XPATH,
                "//button[contains(.,'OK') or contains(.,'Close') or "
                "contains(.,'Got it') or contains(.,'Dismiss')]"))
        )
        ok_btn.click()
    except Exception:
        pass

    return None


def dismiss_confirm_and_success_dialog(driver, timeout=8,
                                       confirm_text="Confirm"):
    """
    Two-step dismiss for delete operations that show BOTH:
      1. React ConfirmDialog   → click confirm_text (default "Confirm")
      2. React SuccessDialog   → click Great!

    The admin web app uses custom React modals (not native browser
    alert/confirm) for the delete confirmation and success toast.

    For *image* deletions, confirm_text is "Delete" because the modal
    uses confirmText='Delete' (see page.tsx).  For drone deletions it
    is "Confirm" (confirmText='Confirm').
    """
    # Step 1: React ConfirmDialog – click the confirm button
    try:
        confirm_btn = WebDriverWait(driver, 4).until(
            EC.element_to_be_clickable((By.XPATH,
                f"//button[contains(.,'{confirm_text}')]"))
        )
        confirm_btn.click()
        time.sleep(0.8)          # wait for the async DELETE + re-render
    except Exception:
        pass

    # Step 2: React SuccessDialog – click the "Great!" button
    try:
        great_btn = WebDriverWait(driver, timeout).until(
            EC.element_to_be_clickable((By.XPATH,
                "//button[contains(.,'Great!')]"))
        )
        great_btn.click()
        time.sleep(0.5)
    except Exception:
        pass


# ─── Browser Fixture ─────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def driver():
    """
    Session-scoped Chrome WebDriver.
    Use --headed to see the browser (default: headless).
    """
    chrome_options = Options()

    headless = os.getenv("HEADLESS", "true").lower() != "false"
    if headless:
        chrome_options.add_argument("--headless=new")

    prefs = {
        "download.default_directory": str(DOWNLOAD_DIR),
        "download.prompt_for_download": False,
    }

    chrome_options.add_experimental_option("prefs", prefs)

    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--disable-web-security")
    chrome_options.add_argument("--allow-running-insecure-content")

    # # webdriver-manager keeps the driver binary up-to-date automatically
    # try:
    #     from webdriver_manager.chrome import ChromeDriverManager
    #     service = Service(ChromeDriverManager().install())
    # except Exception:
    #     service = Service()  # fall back to PATH chromedriver

    # chrome_options.binary_location = "/usr/bin/google-chrome"
    # _driver = webdriver.Chrome(service=service, options=chrome_options)
    # _driver.implicitly_wait(5)
    # yield _driver

    # IMPORTANT
    if platform.system() == "Linux":
        chrome_options.binary_location = "/usr/bin/google-chrome"

    try:
        from webdriver_manager.chrome import ChromeDriverManager
        service = Service(ChromeDriverManager().install())
    except Exception:
        service = Service()

    try:
        _driver = webdriver.Chrome(
            service=service,
            options=chrome_options
        )
    except WebDriverException as exc:
        pytest.fail(f"Could not start Chrome WebDriver: {exc}")

    _driver.implicitly_wait(5)

    yield _driver
    _driver.quit()


# ─── Login Helper ─────────────────────────────────────────────────────────────

def do_login(driver, email=ADMIN_EMAIL, password=ADMIN_PASSWORD):
    """Navigate to login page and submit credentials."""
    driver.get(BASE_URL)
    time.sleep(1)

    # Wait for the email field to appear
    email_field = wait_for_clickable(driver, By.ID, "email")
    email_field.clear()
    email_field.send_keys(email)

    pw_field = wait_for_clickable(driver, By.ID, "password")
    pw_field.clear()
    pw_field.send_keys(password)

    # Click the LOGIN button
    login_btn = wait_for_clickable(
        driver, By.XPATH,
        "//button[contains(text(),'LOGIN') or contains(text(),'LOGGING IN')]"
    )
    login_btn.click()

    # Wait until redirected away from login page
    wait_for(driver, EC.url_contains("/dashboard"))
    time.sleep(1)


@pytest.fixture(scope="session", autouse=True)
def logged_in(driver):
    """Ensure the admin is logged in before any test runs."""
    do_login(driver)

@pytest.fixture()
def report_generation_page(driver):
    """Open Report Generation page and wait until the form is loaded."""
    driver.get(f"{BASE_URL}/reports")
    wait = WebDriverWait(driver, 20)
    wait.until(EC.presence_of_element_located(
        (By.XPATH, "//h1[contains(text(), 'Report Generation')]")
    ))
    return driver


# ─── Drone Management Page Navigation ────────────────────────────────────────

def go_to_drone_management(driver):
    """Navigate to the Drone Management page via sidebar."""
    driver.get(f"{BASE_URL}/drone-management")
    wait_for(
        driver,
        EC.presence_of_element_located((By.XPATH, "//*[contains(text(),'Drone Management')]")),
        timeout=20
    )
    time.sleep(2)  # let React finish rendering


@pytest.fixture
def drone_page(driver):
    """Navigate to Drone Management before each test that needs it."""
    go_to_drone_management(driver)
    return driver

@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """Take screenshot on test failure."""
    outcome = yield
    report = outcome.get_result()

    if report.when != "call" or not report.failed:
        return

    browser = (
        item.funcargs.get("drone_page")
        or item.funcargs.get("driver")
    )

    if not browser:
        return

    screenshot_dir = THIS_DIR / "screenshots"
    screenshot_dir.mkdir(exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    path = screenshot_dir / f"{item.name}_{timestamp}.png"

    browser.save_screenshot(str(path))

    # Attach screenshot to pytest-html report
    if item.config.pluginmanager.hasplugin("html"):
        from pytest_html import extras

        report.extras = getattr(report, "extras", [])
        report.extras.append(extras.image(str(path)))
