"""Create the local mobile test account used by the Appium conftest.

Run once after the local API/database are ready:
    python appium-conftest/setup_test_account.py
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


THIS_DIR = Path(__file__).resolve().parent
ENV_PATH = THIS_DIR / ".env"

DEFAULT_API_URL = "http://127.0.0.1:4000"
DEFAULT_EMAIL = "appium.user@drone4dengue.local"
DEFAULT_PASSWORD = "TestPass1!"
DEFAULT_COMPANY_ID = "comp-999"


def main() -> int:
    args = parse_args()
    api_url = args.api_url.rstrip("/")

    payload = {
        "email": args.email,
        "password": args.password,
        "name": args.name,
        "username": args.username,
        "companyId": args.company_id,
    }

    status, body = post_json(f"{api_url}/auth/register", payload)
    if 200 <= status < 300:
        print(f"Created mobile test account: {args.email}")
    elif status == 409 and "already" in response_message(body).lower():
        login_status, login_body = post_json(
            f"{api_url}/auth/login",
            {"email": args.email, "password": args.password},
        )
        if not (200 <= login_status < 300):
            print(
                "Account already exists, but login failed with this password.\n"
                f"Choose a different email or update the local DB password. API said: {response_message(login_body)}"
            )
            return 1
        print(f"Mobile test account already exists and login works: {args.email}")
    else:
        print(f"Registration failed with HTTP {status}: {response_message(body)}")
        if "company" in response_message(body).lower():
            print("Tip: seed the local database first so company comp-999 exists.")
        return 1

    update_env(
        ENV_PATH,
        {
            "API_URL": api_url,
            "TEST_MOBILE_EMAIL": args.email,
            "TEST_MOBILE_PASSWORD": args.password,
            "MOBILE_TEST_EMAIL": args.email,
            "MOBILE_TEST_PASSWORD": args.password,
            "TEST_EMAIL": args.email,
            "TEST_PASSWORD": args.password,
        },
    )
    print(f"Updated Appium env file: {ENV_PATH}")
    return 0


def parse_args():
    existing = read_env(ENV_PATH)
    parser = argparse.ArgumentParser(description="Create the Drone4Dengue Appium test account.")
    parser.add_argument("--api-url", default=os.getenv("API_URL") or existing.get("API_URL") or DEFAULT_API_URL)
    parser.add_argument("--email", default=os.getenv("TEST_MOBILE_EMAIL") or existing.get("TEST_MOBILE_EMAIL") or DEFAULT_EMAIL)
    parser.add_argument(
        "--password",
        default=os.getenv("TEST_MOBILE_PASSWORD") or existing.get("TEST_MOBILE_PASSWORD") or DEFAULT_PASSWORD,
    )
    parser.add_argument("--company-id", default=os.getenv("TEST_COMPANY_ID") or existing.get("TEST_COMPANY_ID") or DEFAULT_COMPANY_ID)
    parser.add_argument("--name", default=os.getenv("TEST_MOBILE_NAME") or existing.get("TEST_MOBILE_NAME") or "Appium Test User")
    parser.add_argument("--username", default=os.getenv("TEST_MOBILE_USERNAME") or existing.get("TEST_MOBILE_USERNAME") or "appiumtestuser")
    return parser.parse_args()


def post_json(url: str, payload: dict) -> tuple[int, dict]:
    data = json.dumps(payload).encode("utf-8")
    request = Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=15) as response:
            return response.getcode(), parse_json(response.read())
    except HTTPError as exc:
        return exc.code, parse_json(exc.read())
    except URLError as exc:
        print(f"Cannot reach API at {url}: {exc}")
        print("Start server-api first, then run this script again.")
        raise SystemExit(1) from exc


def parse_json(raw: bytes) -> dict:
    if not raw:
        return {}
    try:
        return json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError:
        return {"message": raw.decode("utf-8", errors="replace")}


def response_message(body: dict) -> str:
    error = body.get("error")
    if isinstance(error, dict):
        return str(error.get("message") or error)
    return str(body.get("message") or error or body)


def read_env(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}

    values: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def update_env(path: Path, updates: dict[str, str]) -> None:
    existing_lines = path.read_text(encoding="utf-8").splitlines() if path.exists() else []
    seen: set[str] = set()
    new_lines: list[str] = []

    for line in existing_lines:
        if "=" not in line or line.lstrip().startswith("#"):
            new_lines.append(line)
            continue

        key = line.split("=", 1)[0].strip()
        if key in updates:
            new_lines.append(f"{key}={updates[key]}")
            seen.add(key)
        else:
            new_lines.append(line)

    for key, value in updates.items():
        if key not in seen:
            new_lines.append(f"{key}={value}")

    path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    raise SystemExit(main())
