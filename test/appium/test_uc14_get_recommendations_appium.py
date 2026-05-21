"""UC-14 Get Recommendations tests for the Android mobile app via Appium.

Prerequisites:
- Android emulator is running.
- Appium server is running with the UiAutomator2 driver.
- The DengueEye Android app/development build is installed on the emulator.
- server-api is running and reachable from the emulator.
"""

from __future__ import annotations

import pytest

from conftest import (
    expanded_details_probe,
    is_text_visible,
    open_action_tab,
    open_recommendations_for_risk,
    scroll_to_text,
    tap_text,
)


@pytest.mark.uc14
@pytest.mark.appium
def test_tc14_01_action_tab_shows_three_risk_categories(logged_in_mobile, recommendations_by_risk):
    """UC-14 steps 1-2: user opens Recommendation/Action and sees all risk categories."""
    driver = logged_in_mobile
    open_action_tab(driver)

    for label in ("High Risk", "Medium Risk", "Low Risk"):
        assert is_text_visible(driver, label, timeout=10)

    for risk, records in recommendations_by_risk.items():
        assert is_text_visible(driver, f"{len(records)} tips", timeout=10), f"{risk} count should match API"


@pytest.mark.uc14
@pytest.mark.appium
@pytest.mark.parametrize("risk,label", [("high", "High Risk"), ("medium", "Medium Risk"), ("low", "Low Risk")])
def test_tc14_02_each_risk_level_displays_recommendation_details(
    logged_in_mobile,
    recommendations_by_risk,
    risk,
    label,
):
    """UC-14 steps 3-5: selecting a risk shows recommendations and expandable details."""
    driver = logged_in_mobile
    open_recommendations_for_risk(driver, label)

    records = recommendations_by_risk[risk]
    first = records[0]

    assert is_text_visible(driver, f"{len(records)} recommendations for {risk} risk", timeout=10)

    try:
        scroll_to_text(driver, first["title"])
    except Exception:
        pass
    tap_text(driver, first["title"])

    assert is_text_visible(driver, expanded_details_probe(first["details"]), timeout=10)
    if first.get("referenceLink"):
        assert is_text_visible(driver, "View Source", timeout=10)


@pytest.mark.uc14
@pytest.mark.appium
def test_tc14_03_user_can_return_to_action_with_bottom_nav(logged_in_mobile):
    """UC-14 alternate flow: user can return to recommendation categories using navigation."""
    driver = logged_in_mobile
    open_recommendations_for_risk(driver, "High Risk")

    tap_text(driver, "Action")
    assert is_text_visible(driver, "Get preventive recommendations", timeout=10)


@pytest.mark.uc14
@pytest.mark.appium
def test_tc14_04_only_one_recommendation_expands_at_a_time(logged_in_mobile, recommendations_by_risk):
    """UC-14 alternate flow: opening another recommendation collapses the previous detail view."""
    driver = logged_in_mobile
    open_recommendations_for_risk(driver, "High Risk")

    first = recommendations_by_risk["high"][0]
    second = recommendations_by_risk["high"][1]
    first_probe = expanded_details_probe(first["details"])
    second_probe = expanded_details_probe(second["details"])

    tap_text(driver, first["title"])
    assert is_text_visible(driver, first_probe, timeout=10)

    scroll_to_text(driver, second["title"])
    tap_text(driver, second["title"])
    assert is_text_visible(driver, second_probe, timeout=10)
    assert not is_text_visible(driver, first_probe, timeout=3)


@pytest.mark.uc14
@pytest.mark.appium
def test_tc14_05_recommendation_list_can_scroll_to_last_api_record(logged_in_mobile, recommendations_by_risk):
    """UC-14 main flow: the native list exposes recommendation records beyond the first screen."""
    driver = logged_in_mobile
    open_recommendations_for_risk(driver, "High Risk")

    last = recommendations_by_risk["high"][-1]
    scroll_to_text(driver, last["title"])
    assert is_text_visible(driver, last["title"], timeout=10)


@pytest.mark.uc14
@pytest.mark.appium
def test_tc14_06_action_counts_still_match_after_returning_from_details(logged_in_mobile, recommendations_by_risk):
    """UC-14 consistency: category counts remain API-backed after navigating away and back."""
    driver = logged_in_mobile
    open_recommendations_for_risk(driver, "Low Risk")
    tap_text(driver, "Action")

    for risk, records in recommendations_by_risk.items():
        assert is_text_visible(driver, f"{len(records)} tips", timeout=10), f"{risk} count should still match API"
