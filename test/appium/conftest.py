"""Shared fixtures for Drone4Dengue Appium tests."""

from __future__ import annotations

import os
from pathlib import Path
from datetime import datetime

import pytest
from dotenv import load_dotenv

from appium import webdriver
from appium.options.android import UiAutomator2Options
from appium.webdriver.common.appiumby import AppiumBy

from helpers import (
    wait_for_element,
    find_text_inputs,
    hide_keyboard,
    tap_text
)


# ─────────────────────────────────────────────────────────────
# Environment Configuration
# ─────────────────────────────────────────────────────────────

THIS_DIR = Path(__file__).resolve().parent
REPO_ROOT = THIS_DIR.parent

load_dotenv(REPO_ROOT / ".env", override=False)
load_dotenv(THIS_DIR / ".env", override=True)

APP_PACKAGE = os.getenv(
    "APP_PACKAGE",
    "com.adamarbain.dengueeyemobileapp"
)

APP_ACTIVITY = os.getenv(
    "APP_ACTIVITY",
    "com.adamarbain.dengueeyemobileapp.MainActivity"
)

APPIUM_SERVER = os.getenv(
    "APPIUM_SERVER",
    "http://127.0.0.1:4723"
)

DEVICE_NAME = os.getenv(
    "ANDROID_DEVICE_NAME",
    "Android Emulator"
)

PLATFORM_VERSION = os.getenv(
    "ANDROID_PLATFORM_VERSION",
    "11.0"
)

TEST_EMAIL = os.getenv(
    "MOBILE_TEST_EMAIL",
    "test1@gmail.com"
)

TEST_PASSWORD = os.getenv(
    "MOBILE_TEST_PASSWORD",
    "Abcd_1234"
)


# ─────────────────────────────────────────────────────────────
# Pytest Markers
# ─────────────────────────────────────────────────────────────

def pytest_configure(config):
    config.addinivalue_line(
        "markers",
        "appium: mobile app Appium tests"
    )

    config.addinivalue_line(
        "markers",
        "uc4: UC-4 Edit Profile tests"
    )


# ─────────────────────────────────────────────────────────────
# Driver Fixture
# ─────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def driver():
    options = UiAutomator2Options()

    options.platform_name = "Android"
    options.device_name = DEVICE_NAME
    # options.platform_version = PLATFORM_VERSION
    options.automation_name = "UiAutomator2"

    options.app_package = APP_PACKAGE
    options.app_activity = APP_ACTIVITY

    options.auto_grant_permissions = True
    options.no_reset = True
    options.full_reset = False
    options.new_command_timeout = 120

    try:
        mobile_driver = webdriver.Remote(
            APPIUM_SERVER,
            options=options
        )

    except Exception as exc:
        pytest.skip(
            f"Cannot connect to Appium server: {exc}"
        )

    yield mobile_driver

    mobile_driver.quit()


# ─────────────────────────────────────────────────────────────
# Login Fixture
# ─────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def logged_in_driver(driver):

    wait_for_element(
        driver,
        (
            AppiumBy.ANDROID_UIAUTOMATOR,
            'new UiSelector().text("Sign In")'
        ),
        timeout=30
    )

    fields = find_text_inputs(driver)

    if len(fields) < 2:
        pytest.skip(
            "Login screen does not expose expected fields"
        )

    fields[0].click()
    fields[0].clear()
    fields[0].send_keys(TEST_EMAIL)

    hide_keyboard(driver)

    fields[1].click()
    fields[1].clear()
    fields[1].send_keys(TEST_PASSWORD)

    hide_keyboard(driver)

    tap_text(driver, "Sign In")

    wait_for_element(
        driver,
        (
            AppiumBy.ANDROID_UIAUTOMATOR,
            'new UiSelector().text("Profile")'
        ),
        timeout=40
    )

    return driver

@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()

    # only take screenshot when actual test fails
    if report.when != "call" or not report.failed:
        return

    driver = item.funcargs.get("logged_in_driver") \
        or item.funcargs.get("driver")

    if not driver:
        return

    screenshot_dir = THIS_DIR / "screenshots"
    screenshot_dir.mkdir(exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    screenshot_path = screenshot_dir / (
        f"{item.name}_{timestamp}.png"
    )

    driver.save_screenshot(str(screenshot_path))

    # attach screenshot to pytest-html report
    if item.config.pluginmanager.hasplugin("html"):
        from pytest_html import extras

        report.extras = getattr(report, "extras", [])

        report.extras.append(
            extras.image(str(screenshot_path))
        )