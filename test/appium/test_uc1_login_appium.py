"""UC-1 Login Account tests for the Android mobile app via Appium."""

from __future__ import annotations

import pytest

from conftest import (
    TEST_ADMIN_EMAIL,
    TEST_ADMIN_PASSWORD,
    TEST_MOBILE_EMAIL,
    TEST_MOBILE_PASSWORD,
    edit_texts,
    fill_edit_texts,
    is_text_visible,
    login_with_credentials,
    tap_text,
    wait_for_text,
)


@pytest.mark.uc1
@pytest.mark.appium
def test_tc01_01_login_screen_shows_required_controls(login_screen):
    """UC-1 precondition and steps 1-3: login page exposes email, password, and Sign In."""
    driver = login_screen

    assert is_text_visible(driver, "Welcome Back", timeout=10)
    assert is_text_visible(driver, "Email Address", timeout=10)
    assert is_text_visible(driver, "Password", timeout=10)
    assert is_text_visible(driver, "Forgot Password?", timeout=10)
    assert is_text_visible(driver, "Sign In", timeout=10)
    assert len(edit_texts(driver, minimum=2)) >= 2


@pytest.mark.uc1
@pytest.mark.appium
def test_tc01_02_empty_login_requires_email_and_password(login_screen):
    """UC-1 validation: submitting without credentials displays a required-fields error."""
    driver = login_screen

    tap_text(driver, "Sign In")

    assert is_text_visible(driver, "Email and password are required", timeout=10)
    assert is_text_visible(driver, "Welcome Back", timeout=5)


@pytest.mark.uc1
@pytest.mark.appium
def test_tc01_03_invalid_credentials_keep_user_on_login(login_screen):
    """UC-1 exception flow: invalid credentials are rejected without opening Dashboard."""
    driver = login_screen

    fill_edit_texts(driver, ["wrong.user@example.com", "WrongPass1!"])
    tap_text(driver, "Sign In")

    assert is_text_visible(driver, "Invalid credentials", timeout=10)
    assert is_text_visible(driver, "Welcome Back", timeout=5)


@pytest.mark.uc1
@pytest.mark.appium
def test_tc01_04_valid_mobile_user_logs_in_to_dashboard(login_screen):
    """UC-1 basic flow: a valid mobile user is redirected to Dashboard."""
    driver = login_screen

    login_with_credentials(driver, TEST_MOBILE_EMAIL, TEST_MOBILE_PASSWORD)

    wait_for_text(driver, "Dashboard", timeout=35)
    assert is_text_visible(driver, "Dashboard", timeout=10)


@pytest.mark.uc1
@pytest.mark.appium
def test_tc01_05_admin_account_is_rejected_in_mobile_app(login_screen):
    """UC-1 role validation: admin credentials cannot enter through the mobile app."""
    driver = login_screen

    login_with_credentials(driver, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD)

    assert is_text_visible(driver, "Admin users cannot log in through the mobile app", timeout=15)
    assert is_text_visible(driver, "Welcome Back", timeout=5)
