"""
Client for checking Nepal driving license print status via the DOTM mirrored API.
Zero external dependencies (uses standard library urllib).
"""
import json
import urllib.parse
import urllib.request
from typing import Any, Dict, Optional
from .utils import devanagari_to_ascii_digits, validate_license_number

DEFAULT_API_BASE_URL = "https://license-checker.acharyanischal.com.np/api/license"


def check_license(
    license_number: str,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    timeout: float = 10.0,
) -> Dict[str, Any]:
    """
    Checks whether a Nepal driving license is printed and ready for collection.

    :param license_number: License number in XX-XX-XXXXXXXX format (ASCII or Devanagari)
    :param api_key: Optional API key for elevated rate limits (60 req/min)
    :param base_url: Optional override of the base API URL
    :param timeout: HTTP request timeout in seconds (default: 10.0)
    :return: Dictionary containing 'status', 'is_ready', 'data', 'rate_limit', and optional 'error'
    """
    if not license_number or not isinstance(license_number, str):
        return {
            "status": "error",
            "is_ready": False,
            "data": None,
            "error": "License number is required and must be a string.",
        }

    normalized = devanagari_to_ascii_digits(license_number).strip().upper()

    if not validate_license_number(normalized):
        return {
            "status": "error",
            "is_ready": False,
            "data": None,
            "error": "Invalid license number format. Expected XX-XX-XXXXXXXX (e.g. 01-01-12345678).",
        }

    endpoint = base_url or DEFAULT_API_BASE_URL
    params = urllib.parse.urlencode({"number": normalized})
    request_url = f"{endpoint}?{params}"

    headers = {
        "Accept": "application/json",
        "User-Agent": "nepal-license-checker-python/1.0.0",
    }
    if api_key:
        headers["x-api-key"] = api_key.strip()

    req = urllib.request.Request(request_url, headers=headers, method="GET")

    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            status_code = response.getcode()
            body = response.read().decode("utf-8")
            data = json.loads(body)

            rate_limit = _extract_rate_limit(response.headers)
            is_ready = bool(data.get("data") and data.get("status") == "success")

            return {
                "status": data.get("status", "success"),
                "is_ready": is_ready,
                "data": data.get("data"),
                "rate_limit": rate_limit,
                "http_status": status_code,
            }
    except urllib.error.HTTPError as err:
        try:
            err_body = json.loads(err.read().decode("utf-8"))
        except Exception:
            err_body = {}

        rate_limit = _extract_rate_limit(err.headers)
        error_msg = err_body.get("error") or err_body.get("message") or str(err)

        return {
            "status": "error",
            "is_ready": False,
            "data": None,
            "error": error_msg,
            "rate_limit": rate_limit,
            "http_status": err.code,
        }
    except Exception as exc:
        return {
            "status": "error",
            "is_ready": False,
            "data": None,
            "error": f"Network or connection error: {str(exc)}",
        }


def _extract_rate_limit(headers) -> Optional[Dict[str, Any]]:
    if not headers:
        return None
    limit = headers.get("x-ratelimit-limit")
    remaining = headers.get("x-ratelimit-remaining")
    reset = headers.get("x-ratelimit-reset")

    if limit or remaining or reset:
        return {
            "limit": int(limit) if limit and limit.isdigit() else None,
            "remaining": int(remaining) if remaining and remaining.isdigit() else None,
            "reset": int(reset) if reset and reset.isdigit() else None,
        }
    return None
