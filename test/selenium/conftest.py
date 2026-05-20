"""
conftest.py — Shared fixtures for UC5/UC6 Selenium tests
=========================================================
Project  : Drone4Dengue – Admin Web System
Doc ref  : TDS-UC5-UC6 / TP-UC5-UC6
Platform : Admin Web (http://localhost:3000)
Runner   : pytest
"""

import os
import time
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# ─── Test Configuration ───────────────────────────────────────────────────────

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
    chrome_options.binary_location = "/usr/bin/google-chrome"

    try:
        from webdriver_manager.chrome import ChromeDriverManager
        service = Service(ChromeDriverManager().install())
    except Exception:
        service = Service()

    _driver = webdriver.Chrome(
        service=service,
        options=chrome_options
    )

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
