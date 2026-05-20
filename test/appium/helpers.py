"""Reusable helper functions for Drone4Dengue Appium tests."""

from __future__ import annotations

import subprocess

from appium.webdriver.common.appiumby import AppiumBy

from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


# ─────────────────────────────────────────────────────────────
# Generic Helpers
# ─────────────────────────────────────────────────────────────

def wait_for_element(driver, locator, timeout=20):
    return WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located(locator)
    )


def find_text_inputs(driver, timeout=20):
    return WebDriverWait(driver, timeout).until(
        lambda d: d.find_elements(
            AppiumBy.CLASS_NAME,
            "android.widget.EditText"
        )
    )


def hide_keyboard(driver):
    try:
        driver.hide_keyboard()
    except Exception:
        pass


def tap_text(driver, text, timeout=20):
    locator = (
        AppiumBy.ANDROID_UIAUTOMATOR,
        f'new UiSelector().text("{text}")'
    )

    element = wait_for_element(driver, locator, timeout)

    element.click()

    return element


def set_text_input(driver, index, value):
    fields = find_text_inputs(driver)

    field = fields[index]

    field.click()
    field.clear()

    if value:
        field.send_keys(value)

    hide_keyboard(driver)

    return field


def get_text_input_value(driver, index):
    fields = find_text_inputs(driver)

    return fields[index].get_attribute("text") or ""


def close_modal_if_present(driver):
    try:
        tap_text(driver, "OK", timeout=5)
    except Exception:
        pass


# ─────────────────────────────────────────────────────────────
# Network Helpers
# ─────────────────────────────────────────────────────────────

def disable_network():
    subprocess.run(
        ["adb", "shell", "svc", "wifi", "disable"],
        check=False
    )

    subprocess.run(
        ["adb", "shell", "svc", "data", "disable"],
        check=False
    )


def enable_network():
    subprocess.run(
        ["adb", "shell", "svc", "wifi", "enable"],
        check=False
    )

    subprocess.run(
        ["adb", "shell", "svc", "data", "enable"],
        check=False
    )