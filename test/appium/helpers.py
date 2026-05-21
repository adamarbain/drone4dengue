"""Reusable helper functions for Drone4Dengue Appium tests."""

from __future__ import annotations

import shutil
import subprocess
import time
from pathlib import Path

from appium.webdriver.common.appiumby import AppiumBy
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


# ---------------------------------------------------------------------------
# Selector helpers
# ---------------------------------------------------------------------------

def uiautomator_string(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"')


def text_selector(text: str) -> str:
    return f'new UiSelector().text("{uiautomator_string(text)}")'


def text_contains_selector(text: str) -> str:
    return f'new UiSelector().textContains("{uiautomator_string(text)}")'


def desc_contains_selector(text: str) -> str:
    return f'new UiSelector().descriptionContains("{uiautomator_string(text)}")'


# ---------------------------------------------------------------------------
# Generic helpers
# ---------------------------------------------------------------------------

def wait_for_element(driver, locator, timeout: int = 20):
    return WebDriverWait(driver, timeout).until(EC.presence_of_element_located(locator))


def find_text_inputs(driver, minimum: int = 1, timeout: int = 20):
    return WebDriverWait(driver, timeout).until(
        lambda d: (
            fields
            if len(fields := d.find_elements(AppiumBy.CLASS_NAME, "android.widget.EditText")) >= minimum
            else False
        )
    )


def edit_texts(driver, minimum: int = 1, timeout: int = 20):
    return find_text_inputs(driver, minimum=minimum, timeout=timeout)


def tap_text(driver, text: str, timeout: int = 20):
    element = wait_for_tappable_label(driver, text, timeout)
    tap_element_center(driver, element)
    return element


def tap_last_text(driver, text: str, timeout: int = 20):
    WebDriverWait(driver, timeout).until(lambda d: len(find_tappable_labels(d, text)) > 0)
    elements = find_tappable_labels(driver, text)
    tap_element_center(driver, elements[-1])
    return elements[-1]


def wait_for_text(driver, text: str, timeout: int = 20):
    return wait_for_element(
        driver,
        (AppiumBy.ANDROID_UIAUTOMATOR, text_contains_selector(text)),
        timeout=timeout,
    )


def is_text_visible(driver, text: str, timeout: int = 4) -> bool:
    try:
        wait_for_text(driver, text, timeout=timeout)
        return True
    except TimeoutException:
        return False


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
    """Tap by coordinates so React Native Text inside touchables triggers parent press."""
    rect = element.rect
    x = int(rect["x"] + rect["width"] / 2)
    y = int(rect["y"] + rect["height"] / 2)

    try:
        driver.execute_script("mobile: clickGesture", {"x": x, "y": y})
    except Exception:
        element.click()


def set_text_input(driver, index: int, value: str):
    fields = find_text_inputs(driver, minimum=index + 1)
    field = fields[index]
    replace_field_text(field, value, driver=driver)
    hide_keyboard(driver)
    return field


def get_text_input_value(driver, index: int) -> str:
    fields = find_text_inputs(driver, minimum=index + 1)
    return fields[index].get_attribute("text") or ""


def replace_field_text(field, value: str, driver=None, use_clipboard: bool = False):
    if driver is None:
        field.click()
    else:
        tap_element_center(driver, field)

    field.clear()
    time.sleep(0.2)

    if value:
        if use_clipboard and driver is not None and paste_text(driver, value):
            pass
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


def tap_keyboard_done(driver):
    try:
        size = driver.get_window_size()
        driver.execute_script(
            "mobile: clickGesture",
            {"x": int(size["width"] - 80), "y": int(size["height"] - 220)},
        )
    except Exception:
        pass


dismiss_keyboard = hide_keyboard


def close_modal_if_present(driver):
    try:
        tap_text(driver, "OK", timeout=5)
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


# ---------------------------------------------------------------------------
# Network helpers
# ---------------------------------------------------------------------------

def disable_network():
    adb = find_adb() or "adb"
    subprocess.run([adb, "shell", "svc", "wifi", "disable"], check=False)
    subprocess.run([adb, "shell", "svc", "data", "disable"], check=False)


def enable_network():
    adb = find_adb() or "adb"
    subprocess.run([adb, "shell", "svc", "wifi", "enable"], check=False)
    subprocess.run([adb, "shell", "svc", "data", "enable"], check=False)


def find_adb():
    candidates = [shutil.which("adb")]

    import os

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
