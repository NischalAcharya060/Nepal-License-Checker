"""
Utility functions for license format validation, Devanagari digit conversion,
and auto-formatting.
"""
import re

NEPALI_TO_ASCII = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
}

ASCII_TO_NEPALI = {v: k for k, v in NEPALI_TO_ASCII.items()}

LICENSE_REGEX = re.compile(r'^\d{2}-\d{2}-\d{8}$')


def devanagari_to_ascii_digits(text: str) -> str:
    """Converts Devanagari numerals (०-९) to ASCII digits (0-9)."""
    if not text:
        return ""
    return "".join(NEPALI_TO_ASCII.get(ch, ch) for ch in text)


def ascii_to_devanagari_digits(text: str) -> str:
    """Converts ASCII digits (0-9) to Devanagari numerals (०-९)."""
    if not text:
        return ""
    return "".join(ASCII_TO_NEPALI.get(ch, ch) for ch in text)


def validate_license_number(license_number: str) -> bool:
    """
    Validates whether a string matches the Nepal driving license format
    XX-XX-XXXXXXXX (12 digits with hyphens), supporting both ASCII and Devanagari.
    """
    if not license_number or not isinstance(license_number, str):
        return False
    normalized = devanagari_to_ascii_digits(license_number).strip().upper()
    return bool(LICENSE_REGEX.match(normalized))


def format_license_number(raw: str) -> str:
    """
    Formats raw numeric digits into the standard XX-XX-XXXXXXXX format.
    E.g., "010112345678" -> "01-01-12345678"
    """
    if not raw or not isinstance(raw, str):
        return ""
    digits = re.sub(r'\D', '', devanagari_to_ascii_digits(raw))[:12]
    parts = []
    if len(digits) > 0:
        parts.append(digits[:2])
    if len(digits) > 2:
        parts.append(digits[2:4])
    if len(digits) > 4:
        parts.append(digits[4:12])
    return "-".join(parts)
