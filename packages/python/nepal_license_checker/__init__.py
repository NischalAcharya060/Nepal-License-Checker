"""
Nepal License Checker Python SDK
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Zero-dependency Python SDK to check Nepal smart driving license print status via the DOTM mirrored API.
"""

from .client import check_license, DEFAULT_API_BASE_URL
from .utils import (
    validate_license_number,
    format_license_number,
    devanagari_to_ascii_digits,
    ascii_to_devanagari_digits,
)

__version__ = "1.0.0"
__all__ = [
    "check_license",
    "validate_license_number",
    "format_license_number",
    "devanagari_to_ascii_digits",
    "ascii_to_devanagari_digits",
    "DEFAULT_API_BASE_URL",
]
