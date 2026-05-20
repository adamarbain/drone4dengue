"""UC-10 Generate Report tests for the admin web application.

Test Design Specification covering:
- TC-10-001: Main flow - successfully generate report with valid filter criteria
- TC-10-002: Alternative flow - verify incomplete filter validation
- TC-10-003: Alternative flow - verify change of export format
- TC-10-004: Exception flow - verify failed report generation by invalid date range
"""

import time
from pathlib import Path
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.keys import Keys

from conftest import scroll_into_view, visible_text, DOWNLOAD_DIR


@pytest.mark.uc10
@pytest.mark.selenium
class TestUC10GenerateReport:
    """Test suite for Generate Report functionality (Use Case 10)"""

    def set_date_input(self, driver, index, date_value):
        wait = WebDriverWait(driver, 10)

        inputs = wait.until(
            EC.presence_of_all_elements_located(
                (By.CSS_SELECTOR, "input[type='date']")
            )
        )

        assert len(inputs) >= 2, "Expected at least 2 date inputs"

        field = inputs[index]

        # scroll into view
        driver.execute_script(
            "arguments[0].scrollIntoView({block: 'center'});",
            field
        )

        # click field first
        field.click()

        # clear existing value
        field.send_keys(Keys.CONTROL + "a")
        field.send_keys(Keys.DELETE)

        # type date
        field.send_keys(date_value)

        # trigger blur/change
        field.send_keys(Keys.TAB)

        time.sleep(1)

        actual_value = field.get_attribute("value")

        return actual_value
    
    def fill_report_filters(self, driver, start_date="", end_date=""):
        result = {}
        
        if start_date:
            result["start_date"] = self.set_date_input(driver, 0, start_date)

        if end_date:
            result["end_date"] = self.set_date_input(driver, 1, end_date)

        return result

    def get_generate_button(self, driver):
        wait = WebDriverWait(driver, 10)

        return wait.until(
            EC.presence_of_element_located(
                (By.XPATH, "//button[contains(., 'Generate Report')]")
            )
        )

    def check_generate_button_disabled(self, driver):
        button = self.get_generate_button(driver)

        return button.get_attribute("disabled") is not None
    
    def generate_report(self, driver):
        button = self.get_generate_button(driver)

        assert not button.get_attribute("disabled"), "Generate button should be enabled"

        button.click()

    def wait_for_report_generation(self, driver):
        wait = WebDriverWait(driver, 30)

        export_section = wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    "//div[contains(., 'Export Options')]"
                )
            )
        )

        assert export_section.is_displayed(), "Export section did not appear"

        return export_section
    
    def click_view_details(self, driver, index=0):
        wait = WebDriverWait(driver, 10)

        buttons = wait.until(
            EC.presence_of_all_elements_located(
                (
                    By.XPATH,
                    "//button[contains(., 'View Details')]"
                )
            )
        )

        buttons[index].click()

        modal = wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    "//div[contains(@class, 'fixed inset-0')]"
                )
            )
        )

        assert modal.is_displayed(), "Detail modal did not open"

    def close_modal(self, driver):
        wait = WebDriverWait(driver, 10)

        close_button = wait.until(
            EC.element_to_be_clickable(
                (
                    By.XPATH,
                    "//button[@aria-label='Close details modal']"
                )
            )
        )

        close_button.click()

        wait.until(
            EC.invisibility_of_element_located(
                (
                    By.XPATH,
                    "//div[contains(@class, 'fixed inset-0')]"
                )
            )
        )

    def wait_for_download(self, download_dir, start_date, end_date, extension, timeout=20):
        end_time = time.time() + timeout

        expected_name_prefix = f"dengue_report_{start_date}_{end_date}"

        download_path = Path(download_dir)

        while time.time() < end_time:
            files = list(download_path.glob(f"{expected_name_prefix}*{extension}"))

            # ignore partial chrome files
            files = [f for f in files if not f.name.endswith(".crdownload")]

            if files:
                return files[0].name

            time.sleep(1)

        return None

    def export_report(self, driver, format_name):
        wait = WebDriverWait(driver, 10)

        export_button = wait.until(
            EC.element_to_be_clickable(
                (
                    By.XPATH,
                    f"//span[contains(., 'Export as {format_name}')]"
                )
            )
        )

        export_button.click()

    # ===== TC-10-001: Main Flow - Valid Filter Criteria =====

    def test_tc_10_001_generate_report_pdf(self, report_generation_page):
        """
        TCOV-10-001: Generate report with valid filter criteria and export as PDF
        Input: Start Date: 1/4/2025; End Date: 30/4/2025; Export Format: PDF
        Expected Result: Report is downloaded and saved
        """
        driver = report_generation_page
        
        for file in Path(DOWNLOAD_DIR).glob("*"):
            file.unlink()
        
        self.fill_report_filters(
            driver,
            start_date="01042025",
            end_date="30042025"
        )
        
        # Verify generate button is enabled
        self.generate_report(driver)
        self.wait_for_report_generation(driver)
        self.click_view_details(driver)
        self.close_modal(driver)
        self.export_report(driver, "PDF")
        downloaded_file = self.wait_for_download(
            DOWNLOAD_DIR,
            "2025-04-01",
            "2025-04-30",
            ".pdf"
        )
        
        assert downloaded_file is not None, \
        "PDF report was not downloaded"

    def test_tc_10_001_generate_report_csv(self, report_generation_page):
        """
        TCOV-10-002: Generate report with valid filter criteria and export as CSV
        Input: Start Date: 1/4/2025; End Date: 30/4/2025; Export Format: CSV
        Expected Result: Report is downloaded and saved
        """
        driver = report_generation_page

        for file in Path(DOWNLOAD_DIR).glob("*"):
            file.unlink()
        
        self.fill_report_filters(
            driver,
            start_date="01042025",
            end_date="30042025"
        )
        
        # Verify generate button is enabled
        self.generate_report(driver)
        self.wait_for_report_generation(driver)
        self.click_view_details(driver)
        self.close_modal(driver)
        self.export_report(driver, "CSV")
        downloaded_file = self.wait_for_download(
            DOWNLOAD_DIR,
            "2025-04-01",
            "2025-04-30",
            ".csv"
        )
        
        assert downloaded_file is not None, \
        "CSV report was not downloaded"

    def test_tc_10_001_generate_report_xlsx(self, report_generation_page):
        """
        TCOV-10-003: Generate report with valid filter criteria and export as XLSX
        Input: Start Date: 1/4/2025; End Date: 30/4/2025; Export Format: XLSX
        Expected Result: Report is downloaded and saved
        """
        driver = report_generation_page

        for file in Path(DOWNLOAD_DIR).glob("*"):
            file.unlink()
        
        self.fill_report_filters(
            driver,
            start_date="01042025",
            end_date="30042025"
        )
        
        # Verify generate button is enabled
        self.generate_report(driver)
        self.wait_for_report_generation(driver)
        self.click_view_details(driver)
        self.close_modal(driver)
        self.export_report(driver, "XLSX")
        downloaded_file = self.wait_for_download(
            DOWNLOAD_DIR,
            "2025-04-01",
            "2025-04-30",
            ".xlsx"
        )
        
        assert downloaded_file is not None, \
        "XLSX report was not downloaded"

    def test_tc_10_001_generate_report_other_format(self, report_generation_page):
        """
        TCOV-10-004: Generate report with valid filter criteria and export as Other Format
        Input: Start Date: 1/4/2025; End Date: 30/4/2025; Export Format: Other Format
        Expected Result: Report is downloaded and saved
        """
        driver = report_generation_page

        for file in Path(DOWNLOAD_DIR).glob("*"):
            file.unlink()
        
        self.fill_report_filters(
            driver,
            start_date="01042025",
            end_date="30042025"
        )
        
        # Verify generate button is enabled
        self.generate_report(driver)
        self.wait_for_report_generation(driver)
        self.click_view_details(driver)
        self.close_modal(driver)
        self.export_report(driver, "JSON")
        downloaded_file = self.wait_for_download(
            DOWNLOAD_DIR,
            "2025-04-01",
            "2025-04-30",
            ".json"
        )
        
        assert downloaded_file is not None, \
        "JSON report was not downloaded"

    def test_tc_10_001_generate_report_same_dates(self, report_generation_page):
        """
        TCOV-10-005: Generate report with Start date and End date are the same
        Input: Start Date: 1/4/2025; End Date: 1/4/2025; Export Format: PDF
        Expected Result: Report is downloaded and saved
        """
        driver = report_generation_page
        
        for file in Path(DOWNLOAD_DIR).glob("*"):
            file.unlink()

        self.fill_report_filters(
            driver,
            start_date="01042025",
            end_date="01042025"
        )
        
        # Verify generate button is enabled
        self.generate_report(driver)
        self.wait_for_report_generation(driver)
        self.click_view_details(driver)
        self.close_modal(driver)
        self.export_report(driver, "PDF")
        downloaded_file = self.wait_for_download(
            DOWNLOAD_DIR,
            "2025-04-01",
            "2025-04-01",
            ".pdf"
        )
        
        assert downloaded_file is not None, \
        "PDF report was not downloaded"
    # ===== TC-10-002: Alternative Flow - Incomplete Filter Validation =====

    def test_tc_10_003_missing_start_date(self, report_generation_page):
        """
        TCOV-10-006: Generate report with Incomplete Filter - Start Date not specified
        Input: Start Date: (empty); End Date: 30/4/2025
        Expected Result: System disable button; System prompt to fill empty filter
        """
        driver = report_generation_page
        
        self.fill_report_filters(
            driver,
            start_date="",
            end_date="30042025"
        )
        
         # 1. Button disabled check
        assert self.check_generate_button_disabled(driver), \
            "Generate button should be disabled when Start Date is empty"

        # 2. Prompt check
        prompt = WebDriverWait(driver, 5).until(
            EC.visibility_of_element_located(
                (By.XPATH, "//*[contains(text(), 'complete') or contains(text(), 'required')]")
            )
        )

        assert prompt.is_displayed(), \
            "System should prompt user to complete missing Start Date"

    def test_tc_10_003_missing_end_date(self, report_generation_page):
        """
        TCOV-10-007: Generate report with Incomplete Filter - End Date not specified
        Input: Start Date: 1/4/2025; End Date: (empty)
        Expected Result: System disable button; System prompt to fill empty filter
        """
        driver = report_generation_page
        
        self.fill_report_filters(
            driver,
            start_date="01042025",
            end_date=""
        )
        
         # 1. Button disabled check
        assert self.check_generate_button_disabled(driver), \
            "Generate button should be disabled when Start Date is empty"

        # 2. Prompt check
        prompt = WebDriverWait(driver, 5).until(
            EC.visibility_of_element_located(
                (By.XPATH, "//*[contains(text(), 'complete') or contains(text(), 'required')]")
            )
        )

        assert prompt.is_displayed(), \
            "System should prompt user to complete missing Start Date"

    def test_tc_10_003_missing_both_dates(self, report_generation_page):
        """
        TCOV-10-008: Generate report with both dates empty
        Input: Start Date: (empty); End Date: (empty)
        Expected Result: System disable button; System prompt to fill empty filter
        """
        driver = report_generation_page
        
        # Don't fill any dates - leave them empty
        self.fill_report_filters(
            driver,
            start_date="",
            end_date=""
        )
        
         # 1. Button disabled check
        assert self.check_generate_button_disabled(driver), \
            "Generate button should be disabled when Start Date is empty"

        # 2. Prompt check
        prompt = WebDriverWait(driver, 5).until(
            EC.visibility_of_element_located(
                (By.XPATH, "//*[contains(text(), 'complete') or contains(text(), 'required')]")
            )
        )

        assert prompt.is_displayed(), \
            "System should prompt user to complete missing Start Date"

    # ===== TC-10-003: Alternative Flow - Format Change =====

    def test_tc_10_004_change_export_format(self, report_generation_page):
        """
        TCOV-10-010: Change report format from CSV to PDF
        Input: Start Date: 1/5/2025; End Date: 1/5/2025; Change Format: CSV to PDF
        Expected Result: Regenerate report in new selected format
        """
        driver = report_generation_page
        
        # Clear any existing downloaded files
        for file in Path(DOWNLOAD_DIR).glob("*"):
            file.unlink()

        self.fill_report_filters(
            driver,
            start_date="01052025",
            end_date="01052025"
        )
        
        # Verify generate button is enabled
        self.generate_report(driver)
        self.wait_for_report_generation(driver)
        self.click_view_details(driver)
        self.close_modal(driver)
        self.export_report(driver, "CSV")
        downloaded_file = self.wait_for_download(
            DOWNLOAD_DIR,
            "2025-05-01",
            "2025-05-01",
            ".csv"
        )

        self.export_report(driver, "PDF")
        downloaded_file = self.wait_for_download(
            DOWNLOAD_DIR,
            "2025-05-01",
            "2025-05-01",
            ".pdf"
        )
        
        assert downloaded_file is not None, \
        "PDF report was not downloaded"

    # ===== TC-10-004: Exception Flow - Invalid Date Range =====

    def test_tc_10_002_invalid_date_range_end_before_start(self, report_generation_page):
        """
        TCOV-10-011: Report generation failed - Invalid date range (End date before Start date)
        Input: Start Date: 30/4/2025; End Date: 1/4/2025
        Expected Result: System show error or disable button
        """
        driver = report_generation_page

        for file in Path(DOWNLOAD_DIR).glob("*"):
            file.unlink()
        
        self.fill_report_filters(
            driver,
            start_date="30042025",
            end_date="01042025"
        )
        
        # Verify generate button is enabled
        self.generate_report(driver)
        self.wait_for_report_generation(driver)
        self.click_view_details(driver)
        message = WebDriverWait(driver, 20).until(
            EC.visibility_of_element_located(
                (By.XPATH, "//*[contains(text(), 'No weekly data available')]")
            )
        )

        assert "No weekly data available" in message.text

    def test_tc_10_002_date_range_past(self, report_generation_page):
        """
        TCOV-10-012: Report generation failed - Date range past (too old)
        Input: Start Date: 1/1/1990; End Date: 31/1/1990
        Expected Result: System show error or disable button
        """
        driver = report_generation_page
        
        # Clear any existing downloaded files
        for file in Path(DOWNLOAD_DIR).glob("*"):
            file.unlink()

        self.fill_report_filters(
            driver,
            start_date="01011990",
            end_date="31011990"
        )
        
        # Verify generate button is enabled
        self.generate_report(driver)
        self.wait_for_report_generation(driver)
        self.click_view_details(driver)
        message = WebDriverWait(driver, 20).until(
            EC.visibility_of_element_located(
                (By.XPATH, "//*[contains(text(), 'No weekly data available')]")
            )
        )

        assert "No weekly data available" in message.text

    def test_tc_10_002_date_range_future(self, report_generation_page):
        """
        TCOV-10-013: Report generation failed - Date range future (too far ahead)
        Input: Start Date: 1/1/2028; End Date: 31/1/2028
        Expected Result: System show error or disable button
        """
        driver = report_generation_page
        
        # Clear any existing downloaded files
        for file in Path(DOWNLOAD_DIR).glob("*"):
            file.unlink()

        self.fill_report_filters(
            driver,
            start_date="01012028",
            end_date="31012028"
        )
        
        # Verify generate button is enabled
        self.generate_report(driver)
        self.wait_for_report_generation(driver)
        self.click_view_details(driver)
        message = WebDriverWait(driver, 20).until(
            EC.visibility_of_element_located(
                (By.XPATH, "//*[contains(text(), 'No weekly data available')]")
            )
        )

        assert "No weekly data available" in message.text

    def test_tc_10_005_clear_filters_resets_dates(self, report_generation_page):
        driver = report_generation_page

        # Step 1: fill both dates first
        self.fill_report_filters(
            driver,
            start_date="01042025",
            end_date="30042025"
        )

        # Step 2: click Clear Filters button
        clear_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[contains(., 'Clear Filters')]")
            )
        )
        clear_button.click()

        # Step 3: re-locate inputs (important for React state updates)
        inputs = WebDriverWait(driver, 10).until(
            EC.presence_of_all_elements_located(
                (By.CSS_SELECTOR, "input[type='date']")
            )
        )

        start_value = inputs[0].get_attribute("value")
        end_value = inputs[1].get_attribute("value")

        # Step 4: assertions
        assert start_value == "", f"Expected start date to be empty, got {start_value}"
        assert end_value == "", f"Expected end date to be empty, got {end_value}"

    def test_tc_10_007_start_and_end_dates_exist(self, report_generation_page):
        """
        TCOV-10-001: Generate report with valid filter criteria and export as PDF
        Input: Start Date: 1/4/2025; End Date: 30/4/2025; Export Format: PDF
        Expected Result: Report is downloaded and saved
        """
        driver = report_generation_page
        
        result = self.fill_report_filters(
            driver,
            start_date="01042025",
            end_date="30042025"
        )

        assert result["start_date"] != "", "Start date was not set properly"
        assert result["end_date"] != "", "End date was not set properly"
        
    
    def test_tc_10_007_location_filter_exists(self, report_generation_page):
        """
        Verify Location filter exists as specified in UC-10.
        """

        driver = report_generation_page

        location_filter = driver.find_elements(
            By.XPATH,
            "//select[contains(@name, 'location') or contains(@id, 'location')]"
        )

        assert len(location_filter) > 0, (
            "UC-10 specifies a Location filter, "
            "but no Location filter exists in the Reports UI."
        )

    def test_tc_10_007_data_type_filter_exists(self, report_generation_page):
        """
        Verify Data Type filter exists as specified in UC-10.
        """

        driver = report_generation_page

        data_type_filter = driver.find_elements(
            By.XPATH,
            "//select[contains(@name, 'type') "
            "or contains(@id, 'type') "
            "or contains(@name, 'data')]"
        )

        assert len(data_type_filter) > 0, (
            "UC-10 specifies a Data Type filter, "
            "but no Data Type filter exists in the Reports UI."
        )

    def test_tc_10_006_report_generation_system_failure(self, report_generation_page):
        driver = report_generation_page

        self.fill_report_filters(
            driver,
            start_date="01042025",
            end_date="30042025"
        )

        try:
            # simulate failure (example: backend down or network off)
            driver.execute_cdp_cmd("Network.enable", {})

            driver.execute_cdp_cmd(
                "Network.emulateNetworkConditions",
                {
                    "offline": True,
                    "latency": 0,
                    "downloadThroughput": 0,
                    "uploadThroughput": 0
                }
            )

            self.generate_report(driver)

            error_msg = visible_text(
                driver,
                "Failed to fetch",
                timeout=10
            )

            assert error_msg.is_displayed(), (
                "Error message should be displayed on report generation failure"
            )

        finally:
            # restore network connection
            driver.execute_cdp_cmd(
                "Network.emulateNetworkConditions",
                {
                    "offline": False,
                    "latency": 0,
                    "downloadThroughput": -1,
                    "uploadThroughput": -1
                }
            )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
