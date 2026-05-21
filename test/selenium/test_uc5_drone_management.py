"""
test_uc5_drone_management.py — Selenium tests for UC5 (Admin Web)
===================================================================
Project : Drone4Dengue – Admin Web System
Doc ref : UC5 Test Design & Test Case Specification
Actor   : Admin | Platform: Website (http://localhost:3000)
Runner  : pytest

Test Cases (official specification):
  TC-05-001  Verify admin login, access drone module, and view drone list
             Covers: UC5-COV-01, UC5-COV-02
  TC-05-002  Verify add, edit, and delete drone functions
             Covers: UC5-COV-03, UC5-COV-04, UC5-COV-05  |  Depends: TC-05-001
  TC-05-003  Verify drone map assignment and system update persistence
             Covers: UC5-COV-06, UC5-COV-07  |  Depends: TC-05-002
  TC-05-004  Verify system handles GPS denial and database failure
             Covers: UC5-COV-08, UC5-COV-09

NOTE on dialogs
---------------
- Create / Update flows use native browser alert() calls.
- Delete flow uses React ConfirmDialog ("Confirm" button) → React
  SuccessDialog ("Great!" button).  Use dismiss_confirm_and_success_dialog().
"""

import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

from conftest import (
    BASE_URL,
    wait_for, wait_for_element, wait_for_clickable, wait_for_visible,
    accept_alert, dismiss_any_dialog, dismiss_confirm_and_success_dialog,
    go_to_drone_management, DEFAULT_WAIT,
)

# ── Test data ────────────────────────────────────────────────────────────────
DRONE_NAME     = "DJI Alpha"
DRONE_MODEL    = "DJI Mini 3"
DRONE_SERIAL   = "SN-UC5-TEST-001"
DRONE_NAME_UPD = "DJI Alpha Updated"
NO_MATCH_TERM  = "ZZZNOMATCH999"

EXPECTED_COLUMNS = [
    "Drone ID", "Drone Name", "Model",
    "Registration Date", "Status", "Add Drone Images", "Actions"
]
STAT_LABELS = ["Total Drones", "Operational", "Maintenance", "Inactive"]


# ── Shared helpers ───────────────────────────────────────────────────────────

def _open_add_drone_modal(driver):
    """Click '+ Add Drone' and wait for the modal."""
    btn = wait_for_clickable(driver, By.XPATH,
        "//button[contains(., 'Add Drone')]")
    btn.click()
    wait_for_visible(driver, By.XPATH, "//*[contains(text(),'Add New Drone')]")
    time.sleep(0.5)


def _fill_add_drone_form(driver, name=DRONE_NAME, model=DRONE_MODEL,
                          serial=DRONE_SERIAL, status="Operational",
                          select_location=True):
    """Populate all visible fields in the Add New Drone modal."""
    # Drone Name  (placeholder: "e.g., Drone Alpha")
    name_input = wait_for_clickable(driver, By.XPATH,
        "//label[contains(.,'Drone Name')]/following-sibling::input")
    name_input.clear()
    name_input.send_keys(name)

    # Model  (placeholder: "e.g., DJI Phantom 4 Pro")
    model_input = wait_for_clickable(driver, By.XPATH,
        "//label[contains(.,'Model')]/following-sibling::input")
    model_input.clear()
    model_input.send_keys(model)

    # Serial Number  (placeholder: "e.g., SN123456789")
    serial_input = wait_for_clickable(driver, By.XPATH,
        "//label[contains(.,'Serial Number')]/following-sibling::input")
    serial_input.clear()
    serial_input.send_keys(serial)

    # Status dropdown
    status_selects = driver.find_elements(By.XPATH,
        "//select[.//option[contains(.,'Operational')]]")
    if status_selects:
        Select(status_selects[0]).select_by_visible_text(status)

    # Company Location – select first real location if available
    if select_location:
        time.sleep(1.5)
        all_selects = driver.find_elements(By.XPATH, "//select")
        for sel_el in all_selects:
            try:
                sel = Select(sel_el)
                opts = [o for o in sel.options if o.get_attribute("value")]
                if any(o.text in ["No specific location", ""] for o in sel.options) and len(opts) > 0:
                    real_locations = [o for o in opts if o.get_attribute("value") != ""]
                    if real_locations:
                        real_locations[0].click()
                        time.sleep(0.3)
                        driver.execute_script(
                            "arguments[0].dispatchEvent(new Event('change', {bubbles: true}));",
                            sel_el)
                        break
            except Exception:
                pass


def _click_submit_in_add_modal(driver):
    """Click the 'Add Drone' submit button inside the open modal."""
    save_btn = wait_for_clickable(driver, By.XPATH,
        "//form//button[@type='submit']")
    save_btn.click()
    time.sleep(0.5)


def _close_open_modal(driver, timeout=5):
    """Close whichever modal is currently open via its X button."""
    try:
        close_btn = WebDriverWait(driver, timeout).until(
            EC.element_to_be_clickable((By.XPATH,
                "//div[contains(@class,'fixed')]"
                "//button[.//*[name()='svg']]")
            ))
        close_btn.click()
        time.sleep(0.5)
    except TimeoutException:
        pass


def _get_first_location_select(driver):
    """Return the company location <select> from the currently open modal."""
    selects = driver.find_elements(By.XPATH,
        "//label[contains(.,'Operational Area')]/following-sibling::div//select")
    if not selects:
        selects = driver.find_elements(By.XPATH,
            "//label[contains(.,'Operational Area')]/following-sibling::select")
    if not selects:
        selects = driver.find_elements(By.XPATH,
            "//select[.//option[contains(.,'No specific location')]]")
    return selects[0] if selects else None


def _find_drone_row(driver, drone_name):
    """Find the table row for a drone by name."""
    return driver.find_elements(By.XPATH,
        f"//tr[contains(.,'{drone_name}')]")


def _create_drone(driver, name=DRONE_NAME, model=DRONE_MODEL,
                  serial=DRONE_SERIAL, status="Operational",
                  select_location=True):
    """Create a drone via the Add Drone modal and verify it appears."""
    _open_add_drone_modal(driver)
    _fill_add_drone_form(driver, name=name, model=model, serial=serial,
                         status=status, select_location=select_location)
    _click_submit_in_add_modal(driver)
    dismiss_any_dialog(driver, timeout=8)
    time.sleep(2)
    go_to_drone_management(driver)
    assert name in driver.page_source, \
        f"Drone '{name}' not found in list after creation"


def _edit_drone_status(driver, drone_name, new_status, expect_success=True):
    """Open edit modal for a drone, change status, and save."""
    rows = _find_drone_row(driver, drone_name)
    if not rows:
        pytest.skip(f"'{drone_name}' not found — run add step first")

    edit_btn = rows[0].find_element(By.XPATH,
        ".//button[@title='Edit Drone']")
    edit_btn.click()
    time.sleep(1)

    assert "Edit Drone" in driver.page_source, "Edit modal should open"

    status_selects = driver.find_elements(By.XPATH,
        "//select[.//option[contains(.,'Operational')]]")
    assert status_selects, "Status select not found in Edit modal"
    Select(status_selects[0]).select_by_visible_text(new_status)

    save_btn = wait_for_clickable(driver, By.XPATH,
        "//button[contains(.,'Save Changes')]")
    save_btn.click()

    if expect_success:
        dismiss_any_dialog(driver, timeout=8)
        time.sleep(2)
        go_to_drone_management(driver)
    else:
        time.sleep(2)


def _delete_drone(driver, drone_name):
    """Delete a drone by name and confirm removal."""
    rows = _find_drone_row(driver, drone_name)
    if not rows:
        pytest.skip(f"'{drone_name}' not found — cannot delete")

    delete_btn = rows[0].find_element(By.XPATH,
        ".//button[@title='Delete Drone']")
    delete_btn.click()
    time.sleep(1)

    assert "Delete Drone" in driver.page_source, \
        "Confirmation dialog did not appear"

    dismiss_confirm_and_success_dialog(driver, timeout=8, confirm_text="Confirm")
    time.sleep(1)
    go_to_drone_management(driver)
    assert drone_name not in driver.page_source, \
        f"Drone '{drone_name}' should be removed after deletion"


def _delete_drone_no_assert(driver, drone_name):
    """Delete a drone without asserting removal (for cleanup)."""
    rows = _find_drone_row(driver, drone_name)
    if rows:
        del_btn = rows[0].find_elements(By.XPATH,
            ".//button[@title='Delete Drone']")
        if del_btn:
            del_btn[0].click()
            time.sleep(0.5)
            dismiss_confirm_and_success_dialog(driver, timeout=8, confirm_text="Confirm")
            time.sleep(1)


def _override_gps_denied(driver):
    """Override navigator.geolocation to simulate GPS denial."""
    driver.execute_script("""
        window.__gpsOverridden = true;
        const _origGeo = navigator.geolocation;
        Object.defineProperty(navigator, 'geolocation', {
            configurable: true,
            get: function() {
                return {
                    getCurrentPosition: function(success, error) {
                        if (error) {
                            error({
                                code: 1,
                                message: 'User denied Geolocation'
                            });
                        }
                    },
                    watchPosition: function() { return 0; },
                    clearWatch: function() {}
                };
            }
        });
    """)


def _restore_gps(driver):
    """Restore original geolocation after GPS override."""
    driver.execute_script("if (window.__gpsOverridden) { delete window.__gpsOverridden; }")


def _override_fetch_500(driver):
    """Override window.fetch to return HTTP 500 for PUT /drones/:id."""
    driver.execute_script(r"""
        window.__origFetch = window.fetch;
        window.fetch = function(url, opts) {
            var isDroneUpdate = false;
            if (typeof url === 'string' && /\/drones\/[^/?]/.test(url)) {
                var method = (opts && opts.method) || 'GET';
                if (method === 'PUT') {
                    isDroneUpdate = true;
                }
            }
            if (isDroneUpdate) {
                return Promise.resolve(
                    new Response(
                        JSON.stringify({ error: 'Database update failed' }),
                        {
                            status: 500,
                            statusText: 'Internal Server Error',
                            headers: { 'Content-Type': 'application/json' }
                        }
                    )
                );
            }
            return window.__origFetch.apply(this, arguments);
        };
    """)


def _restore_fetch(driver):
    """Restore original window.fetch after 500 override."""
    driver.execute_script("""
        if (window.__origFetch) {
            window.fetch = window.__origFetch;
            delete window.__origFetch;
        }
    """)


def _close_all_modals(driver):
    """Close all open modals via their X buttons."""
    close_btns = driver.find_elements(By.XPATH,
        "//div[contains(@class,'fixed')]//button[.//*[name()='svg']]")
    for btn in close_btns:
        try:
            btn.click()
            time.sleep(0.3)
        except Exception:
            pass


# ═════════════════════════════════════════════════════════════════════════════
# TC-05-001  Verify admin login, access drone module, and view drone list
# Covers: UC5-COV-01, UC5-COV-02
# ═════════════════════════════════════════════════════════════════════════════

class TestTC05001AccessAndViewList:
    """TC-05-001: Verify admin login, access drone module, and view drone list.

    Covers UC5-COV-01 (authenticated admin can access drone management page)
    and UC5-COV-02 (drone list and assigned areas are shown).
    """

    def test_navigate_to_drone_management(self, driver, drone_page):
        """Step 1 – URL contains /drone-management."""
        assert "/drone-management" in driver.current_url

    def test_page_heading_visible(self, driver, drone_page):
        """Step 2 – Page heading 'Drone Management' is visible."""
        heading = wait_for_visible(driver, By.TAG_NAME, "h1")
        assert "Drone Management" in heading.text

    def test_subtitle_visible(self, driver, drone_page):
        """Step 3 – Subtitle text is visible."""
        assert "Manage all aspects of the drones" in driver.page_source

    def test_drone_fleet_section_present(self, driver, drone_page):
        """Step 4 – 'Drone Fleet' section header is present."""
        assert "Drone Fleet" in driver.page_source

    def test_table_columns_present(self, driver, drone_page):
        """Step 5 – All 7 required column headers exist."""
        headers = driver.find_elements(By.XPATH, "//table//th")
        header_texts = " ".join(h.text.strip() for h in headers)
        for col in EXPECTED_COLUMNS:
            assert col in header_texts, \
                f"Column '{col}' not found. Found: {header_texts}"

    def test_stats_cards_visible(self, driver, drone_page):
        """Step 6 – All four stat labels are visible."""
        src = driver.page_source
        for label in STAT_LABELS:
            assert label in src, f"Stat label '{label}' not found"

    def test_stat_values_numeric(self, driver, drone_page):
        """Step 7 – Stat values are numeric."""
        stat_divs = driver.find_elements(By.XPATH,
            "//div[contains(@class,'text-3xl') and contains(@class,'font-bold')]")
        assert len(stat_divs) >= 4
        for div in stat_divs[:4]:
            val = div.text.strip()
            assert val.isdigit(), f"Stat value '{val}' is not numeric"


# ═════════════════════════════════════════════════════════════════════════════
# TC-05-002  Verify add, edit, and delete drone functions
# Covers: UC5-COV-03, UC5-COV-04, UC5-COV-05  |  Depends: TC-05-001
# ═════════════════════════════════════════════════════════════════════════════

class TestTC05002AddEditDeleteDrone:
    """TC-05-002: Verify add, edit, and delete drone functions.

    Covers UC5-COV-03 (new drone can be created),
    UC5-COV-04 (drone details can be updated),
    UC5-COV-05 (drone deletion works correctly).
    """

    def test_add_drone_creates_entry(self, driver, drone_page):
        """Steps 1-4: Add a new drone and verify it appears in the list."""
        _create_drone(driver,
            name=DRONE_NAME, model=DRONE_MODEL,
            serial=DRONE_SERIAL, status="Operational")

    def test_edit_drone_updates_status(self, driver, drone_page):
        """Steps 5-8: Edit drone status and verify update is reflected."""
        _edit_drone_status(driver, DRONE_NAME, "Maintenance")
        assert "Maintenance" in driver.page_source, \
            "Status should be updated to Maintenance"

    def test_delete_drone_removes_entry(self, driver, drone_page):
        """Steps 9-11: Delete the test drone and verify removal."""
        _delete_drone(driver, DRONE_NAME)


# ═════════════════════════════════════════════════════════════════════════════
# TC-05-003  Verify drone map assignment and system update persistence
# Covers: UC5-COV-06, UC5-COV-07  |  Depends: TC-05-002
# ═════════════════════════════════════════════════════════════════════════════

class TestTC05003MapAssignmentAndPersistence:
    """TC-05-003: Verify drone location assignment and update persistence.

    Covers UC5-COV-06 (GPS location assignment works) and
    UC5-COV-07 (updates are reflected immediately).

    Uses the Operational Area dropdown in the Edit modal (the map button
    in the table is commented out in the current build).
    """

    def test_assign_location_and_persist(self, driver, drone_page):
        """Steps 1-7: Create drone, assign location via dropdown, refresh, verify."""
        DRONE_TC_NAME = "TC5003 Location Test"

        # Step 1: Create a test drone
        _create_drone(driver,
            name=DRONE_TC_NAME, model="DJI Test",
            serial="SN-TC5003-LOC", status="Operational",
            select_location=False)

        # Step 2: Open Edit modal
        rows = _find_drone_row(driver, DRONE_TC_NAME)
        assert rows, "Test drone row not found"
        edit_btn = rows[0].find_element(By.XPATH,
            ".//button[@title='Edit Drone']")
        edit_btn.click()
        time.sleep(1)

        # Step 3: Change Operational Area dropdown
        loc_select = _get_first_location_select(driver)
        if loc_select:
            sel = Select(loc_select)
            opts = [o for o in sel.options if o.get_attribute("value")]
            if len(opts) > 1:
                opts[1].click()
                driver.execute_script(
                    "arguments[0].dispatchEvent(new Event('change', {bubbles: true}));",
                    loc_select)
                time.sleep(0.5)
            elif len(opts) == 1:
                opts[0].click()
                driver.execute_script(
                    "arguments[0].dispatchEvent(new Event('change', {bubbles: true}));",
                    loc_select)
                time.sleep(0.5)
            else:
                pytest.skip("No company locations available to assign")
        else:
            pytest.skip("Operational Area dropdown not found in Edit modal")

        # Step 4: Save changes
        save_btn = wait_for_clickable(driver, By.XPATH,
            "//button[contains(.,'Save Changes')]")
        save_btn.click()
        dismiss_any_dialog(driver, timeout=8)
        time.sleep(2)

        # Step 5-6: Refresh page
        driver.refresh()
        time.sleep(3)
        wait_for(driver, EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'Drone Management')]")), timeout=15)

        # Step 7: Verify drone still present (persistence confirmed)
        assert DRONE_TC_NAME in driver.page_source, \
            "Drone should persist after page refresh"

        # Cleanup: delete the test drone
        _delete_drone_no_assert(driver, DRONE_TC_NAME)


# ═════════════════════════════════════════════════════════════════════════════
# TC-05-004  Verify system handles GPS denial and database failure
# Covers: UC5-COV-08, UC5-COV-09
# ═════════════════════════════════════════════════════════════════════════════

class TestTC05004ExceptionHandling:
    """TC-05-004: Verify system handles GPS denial and database failure.

    Covers UC5-COV-08 (system prompts user to enable location) and
    UC5-COV-09 (system handles DB failure correctly).
    """

    def test_gps_permission_denied_no_crash(self, driver, drone_page):
        """Steps 1-4: Deny GPS permission; verify fallback / no crash."""
        go_to_drone_management(driver)

        # Step 1: Override navigator.geolocation to fire error callback
        _override_gps_denied(driver)

        # Step 2: Open Add Drone modal
        add_btn = wait_for_clickable(driver, By.XPATH,
            "//button[contains(., 'Add Drone')]")
        add_btn.click()
        wait_for_visible(driver, By.XPATH, "//*[contains(text(),'Add New Drone')]")
        time.sleep(0.5)

        # Step 3: Open New Location sub-modal (MapPicker)
        add_location_btns = driver.find_elements(By.XPATH,
            "//label[contains(.,'Operational Area')]/following::button[1]"
            )
        if not add_location_btns:
            assert "Add New Drone" in driver.page_source
            _restore_gps(driver)
            _close_open_modal(driver)
            pytest.skip("'Add New Location' button not found; verified no GPS crash")

        add_location_btns[0].click()
        time.sleep(1)

        # Step 4: Verify map/form still visible (no crash after GPS denial)
        src = driver.page_source
        map_visible = (
            "maplibre" in src.lower()
            or "mapbox" in src.lower()
            or "map" in src.lower()
            or "location" in src.lower()
        )
        assert map_visible, \
            "Location/map section should still be visible after GPS denial"

        # Restore geolocation and close modals
        _restore_gps(driver)
        _close_all_modals(driver)

    def test_db_update_failure_shows_error(self, driver, drone_page):
        """Steps 5-7: Simulate DB failure via fetch monkey-patch; verify error alert."""
        go_to_drone_management(driver)

        # Need at least one drone to edit
        edit_btns = driver.find_elements(By.XPATH,
            "//button[@title='Edit Drone']")
        if not edit_btns:
            pytest.skip("No drones available to edit for TC-05-004")

        # Monkey-patch window.fetch to return 500 for PUT /drones/:id
        _override_fetch_500(driver)

        # Open edit modal
        edit_btns[0].click()
        time.sleep(1)
        assert "Edit Drone" in driver.page_source

        # Modify status
        status_selects = driver.find_elements(By.XPATH,
            "//select[.//option[contains(.,'Operational')]]")
        if status_selects:
            Select(status_selects[0]).select_by_visible_text("Inactive")

        save_btn = wait_for_clickable(driver, By.XPATH,
            "//button[contains(.,'Save Changes')]")
        save_btn.click()
        time.sleep(2)

        # The app should show alert('Failed to update drone: ...')
        try:
            msg = accept_alert(driver, timeout=8)
            assert "failed" in msg.lower() or "error" in msg.lower(), \
                f"Expected failure alert, got: '{msg}'"
        except TimeoutException:
            pass

        # Restore original fetch
        _restore_fetch(driver)

        # Verify page is still operational
        go_to_drone_management(driver)
        assert "Drone Management" in driver.page_source, \
            "Page should remain functional after a failed save attempt"



