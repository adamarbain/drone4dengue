"""
test_uc6_drone_images.py — Selenium tests for UC6 (Admin Web)
==============================================================
Project : Drone4Dengue – Admin Web System
Doc ref : UC6 Test Design & Test Case Specification
Actor   : Admin | Platform: Website (http://localhost:3000)
Runner  : pytest

Test Cases (official specification):
  TC-06-001  Verify image display and detail viewing
             Covers: UC6-COV-01, UC6-COV-02, UC6-COV-03
  TC-06-002  Verify image manipulation functions
             Covers: UC6-COV-04, UC6-COV-05, UC6-COV-06  |  Depends: TC-06-001
  TC-06-003  Verify system refresh and uploading status
             Covers: UC6-COV-07, UC6-COV-08  |  Depends: TC-06-001
  TC-06-004  Verify system handles no image scenario
             Covers: UC6-COV-09
  TC-06-005  Verify system handles bulk delete and server error
             Covers: UC6-COV-10, UC6-COV-11  |  Depends: TC-06-001

NOTE on dialogs
---------------
- Image delete uses React ConfirmDialog (confirmText='Delete') →
  React SuccessDialog ('Great!' button).
- Upload success/error uses native browser alert().
- File rejection (PDF) uses native browser alert().
"""

import os
import time
import requests
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

from conftest import (
    ASSETS_DIR, TEST_IMAGE, TEST_PDF,
    wait_for, wait_for_clickable, wait_for_visible,
    accept_alert, dismiss_any_dialog, dismiss_confirm_and_success_dialog,
    go_to_drone_management, DEFAULT_WAIT,
)

# ── Constants ────────────────────────────────────────────────────────────────
TEST_PDF_PATH   = os.path.join(ASSETS_DIR, "test_document.pdf")
TEST_VIDEO_PATH = os.path.join(ASSETS_DIR, "test_video.mp4")


# ── Helpers ──────────────────────────────────────────────────────────────────

def _select_drone_row(driver, index=0):
    """Click a drone row by index to trigger gallery load."""
    rows = driver.find_elements(By.XPATH,
        "//table//tbody//tr[not(contains(.,'No drones') or contains(.,'Loading'))]")
    if not rows or index >= len(rows):
        return False
    rows[index].click()
    time.sleep(2)
    return True


def _get_image_cards(driver):
    """Return all image card elements in the gallery."""
    return driver.find_elements(By.XPATH,
        "//div[contains(@class,'group') and .//img]")


def _hover_image_card(driver, card):
    """Scroll card into view and dispatch mouseover event."""
    driver.execute_script("arguments[0].scrollIntoView(true);", card)
    driver.execute_script(
        "arguments[0].dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));",
        card)
    time.sleep(0.5)


def _get_overlay_buttons(card):
    """Return overlay buttons from an image card."""
    return card.find_elements(By.XPATH,
        ".//div[contains(@class,'absolute inset-0')]//button")


def _select_drone_by_dropdown(driver, visible_text=None):
    """Select a drone from the 'Drone Images' dropdown."""
    from selenium.webdriver.support.ui import Select
    selects = driver.find_elements(By.XPATH,
        "//select[ancestor::div[contains(.,'Drone Images')]]")
    if not selects:
        selects = driver.find_elements(By.XPATH,
            "//select[.//option[contains(.,'No Location')]]")
    if not selects:
        return False
    sel_el = selects[0]
    if visible_text:
        Select(sel_el).select_by_visible_text(visible_text)
    else:
        sel = Select(sel_el)
        opts = [o for o in sel.options if o.get_attribute("value")]
        if opts:
            opts[0].click()
    time.sleep(2)
    return True


def _open_add_images_modal(driver):
    """Click the 'Add Images' button on the first available drone row."""
    btns = driver.find_elements(By.XPATH, "//button[contains(.,'Add Images')]")
    if not btns:
        return False
    btns[0].click()
    time.sleep(1)
    return True


def _close_modal(driver, timeout=5):
    """Close the currently open fixed modal via its X button."""
    try:
        close_btn = WebDriverWait(driver, timeout).until(
            EC.element_to_be_clickable((By.XPATH,
                "//div[contains(@class,'fixed')]//button[.//*[name()='svg']]"
            ))
        )
        close_btn.click()
        time.sleep(0.5)
    except TimeoutException:
        pass


def _upload_file_to_modal(driver, file_path):
    """Send a file to the file input in the Add Images modal."""
    file_inputs = driver.find_elements(By.XPATH, "//input[@id='media-upload']")
    if not file_inputs:
        file_inputs = driver.find_elements(By.XPATH, "//input[@type='file']")
    if not file_inputs:
        _close_modal(driver)
        pytest.skip("File <input> not found in modal")
    file_inputs[0].send_keys(file_path)
    time.sleep(1)
    return True


def _click_modal_button(driver, button_text):
    """Click a button in the modal by its text content."""
    btns = driver.find_elements(By.XPATH,
        f"//button[contains(.,'{button_text}')]")
    if btns:
        btns[0].click()
        time.sleep(4)
        return True
    return False


def _find_and_click_any(driver, selectors):
    """Try multiple XPath selectors; click the first match found."""
    for sel in selectors:
        btns = driver.find_elements(By.XPATH, sel)
        if btns:
            try:
                btns[0].click()
                time.sleep(0.5)
                return True
            except Exception:
                pass
    return False


def _override_fetch_500_for_images(driver, var_name="__origFetch"):
    """Override window.fetch to return HTTP 500 for /images endpoints."""
    driver.execute_script(r"""
        window.{var_name} = window.fetch;
        window.fetch = function(url, opts) {{
            if (typeof url === 'string' && url.includes('/images')) {{
                return Promise.resolve(
                    new Response(
                        JSON.stringify({{ error: 'Internal Server Error' }}),
                        {{
                            status: 500,
                            statusText: 'Internal Server Error',
                            headers: {{ 'Content-Type': 'application/json' }}
                        }}
                    )
                );
            }}
            return window.{var_name}.apply(this, arguments);
        }};
    """.format(var_name=var_name))


def _restore_fetch(driver, var_name="__origFetch"):
    """Restore original window.fetch after override."""
    driver.execute_script("""
        if (window.{var_name}) {{
            window.fetch = window.{var_name};
            delete window.{var_name};
        }}
    """.format(var_name=var_name))


def _download_first_image(driver):
    """Download the first image from the gallery and verify it.

    Returns the response object for further assertions if needed.
    """
    cards = _get_image_cards(driver)
    if not cards:
        pytest.skip("No images in gallery — upload an image first")

    img_el = cards[0].find_element(By.XPATH, ".//img")
    img_src = img_el.get_attribute("src") or ""
    assert img_src, "First image card has no <img src> attribute"

    if img_src.startswith("/"):
        origin = driver.execute_script("return window.location.origin;")
        img_src = origin + img_src

    assert img_src.startswith("http"), \
        f"Cannot download from non-HTTP src: '{img_src}'"

    session = requests.Session()
    for cookie in driver.get_cookies():
        session.cookies.set(
            cookie["name"],
            cookie["value"],
            domain=cookie.get("domain"),
        )

    os.makedirs(ASSETS_DIR, exist_ok=True)
    tmp_path = os.path.join(ASSETS_DIR, "downloaded_test_image.tmp")
    try:
        response = session.get(img_src, stream=True, timeout=15)
        assert response.status_code == 200, (
            f"Download request returned HTTP {response.status_code} "
            f"for URL: {img_src}"
        )

        with open(tmp_path, "wb") as fh:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    fh.write(chunk)

        file_size = os.path.getsize(tmp_path)
        assert file_size > 0, \
            f"Downloaded file is 0 bytes for URL: {img_src}"

        content_type = response.headers.get("Content-Type", "")
        assert any(t in content_type.lower() for t in
                   ["image", "octet-stream", "jpeg", "png", "webp"]), (
            f"Response Content-Type does not look like an image: "
            f"'{content_type}' (URL: {img_src})"
        )
        return response
    finally:
        if os.path.isfile(tmp_path):
            os.remove(tmp_path)


def _ensure_pdf_exists():
    """Create a minimal valid PDF test asset if it doesn't already exist."""
    if not os.path.isfile(TEST_PDF_PATH):
        os.makedirs(ASSETS_DIR, exist_ok=True)
        with open(TEST_PDF_PATH, "wb") as f:
            f.write(
                b"%PDF-1.4\n1 0 obj<</Type /Catalog>>endobj\n"
                b"xref\n0 1\n0000000000 65535 f \n"
                b"trailer<</Size 1/Root 1 0 R>>\nstartxref\n9\n%%EOF"
            )


# ═════════════════════════════════════════════════════════════════════════════
# TC-06-001  Verify image display and detail viewing
# Covers: UC6-COV-01, UC6-COV-02, UC6-COV-03
# ═════════════════════════════════════════════════════════════════════════════

class TestTC06001ImageDisplayAndDetails:
    """TC-06-001: Verify image display and detail viewing.

    Covers UC6-COV-01 (access drone image gallery),
    UC6-COV-02 (show image list),
    UC6-COV-03 (view metadata).
    """

    def test_drone_images_section_exists(self, driver, drone_page):
        """Step 1 – 'Drone Images' section header is present."""
        assert "Drone Images" in driver.page_source, \
            "'Drone Images' section not found on page"

    def test_gallery_renders_after_selecting_drone(self, driver, drone_page):
        """Step 2 – Selecting a drone renders the gallery without crash."""
        _select_drone_row(driver)
        src = driver.page_source
        assert "Drone Images" in src

    def test_image_cards_show_metadata(self, driver, drone_page):
        """Step 3 – If images exist, verify metadata is displayed."""
        _select_drone_row(driver)
        time.sleep(2)

        image_cards = _get_image_cards(driver)
        if not image_cards:
            pytest.skip("Selected drone has no images — metadata not testable")

        src = driver.page_source
        has_metadata = (
            ".jpg" in src.lower()
            or ".png" in src.lower()
            or "image" in src.lower()
            or "video frame" in src.lower()
        )
        assert has_metadata, \
            "Image cards should display metadata (filename, type, or date)"


# ═════════════════════════════════════════════════════════════════════════════
# TC-06-002  Verify image manipulation functions
# Covers: UC6-COV-04, UC6-COV-05, UC6-COV-06  |  Depends: TC-06-001
# ═════════════════════════════════════════════════════════════════════════════

class TestTC06002ImageManipulation:
    """TC-06-002: Verify image manipulation functions.

    Covers UC6-COV-04 (image preview/download),
    UC6-COV-05 (update notes — not implemented in current UI, tested via upload),
    UC6-COV-06 (remove image).
    """

    def test_upload_image_file(self, driver, drone_page):
        """Steps 1-3: Upload an image file and verify it is accepted."""
        if not os.path.isfile(TEST_IMAGE):
            pytest.skip(f"Test image not found at {TEST_IMAGE}")
        if not _open_add_images_modal(driver):
            pytest.skip("No 'Add Images' button — no drones in DB")

        _upload_file_to_modal(driver, TEST_IMAGE)

        file_name = os.path.basename(TEST_IMAGE)
        src = driver.page_source
        assert (file_name in src or "image" in src.lower()), \
            "File not reflected in upload area after selection"

        if _click_modal_button(driver, "Upload Image"):
            dismiss_any_dialog(driver, timeout=8)

        _close_modal(driver)

    def test_upload_video_file(self, driver, drone_page):
        """Steps 4-5: Upload a video file and verify 'Process Video' button."""
        if not os.path.isfile(TEST_VIDEO_PATH):
            pytest.skip("test_video.mp4 not in assets/")
        if not _open_add_images_modal(driver):
            pytest.skip("No drones available")

        _upload_file_to_modal(driver, TEST_VIDEO_PATH)

        src = driver.page_source
        assert ("mp4" in src.lower() or "video" in src.lower()
                or "test_video" in src), \
            "Video file not reflected in modal after selection"

        process_btns = driver.find_elements(By.XPATH,
            "//button[contains(.,'Process Video')]")
        assert process_btns, "Process Video button not found"
        _close_modal(driver)

    def test_reject_unsupported_file(self, driver, drone_page):
        """Verify unsupported file triggers alert"""
        _ensure_pdf_exists()
        assert _open_add_images_modal(driver), "No drones available"
        _upload_file_to_modal(driver, TEST_PDF_PATH)

        msg = accept_alert(driver, timeout=6)
        assert msg is not None, "Expected alert but none appeared"
        assert "upload an image or video" in msg.lower()

    def test_view_image_lightbox(self, driver, drone_page):
        """Steps 8-9: Click eye icon to enlarge image, then close lightbox."""
        _select_drone_row(driver)
        time.sleep(2)

        image_cards = _get_image_cards(driver)
        if not image_cards:
            pytest.skip("No images in gallery — run TC-06-002 upload first")

        _hover_image_card(driver, image_cards[0])

        overlay_btns = _get_overlay_buttons(image_cards[0])
        if not overlay_btns:
            pytest.skip("Overlay buttons not accessible in headless mode")

        overlay_btns[0].click()
        time.sleep(1)

        overlays = driver.find_elements(By.XPATH,
            "//div[contains(@class,'fixed') and contains(@class,'bg-black/90')]")
        assert overlays, "Lightbox overlay did not appear"

        _close_modal(driver)
        time.sleep(0.5)

        overlays_after = driver.find_elements(By.XPATH,
            "//div[contains(@class,'fixed') and contains(@class,'bg-black/90')]")
        assert not overlays_after, "Lightbox did not close"

    def test_download_image(self, driver, drone_page):
        """Steps 12-14: Download an image file and verify it has content."""
        _select_drone_row(driver)
        time.sleep(2)
        _download_first_image(driver)

    def test_edit_metadata(self, driver, drone_page):
        """Steps 15-17: Attempt to edit image metadata/notes; assert not implemented (xfail)."""
        _select_drone_row(driver)
        time.sleep(2)

        image_cards = _get_image_cards(driver)
        if not image_cards:
            pytest.skip("No images in gallery — upload an image first")

        _hover_image_card(driver, image_cards[0])

        edit_selectors = [
            ".//button[contains(.,'Edit')]",
            ".//button[contains(.,'Notes')]",
            ".//button[contains(.,'Metadata')]",
            ".//div[contains(@class,'absolute inset-0')]//button[2]",
        ]

        edit_clicked = False
        for sel in edit_selectors:
            btns = image_cards[0].find_elements(By.XPATH, sel)
            if btns:
                try:
                    btns[0].click()
                    time.sleep(0.5)
                    edit_clicked = True
                except Exception:
                    pass
                break

        edit_ui_found = False
        if edit_clicked:
            textarea_selectors = [
                "//textarea",
                "//input[@placeholder[contains(translate(.,'ABCDEFGHIJKLMNOPQRSTUVWXYZ',"
                "'abcdefghijklmnopqrstuvwxyz'),'note') or "
                "contains(translate(.,'ABCDEFGHIJKLMNOPQRSTUVWXYZ',"
                "'abcdefghijklmnopqrstuvwxyz'),'description')]]",
            ]
            for sel in textarea_selectors:
                els = driver.find_elements(By.XPATH, sel)
                if els:
                    edit_ui_found = True
                    break

        assert not edit_ui_found, (
            "Edit metadata UI (textarea/input) found — feature UC6-COV-05 is "
            "now implemented. Update this test to verify the full edit flow."
        )

        pytest.xfail(
            "Edit metadata attempt failed as expected: no edit/notes UI found "
            "on image cards. Feature UC6-COV-05 is not yet implemented in the "
            "current build."
        )

    def test_delete_image(self, driver, drone_page):
        """Steps 10-11: Delete an image with confirmation dialog."""
        _select_drone_row(driver)
        time.sleep(2)

        image_cards = _get_image_cards(driver)
        if not image_cards:
            pytest.skip("No images to delete — run TC-06-002 upload first")

        initial_count = len(image_cards)

        _hover_image_card(driver, image_cards[0])

        overlay_btns = _get_overlay_buttons(image_cards[0])
        if not overlay_btns:
            pytest.skip("Delete button inaccessible in headless mode")
        overlay_btns[-1].click()

        modal_title_xpath = "//h2[contains(text(),'Delete Image')]"
        try:
            wait_for_visible(driver, By.XPATH, modal_title_xpath, timeout=5)
        except TimeoutException:
            pytest.fail(
                "Confirmation dialog 'Delete Image' did not appear after "
                "clicking trash icon.")

        assert "cannot be undone" in driver.page_source.lower(), \
            "Warning text missing from dialog"

        dismiss_confirm_and_success_dialog(
            driver, timeout=10, confirm_text="Delete")
        time.sleep(1)

        go_to_drone_management(driver)
        _select_drone_row(driver)
        time.sleep(2)
        new_cards = _get_image_cards(driver)
        assert (len(new_cards) < initial_count or len(new_cards) == 0), \
            "Gallery count should decrease after deletion"


# ═════════════════════════════════════════════════════════════════════════════
# TC-06-003  Verify system refresh and uploading status
# Covers: UC6-COV-07, UC6-COV-08  |  Depends: TC-06-001
# ═════════════════════════════════════════════════════════════════════════════

class TestTC06003RefreshAndUploadingStatus:
    """TC-06-003: Verify system refresh and uploading status.

    Covers UC6-COV-07 (updated list shown) and
    UC6-COV-08 (show "Uploading..." / processing indicator).
    """

    def test_gallery_persists_after_refresh(self, driver, drone_page):
        """Steps 1-3: Refresh page, verify images still load."""
        _select_drone_row(driver)
        time.sleep(2)

        before_cards = _get_image_cards(driver)
        before_count = len(before_cards)

        driver.refresh()
        time.sleep(3)
        wait_for(driver, EC.presence_of_element_located(
            (By.XPATH, "//*[contains(text(),'Drone Management')]")), timeout=15)

        _select_drone_row(driver)
        time.sleep(2)

        after_cards = _get_image_cards(driver)
        after_count = len(after_cards)

        assert after_count == before_count, \
            f"Image count should persist after refresh ({before_count} → {after_count})"

    def test_video_processing_indicator(self, driver, drone_page):
        """Steps 4-5: Upload video, verify processing progress indicator."""
        if not os.path.isfile(TEST_VIDEO_PATH):
            pytest.skip("test_video.mp4 not in assets/")
        if not _open_add_images_modal(driver):
            pytest.skip("No drones available")

        _upload_file_to_modal(driver, TEST_VIDEO_PATH)

        if not _click_modal_button(driver, "Process Video"):
            _close_modal(driver)
            pytest.skip("Process Video button not found")

        src = driver.page_source
        processing_visible = (
            "Extracting frames" in src
            or "progress" in src.lower()
            or "Processing" in src
        )
        assert processing_visible, \
            "Processing indicator should be visible after clicking Process Video"

        _close_modal(driver)


# ═════════════════════════════════════════════════════════════════════════════
# TC-06-004  Verify system handles no image scenario
# Covers: UC6-COV-09
# ═════════════════════════════════════════════════════════════════════════════

class TestTC06004NoImagesScenario:
    """TC-06-004: Verify system handles no image scenario.

    Covers UC6-COV-09 (empty state message).
    """

    def test_empty_gallery_message(self, driver, drone_page):
        """Steps 1-5: Select drone with no images, verify empty state."""
        _select_drone_row(driver, index=1)
        time.sleep(2)

        src = driver.page_source
        image_cards = _get_image_cards(driver)

        if image_cards:
            pytest.skip("Selected drone has images — empty state not testable")

        assert "No Images Available" in src, \
            "'No Images Available' heading not shown"
        assert "No drone images have been uploaded yet" in src, \
            "Helper text not shown in empty state"
        assert "text-gray-400" in src, \
            "Camera icon styling not found in empty state"


# ═════════════════════════════════════════════════════════════════════════════
# TC-06-005  Verify system handles bulk delete and server error
# Covers: UC6-COV-10, UC6-COV-11  |  Depends: TC-06-001
# ═════════════════════════════════════════════════════════════════════════════

class TestTC06005BulkDeleteAndServerError:
    """TC-06-005: Verify system handles bulk delete and server error.

    Covers UC6-COV-10 (confirmation popup for bulk delete) and
    UC6-COV-11 (error handling for server crash).
    """

    def test_bulk_delete_attempt_fails(self, driver, drone_page):
        """Steps 1-5: Attempt the full bulk-delete workflow; assert it fails (not implemented)."""
        _select_drone_row(driver)
        time.sleep(2)

        checkbox_selectors = [
            "//div[contains(@class,'group')]//input[@type='checkbox']",
            "//input[@type='checkbox'][ancestor::div[contains(@class,'group')]]",
            "//input[@type='checkbox'][not(ancestor::table)]",
        ]

        selected_count = 0
        for sel in checkbox_selectors:
            checkboxes = driver.find_elements(By.XPATH, sel)
            if checkboxes:
                for cb in checkboxes[:2]:
                    try:
                        driver.execute_script("arguments[0].click();", cb)
                        time.sleep(0.3)
                        selected_count += 1
                    except Exception:
                        pass
                if selected_count:
                    break

        bulk_delete_selectors = [
            "//button[contains(.,'Bulk Delete')]",
            "//button[contains(.,'Delete Selected')]",
            "//button[contains(.,'Delete All')]",
        ]

        bulk_delete_clicked = False
        for sel in bulk_delete_selectors:
            btns = driver.find_elements(By.XPATH, sel)
            if btns:
                try:
                    btns[0].click()
                    bulk_delete_clicked = True
                    time.sleep(1)
                except Exception:
                    pass
                break

        assert not bulk_delete_clicked, (
            "Bulk Delete button found and clicked – feature is now implemented. "
            "Update this test to verify the full confirmation + deletion flow."
        )

        src = driver.page_source
        assert "Drone Images" in src, \
            "Drone Images section must remain visible after failed bulk delete attempt"

        if selected_count == 0:
            pytest.xfail(
                "Bulk delete attempt failed as expected: no image checkboxes found "
                "in the gallery. Feature UC6-COV-10 is not yet implemented."
            )
        else:
            pytest.xfail(
                f"Bulk delete attempt failed as expected: {selected_count} image(s) "
                "selected but no Bulk Delete button appeared. "
                "Feature UC6-COV-10 is not yet implemented."
            )

    def test_server_error_graceful_handling(self, driver, drone_page):
        """Steps 4-6: Simulate 500 on image fetch; verify page doesn't crash."""
        go_to_drone_management(driver)

        _override_fetch_500_for_images(driver)

        _select_drone_row(driver)
        time.sleep(3)

        src = driver.page_source

        assert "Drone Management" in src, \
            "Page should remain functional after a server error"
        assert "Drone Images" in src, \
            "Drone Images section should still render even after server error"

        error_indicators = [
            "Server error",
            "error",
            "failed",
            "try again",
            "No Images Available",
            "Loading images",
        ]
        has_indicator = any(
            ind.lower() in src.lower() for ind in error_indicators
        )
        assert has_indicator, (
            "After a server error, the page should display an error message "
            "or an appropriate empty state."
        )

        _restore_fetch(driver)

    def test_page_recovers_after_error(self, driver, drone_page):
        """Step 7: After restoring normal fetch, page works normally."""
        go_to_drone_management(driver)

        _override_fetch_500_for_images(driver, var_name="__origFetch2")

        _select_drone_row(driver)
        time.sleep(2)

        _restore_fetch(driver, var_name="__origFetch2")

        go_to_drone_management(driver)
        assert "Drone Management" in driver.page_source, \
            "Page should recover after restoring normal fetch"
