"""UC-12 Manage Settings tests for the admin web application."""

import time

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait

from conftest import scroll_into_view, visible_text


@pytest.mark.uc12
@pytest.mark.selenium
class TestUC12ManageSettings:
    def test_tc12_01_settings_sections_are_available(self, settings_page):
        """SRS UC-12: admin accesses Settings and sees profile/security/preferences/config areas."""
        for heading in (
            "Profile Settings",
            "Password Settings",
            "Notification Preferences",
            "System Configuration",
            "Operational Areas",
            "Broadcast Notification",
        ):
            element = visible_text(settings_page, heading)
            scroll_into_view(settings_page, element)
            assert element.is_displayed(), f"{heading} should be visible"

    def test_tc12_02_profile_edit_cancel_discards_changes(self, settings_page):
        """UC-12 alternate flow: cancel edit discards the changed profile value."""
        wait = WebDriverWait(settings_page, 10)
        edit_button = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Edit Profile')]")))
        edit_button.click()

        name_input = wait.until(EC.element_to_be_clickable((By.ID, "name")))
        original_name = name_input.get_attribute("value")
        name_input.send_keys(Keys.CONTROL, "a")
        name_input.send_keys("TEMP_UC12_NAME")

        cancel_button = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Cancel')]")))
        cancel_button.click()
        time.sleep(0.3)

        assert settings_page.find_element(By.ID, "name").get_attribute("value") == original_name

    def test_tc12_03_profile_fields_have_expected_edit_permissions(self, settings_page):
        """UC-12 security rule: editable profile fields stay locked until edit mode, while email/company stay read-only."""
        wait = WebDriverWait(settings_page, 10)
        wait.until(EC.presence_of_element_located((By.ID, "name")))

        for field_id in ("name", "username", "phone", "email", "company"):
            assert settings_page.find_element(By.ID, field_id).get_attribute("disabled")

        wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Edit Profile')]"))).click()

        for field_id in ("name", "username", "phone"):
            assert not settings_page.find_element(By.ID, field_id).get_attribute("disabled")
        for field_id in ("email", "company"):
            assert settings_page.find_element(By.ID, field_id).get_attribute("disabled")

        wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Cancel')]"))).click()

    def test_tc12_04_profile_validation_blocks_empty_required_fields(self, settings_page):
        """UC-12 validation: invalid profile entries should show field-level errors."""
        wait = WebDriverWait(settings_page, 10)
        wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Edit Profile')]"))).click()

        for field_id in ("name", "username", "phone"):
            field = wait.until(EC.element_to_be_clickable((By.ID, field_id)))
            field.send_keys(Keys.CONTROL, "a")
            field.send_keys(Keys.DELETE)

        wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Save Changes')]"))).click()

        errors = wait.until(
            EC.presence_of_all_elements_located((By.XPATH, "//*[contains(@class, 'text-red') and contains(., 'Please fill out this field')]"))
        )
        assert len(errors) >= 3

        wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Cancel')]"))).click()

    def test_tc12_05_profile_validation_rejects_invalid_phone_format(self, settings_page):
        """UC-12 validation: profile save rejects invalid phone numbers without persisting changes."""
        wait = WebDriverWait(settings_page, 10)
        wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Edit Profile')]"))).click()

        phone = wait.until(EC.element_to_be_clickable((By.ID, "phone")))
        original_phone = phone.get_attribute("value")
        phone.send_keys(Keys.CONTROL, "a")
        phone.send_keys("abc")

        wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Save Changes')]"))).click()
        assert visible_text(settings_page, "Invalid number format.").is_displayed()

        wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Cancel')]"))).click()
        assert settings_page.find_element(By.ID, "phone").get_attribute("value") == original_phone

    def test_tc12_06_password_confirmation_mismatch_is_rejected(self, settings_page):
        """UC-12 alternate flow: non-matching passwords prompt the admin to re-enter them."""
        wait = WebDriverWait(settings_page, 10)
        new_password = settings_page.find_element(By.ID, "new-password")
        confirm_password = settings_page.find_element(By.ID, "confirm-password")

        new_password.clear()
        new_password.send_keys("NewPass123")
        confirm_password.clear()
        confirm_password.send_keys("DifferentPass123")

        update_button = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Update Password')]")))
        scroll_into_view(settings_page, update_button).click()

        assert visible_text(settings_page, "passwords do not match").is_displayed()

    def test_tc12_07_password_minimum_strength_is_enforced(self, settings_page):
        """UC-12 validation: weak replacement passwords are blocked before submission."""
        wait = WebDriverWait(settings_page, 10)
        new_password = settings_page.find_element(By.ID, "new-password")
        confirm_password = settings_page.find_element(By.ID, "confirm-password")

        for field in (new_password, confirm_password):
            field.clear()
            field.send_keys("short1")

        update_button = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Update Password')]")))
        scroll_into_view(settings_page, update_button).click()

        assert visible_text(settings_page, "Password must be at least 8 characters, including a number.").is_displayed()

        new_password.clear()
        confirm_password.clear()

    def test_tc12_08_password_visibility_toggles_mask_inputs(self, settings_page):
        """UC-12 usability: password visibility buttons toggle masking for both password fields."""
        wait = WebDriverWait(settings_page, 10)

        for field_id in ("new-password", "confirm-password"):
            password_input = settings_page.find_element(By.ID, field_id)
            toggle = wait.until(
                EC.element_to_be_clickable((By.XPATH, f"//input[@id='{field_id}']/following-sibling::button"))
            )

            assert password_input.get_attribute("type") == "password"
            toggle.click()
            assert password_input.get_attribute("type") == "text"
            toggle.click()
            assert password_input.get_attribute("type") == "password"

    def test_tc12_09_notification_preferences_can_be_changed_and_saved(self, settings_page):
        """UC-12 main flow: notification toggles/frequency can be saved and restored."""
        wait = WebDriverWait(settings_page, 10)
        section = visible_text(settings_page, "Notification Preferences")
        scroll_into_view(settings_page, section)

        frequency = Select(wait.until(EC.presence_of_element_located((By.ID, "alert-frequency"))))
        original_frequency = frequency.first_selected_option.get_attribute("value")
        alternate_frequency = "weekly" if original_frequency != "weekly" else "daily"

        email_section = settings_page.find_element(By.XPATH, "//h3[contains(., 'Email Notifications')]/ancestor::div[contains(@class, 'flex')][1]")
        sms_section = settings_page.find_element(By.XPATH, "//h3[contains(., 'SMS Notifications')]/ancestor::div[contains(@class, 'flex')][1]")
        email_toggle = email_section.find_element(By.CSS_SELECTOR, "label")
        sms_toggle = sms_section.find_element(By.CSS_SELECTOR, "label")
        original_email = email_section.find_element(By.CSS_SELECTOR, "input[type='checkbox']").is_selected()
        original_sms = sms_section.find_element(By.CSS_SELECTOR, "input[type='checkbox']").is_selected()

        email_toggle.click()
        sms_toggle.click()
        frequency.select_by_value(alternate_frequency)

        wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Save Preferences')]"))).click()
        assert visible_text(settings_page, "Notification preferences saved successfully").is_displayed()

        # Restore original values so repeated test runs do not drift the saved company settings.
        if email_section.find_element(By.CSS_SELECTOR, "input[type='checkbox']").is_selected() != original_email:
            email_toggle.click()
        if sms_section.find_element(By.CSS_SELECTOR, "input[type='checkbox']").is_selected() != original_sms:
            sms_toggle.click()
        Select(settings_page.find_element(By.ID, "alert-frequency")).select_by_value(original_frequency)
        wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Save Preferences')]"))).click()

    def test_tc12_10_system_configuration_controls_are_editable(self, settings_page):
        """UC-12 main flow: alert threshold, model parameters, and sync mode can be modified."""
        wait = WebDriverWait(settings_page, 10)
        section = visible_text(settings_page, "System Configuration")
        scroll_into_view(settings_page, section)

        original_threshold = settings_page.find_element(By.CSS_SELECTOR, "input[name='threshold']:checked").get_attribute("value")
        original_sync = settings_page.find_element(By.CSS_SELECTOR, "input[name='sync']:checked").get_attribute("value")

        high_threshold = settings_page.find_element(By.CSS_SELECTOR, "input[name='threshold'][value='high']")
        high_threshold.click()
        assert high_threshold.is_selected()

        manual_sync = settings_page.find_element(By.CSS_SELECTOR, "input[name='sync'][value='manual']")
        manual_sync.click()
        assert manual_sync.is_selected()
        assert visible_text(settings_page, "Sync Now").is_displayed()

        wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Edit Parameters')]"))).click()
        assert visible_text(settings_page, "Historical Data Weight").is_displayed()
        assert visible_text(settings_page, "Weather Weight").is_displayed()
        assert visible_text(settings_page, "Breeding Area Detection Weight").is_displayed()

        # Restore unsaved UI state for the next test.
        settings_page.find_element(By.CSS_SELECTOR, f"input[name='threshold'][value='{original_threshold}']").click()
        settings_page.find_element(By.CSS_SELECTOR, f"input[name='sync'][value='{original_sync}']").click()

    def test_tc12_11_risk_threshold_editor_can_be_opened_and_closed(self, settings_page):
        """UC-12 main flow: admin can inspect the risk threshold editor without saving."""
        wait = WebDriverWait(settings_page, 10)
        section = visible_text(settings_page, "System Configuration")
        scroll_into_view(settings_page, section)

        wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Edit Thresholds')]"))).click()
        low_threshold = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//span[contains(., 'Low to Medium Threshold')]/following::input[@type='number'][1]")
            )
        )
        high_threshold = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//span[contains(., 'Medium to High Threshold')]/following::input[@type='number'][1]")
            )
        )
        assert low_threshold.get_attribute("value")
        assert high_threshold.get_attribute("value")

        wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Cancel')]"))).click()
        assert visible_text(settings_page, "Edit Thresholds").is_displayed()

    def test_tc12_12_broadcast_notification_requires_title_and_message(self, settings_page):
        """UC-12 validation: broadcast action remains disabled until required fields are populated."""
        wait = WebDriverWait(settings_page, 10)
        section = visible_text(settings_page, "Broadcast Notification")
        scroll_into_view(settings_page, section)

        title = wait.until(EC.element_to_be_clickable((By.ID, "broadcast-title")))
        message = wait.until(EC.element_to_be_clickable((By.ID, "broadcast-message")))
        send_button = wait.until(EC.presence_of_element_located((By.XPATH, "//button[contains(., 'Send Broadcast Notification')]")))

        title.clear()
        message.clear()
        wait.until(lambda _: send_button.get_attribute("disabled"))

        title.send_keys("UC-12 Test Broadcast")
        wait.until(lambda _: send_button.get_attribute("disabled"))

        message.send_keys("This is only a validation check.")
        wait.until(lambda _: not send_button.get_attribute("disabled"))

        title.clear()
        message.clear()
