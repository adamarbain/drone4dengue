from __future__ import annotations

import pytest
from appium.webdriver.common.appiumby import AppiumBy
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from helpers import (
    tap_text,
    set_text_input,
    wait_for_element,
    close_modal_if_present,
    disable_network,
    enable_network
)


def tap_save_changes(driver):
    element = driver.find_element(
        AppiumBy.ANDROID_UIAUTOMATOR,
        'new UiScrollable(new UiSelector().scrollable(true))'
        '.scrollIntoView(new UiSelector().textContains("Save"))'
    )

    WebDriverWait(driver, 10).until(lambda d: element.is_displayed())
    element.click()

def save_changes_and_confirm(driver):
    tap_save_changes(driver)
    wait_for_element(driver, (AppiumBy.ANDROID_UIAUTOMATOR, 'new UiSelector().text("Confirm")'))
    tap_text(driver, "Confirm")


def wait_for_modal_message(driver, message_text, timeout=20):
    return WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located(
            (AppiumBy.ANDROID_UIAUTOMATOR, f'new UiSelector().textContains("{message_text}")')
        )
    )

# def handle_initial_screens(driver):
#     # Select development server
#     try:
#         tap_text(driver, "Development servers", timeout=10)
#     except:
#         pass

#     # Accept license agreement
#     try:
#         tap_text(driver, "I Understand & Accept", timeout=15)
#     except:
#         pass

#     # Close developer popup
#     try:
#         driver.find_element(AppiumBy.ACCESSIBILITY_ID, "Close")        
#         tap_text(driver, "Close", timeout=10)
#     except:
#         pass


def open_edit_profile(driver):
    tap_text(driver, "Profile")
    wait_for_element(driver, (AppiumBy.ANDROID_UIAUTOMATOR, 'new UiSelector().text("My Account")'), timeout=20)
    tap_text(driver, "My Account")
    wait_for_element(driver, (AppiumBy.ANDROID_UIAUTOMATOR, 'new UiSelector().text("Edit Profile")'), timeout=20)


def fill_edit_profile_form(driver, name: str, username: str, phone: str | None = None, address: str | None = None):
    set_text_input(driver, 0, name)
    set_text_input(driver, 1, username)
    set_text_input(driver, 2, phone or "")
    set_text_input(driver, 3, address or "")


@pytest.mark.uc4
@pytest.mark.appium
class TestUC4EditProfileMobile:
    def test_tc_04_001_edit_profile_success_mobile(self, logged_in_driver):
        print("🔥 RUNNING FILE:", __file__)
        driver = logged_in_driver
        close_modal_if_present(driver)
        open_edit_profile(driver)

        fill_edit_profile_form(
            driver,
            name="Ahmad Test",
            username="ahmadtest",
            phone="0123456789",
            address="Test address"
        )

        save_changes_and_confirm(driver)

        wait_for_modal_message(driver, "Profile updated successfully!")
        tap_text(driver, "OK")

    def test_tc_04_001_edit_profile_mobile_empty_phone_address(self, logged_in_driver):
        driver = logged_in_driver
        close_modal_if_present(driver)
        open_edit_profile(driver)

        fill_edit_profile_form(
            driver,
            name="Ahmad Test",
            username="ahmadtest",
            phone="",
            address=""
        )

        save_changes_and_confirm(driver)

        wait_for_modal_message(driver, "Profile updated successfully!")
        tap_text(driver, "OK")

    def test_tc_04_003_edit_profile_validation_empty_name(self, logged_in_driver):
        driver = logged_in_driver
        close_modal_if_present(driver)
        open_edit_profile(driver)

        fill_edit_profile_form(
            driver,
            name="",
            username="ahmadtest",
            phone="0123456789",
            address="Test address"
        )

        tap_save_changes(driver)
        wait_for_modal_message(driver, "Full name is required")
        tap_text(driver, "OK")

    def test_tc_04_004_edit_profile_validation_empty_username(self, logged_in_driver):
        driver = logged_in_driver
        close_modal_if_present(driver)
        open_edit_profile(driver)

        fill_edit_profile_form(
            driver,
            name="Ahmad Test",
            username="",
            phone="0123456789",
            address="Test address"
        )

        tap_save_changes(driver)
        wait_for_modal_message(driver, "Username is required")
        tap_text(driver, "OK")

    def test_tc_04_005_edit_profile_validation_phone_format(self, logged_in_driver):
        driver = logged_in_driver
        close_modal_if_present(driver)
        open_edit_profile(driver)

        fill_edit_profile_form(
            driver,
            name="Ahmad Test",
            username="ahmadtest",
            phone="abc",
            address="Test address"
        )

        save_changes_and_confirm(driver)
        wait_for_modal_message(driver, "Error")
        tap_text(driver, "OK")

    def test_tc_04_006_edit_profile_no_network_before_save(self, logged_in_driver):
        print("🔥 RUNNING FILE:", __file__)
        driver = logged_in_driver

        close_modal_if_present(driver)
        open_edit_profile(driver)

        fill_edit_profile_form(
            driver,
            name="Ahmad Test",
            username="ahmadtest",
            phone="0123456789",
            address="Test address"
        )

        # ❌ Disable network BEFORE saving
        disable_network()

        try:
            save_changes_and_confirm(driver)

            # Expect failure (adjust based on your app behavior)
            wait_for_modal_message(driver, "Error")

            tap_text(driver, "OK")

        finally:
            # ALWAYS restore network
            enable_network()
