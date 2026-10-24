import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from nepal_license_checker import (
    validate_license_number,
    format_license_number,
    devanagari_to_ascii_digits,
    ascii_to_devanagari_digits,
    check_license,
)


class TestNepalLicenseChecker(unittest.TestCase):
    def test_devanagari_conversion(self):
        self.assertEqual(devanagari_to_ascii_digits("०१-०२-१२३४५६७८"), "01-02-12345678")
        self.assertEqual(ascii_to_devanagari_digits("01-02-12345678"), "०१-०२-१२३४५६७८")

    def test_validation(self):
        self.assertTrue(validate_license_number("01-01-12345678"))
        self.assertTrue(validate_license_number("०१-०१-१२३४५६७८"))
        self.assertFalse(validate_license_number("12-34-5678"))
        self.assertFalse(validate_license_number(""))

    def test_formatting(self):
        self.assertEqual(format_license_number("010112345678"), "01-01-12345678")
        self.assertEqual(format_license_number("०१०११२३४५६७८"), "01-01-12345678")
        self.assertEqual(format_license_number("0101"), "01-01")

    def test_invalid_license_rejected_locally(self):
        result = check_license("invalid-number")
        self.assertEqual(result["status"], "error")
        self.assertFalse(result["is_ready"])
        self.assertIn("Invalid license number format", result["error"])


if __name__ == "__main__":
    unittest.main()
