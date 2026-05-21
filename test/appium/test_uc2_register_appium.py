"""UC-2 Register Account tests for the Android mobile app via Appium."""

from __future__ import annotations

import time

import pytest

from conftest import (
    edit_texts,
    fill_edit_texts,
    fill_register_form,
    is_text_visible,
    open_register_screen,
    tap_last_text,
    tap_terms_conditions_link,
    tap_text,
    wait_for_text,
)


VALID_PASSWORD = "TestPass1."


def unique_email() -> str:
    return f"uc2.appium.{int(time.time() * 1000)}@example.com"


@pytest.mark.uc2
@pytest.mark.appium
def test_tc02_01_user_can_open_register_from_login(login_screen):
    """UC-2 alternate flow from UC-1: Sign Up opens the registration page."""
    driver = login_screen

    open_register_screen(driver)

    assert is_text_visible(driver, "Create Account", timeout=10)
    assert is_text_visible(driver, "Join DengueEye to stay protected", timeout=10)


@pytest.mark.uc2
@pytest.mark.appium
def test_tc02_02_register_screen_shows_form_and_terms_controls(login_screen):
    """UC-2 precondition and steps 2-6: register form exposes implemented inputs and terms agreement."""
    driver = login_screen

    open_register_screen(driver)

    assert is_text_visible(driver, "Email Address", timeout=10)
    assert is_text_visible(driver, "Password", timeout=10)
    assert is_text_visible(driver, "Confirm Password", timeout=10)
    assert is_text_visible(driver, "Terms & Conditions", timeout=10)
    assert is_text_visible(driver, "Privacy Policy", timeout=10)
    assert len(edit_texts(driver, minimum=3)) >= 3


@pytest.mark.uc2
@pytest.mark.appium
def test_tc02_03_register_requires_all_fields_after_terms_acceptance(login_screen):
    """UC-2 validation: agreed terms alone is not enough to submit registration."""
    driver = login_screen

    open_register_screen(driver)
    tap_text(driver, "I agree")
    tap_last_text(driver, "Create Account")

    assert is_text_visible(driver, "Please fill in all fields", timeout=10)
    assert is_text_visible(driver, "Email is required", timeout=10)


@pytest.mark.uc2
@pytest.mark.appium
def test_tc02_04_invalid_email_is_rejected(login_screen):
    """UC-2 step 8: email format is validated before account creation."""
    driver = login_screen

    open_register_screen(driver)
    fill_edit_texts(driver, ["not-an-email", VALID_PASSWORD, VALID_PASSWORD])
    tap_text(driver, "I agree")
    tap_last_text(driver, "Create Account")

    assert is_text_visible(driver, "Please enter a valid email address", timeout=10)


@pytest.mark.uc2
@pytest.mark.appium
def test_tc02_05_password_mismatch_is_rejected(login_screen):
    """UC-2 step 8: password and confirmation must match."""
    driver = login_screen

    open_register_screen(driver)
    fill_edit_texts(driver, [unique_email(), VALID_PASSWORD, "Different1!"])
    tap_text(driver, "I agree")
    tap_last_text(driver, "Create Account")

    assert is_text_visible(driver, "Passwords do not match", timeout=10)


@pytest.mark.uc2
@pytest.mark.appium
def test_tc02_06_terms_link_opens_terms_page(login_screen):
    """UC-2 exception flow: tapping Terms and Conditions opens the policy page."""
    driver = login_screen

    open_register_screen(driver)
    tap_terms_conditions_link(driver)

    assert is_text_visible(driver, "Terms and Privacy Policy", timeout=10)
    assert is_text_visible(driver, "Terms of Service", timeout=10)
    assert is_text_visible(driver, "Privacy Policy", timeout=10)


@pytest.mark.uc2
@pytest.mark.appium
def test_tc02_07_valid_registration_shows_success_and_returns_to_login(login_screen):
    """UC-2 basic flow: valid registration creates an account and returns to Login."""
    driver = login_screen

    open_register_screen(driver)
    fill_register_form(driver, unique_email(), VALID_PASSWORD)
    tap_text(driver, "I agree")
    tap_last_text(driver, "Create Account")

    wait_for_text(driver, "Registration successful", timeout=25)
    tap_text(driver, "OK")

    assert is_text_visible(driver, "Welcome Back", timeout=15)
