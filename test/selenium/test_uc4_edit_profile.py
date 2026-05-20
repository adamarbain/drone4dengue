"""UC-4 Edit Profile tests for the admin web application.

Test coverage for the website-only profile editing UI: Name, Username, and Phone.
"""

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from selenium.common.exceptions import TimeoutException

from conftest import BASE_URL


@pytest.mark.uc4
@pytest.mark.selenium
class TestUC4EditProfile:
    """Test suite for Use Case 4: Edit Profile."""

    def open_settings_page(self, driver):
        driver.get(f"{BASE_URL}/settings")
        wait = WebDriverWait(driver, 20)
        wait.until(
            EC.visibility_of_element_located(
                (By.XPATH, "//h2[contains(normalize-space(.), 'Profile Settings')]")
            )
        )

    def click_edit_profile(self, driver):
        wait = WebDriverWait(driver, 10)
        button = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[.//span[contains(., 'Edit Profile') or contains(., 'Cancel')]]")
            )
        )
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", button)
        button.click()

    def set_profile_field(self, driver, field_id, value):
        field = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, field_id))
        )
        field.click()
        field.send_keys(Keys.CONTROL + "a")
        field.send_keys(Keys.DELETE)
        field.send_keys(value)

    def get_profile_field_value(self, driver, field_id):
        field = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, field_id))
        )
        return field.get_attribute("value")

    def click_save_changes(self, driver):
        button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(normalize-space(.), 'Save Changes')]")
            )
        )
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", button)
        button.click()

    def wait_for_success_message(self, driver, message="Profile updated successfully!"):
        wait = WebDriverWait(driver, 10)
        success = wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    f"//div[contains(@class, 'text-green-600') and contains(normalize-space(.), '{message}') ]"
                )
            )
        )
        return success.text

    def get_profile_error(self, driver, field_id):
        xpath = f"//label[@for='{field_id}']/..//p[contains(@class, 'text-red-600')]"
        return WebDriverWait(driver, 5).until(
            EC.visibility_of_element_located((By.XPATH, xpath))
        ).text

    def test_tc_04_001_edit_profile_success(self, driver):
        """TCOV-04-001: Edit profile with valid input for all editable fields."""
        # driver = admin_driver
        self.open_settings_page(driver)

        original_name = self.get_profile_field_value(driver, "name")
        original_username = self.get_profile_field_value(driver, "username")
        original_phone = self.get_profile_field_value(driver, "phone")

        try:
            self.click_edit_profile(driver)
            self.set_profile_field(driver, "name", "Ahmad Test")
            self.set_profile_field(driver, "username", "ahmadtest")
            self.set_profile_field(driver, "phone", "0123456789")
            self.click_save_changes(driver)

            success_text = self.wait_for_success_message(driver)
            assert "Profile updated successfully" in success_text

            assert self.get_profile_field_value(driver, "name") == "Ahmad Test"
            assert self.get_profile_field_value(driver, "username") == "ahmadtest"
            assert self.get_profile_field_value(driver, "phone") == "0123456789"
        finally:
            self.click_edit_profile(driver)
            self.set_profile_field(driver, "name", original_name)
            self.set_profile_field(driver, "username", original_username)
            self.set_profile_field(driver, "phone", original_phone)
            self.click_save_changes(driver)
            WebDriverWait(driver, 10).until(
                EC.visibility_of_element_located(
                    (
                        By.XPATH,
                        "//div[contains(@class, 'text-green-600') and contains(normalize-space(.), 'Profile updated successfully!')]"
                    )
                )
            )

    def test_tc_04_003_edit_profile_empty_name(self, driver):
        """TCOV-04-003: Verify validation when the Name field is empty."""
        # driver = admin_driver
        self.open_settings_page(driver)

        self.click_edit_profile(driver)
        self.set_profile_field(driver, "name", "")
        self.set_profile_field(driver, "username", "ahmadtest")
        self.set_profile_field(driver, "phone", "0123456789")
        self.click_save_changes(driver)

        assert self.get_profile_error(driver, "name") == "Please fill out this field"

    def test_tc_04_004_edit_profile_empty_username(self, driver):
        """
        TCOV-04-004: Verify validation when the Username field is empty.
        """

        # driver = admin_driver
        self.open_settings_page(driver)

        self.click_edit_profile(driver)

        # Leave username empty
        self.set_profile_field(driver, "name", "Ahmad Test")
        self.set_profile_field(driver, "username", "")
        self.set_profile_field(driver, "phone", "0123456789")

        self.click_save_changes(driver)

        # Verify validation message appears
        assert self.get_profile_error(driver, "username") == "Please fill out this field"
    
    @pytest.mark.parametrize(
        "phone_value, expected_message",
        [
            ("abc", "Invalid number format."),
            ("", "Please fill out this field"),

            # Boundary Value Analysis (BVA) (valid: 8-15 digits)
            ("01234567", None),          # 8 digits
            ("012345678", None),  # 9 digits                           
            ("01234567890123", None),  # 14 digits 
            ("012345678901234", None), # 15 digits

            # Extreme invalid values
            ("0123456", "Invalid number format."),           # 7 digits
            ("0123456789012345", "Invalid number format.") # 16 digits
        ],
    )

    def test_tc_04_002_edit_profile_phone(self, driver, phone_value, expected_message):
        """TCOV-04-006/07/08/10: Verify phone number validation for invalid input."""
        # driver = admin_driver
        self.open_settings_page(driver)

        self.click_edit_profile(driver)
        self.set_profile_field(driver, "phone", phone_value)
        self.click_save_changes(driver)

        # VALID INPUT
        if expected_message is None:
            try:
                success_text = self.wait_for_success_message(driver)
                assert "Profile updated successfully" in success_text

            except TimeoutException:
                pytest.fail(
                    f"Valid phone number was rejected: '{phone_value}'"
                )

        # INVALID INPUT
        else:
            try:
                actual_message = self.get_profile_error(driver, "phone")
                assert actual_message == expected_message

            except TimeoutException:
                pytest.fail(
                    f"No validation message appeared for invalid phone input: '{phone_value}'"
                )

    def test_tc_04_006_edit_profile_network_failure(self, driver):
        """TCOV-04-011: Verify system behavior when network fails during profile update."""

        # driver = admin_driver
        self.open_settings_page(driver)

        original_name = self.get_profile_field_value(driver, "name")
        original_username = self.get_profile_field_value(driver, "username")
        original_phone = self.get_profile_field_value(driver, "phone")

        self.click_edit_profile(driver)

        self.set_profile_field(driver, "name", "Network Failure Test")
        self.set_profile_field(driver, "username", "networkfail")
        self.set_profile_field(driver, "phone", "0123456789")

        # Simulate network failure
        driver.execute_cdp_cmd("Network.enable", {})
        driver.execute_cdp_cmd("Network.emulateNetworkConditions", {
            "offline": True,
            "latency": 0,
            "downloadThroughput": 0,
            "uploadThroughput": 0
        })

        self.click_save_changes(driver)

        try:
            error_message = WebDriverWait(driver, 10).until(
                EC.visibility_of_element_located(
                    (
                        By.XPATH,
                        "//div[contains(normalize-space(.), 'Failed') "
                        "or contains(normalize-space(.), 'Error') "
                        "or contains(normalize-space(.), 'Network')]"
                    )
                )
            )

            assert error_message.is_displayed()

        finally:
            # Restore network connection
            driver.execute_cdp_cmd("Network.emulateNetworkConditions", {
                "offline": False,
                "latency": 0,
                "downloadThroughput": -1,
                "uploadThroughput": -1
            })

            # Restore original values if needed
            self.open_settings_page(driver)
            self.click_edit_profile(driver)

            self.set_profile_field(driver, "name", original_name)
            self.set_profile_field(driver, "username", original_username)
            self.set_profile_field(driver, "phone", original_phone)

            self.click_save_changes(driver)

            WebDriverWait(driver, 10).until(
                EC.visibility_of_element_located(
                    (
                        By.XPATH,
                        "//div[contains(@class, 'text-green-600') "
                        "and contains(normalize-space(.), 'Profile updated successfully!')]"
                    )
                )
            )
