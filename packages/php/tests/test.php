<?php

require_once __DIR__ . '/../src/LicenseChecker.php';

use NepalLicenseChecker\LicenseChecker;

// 1. Test Devanagari conversion
assert(LicenseChecker::devanagariToAscii('०१-०२-१२३४५६७८') === '01-02-12345678', 'Devanagari to ASCII failed');
assert(LicenseChecker::asciiToDevanagari('01-02-12345678') === '०१-०२-१२३४५६७८', 'ASCII to Devanagari failed');

// 2. Test validation
assert(LicenseChecker::validate('01-01-12345678') === true, 'Validation of valid number failed');
assert(LicenseChecker::validate('०१-०१-१२३४५६७८') === true, 'Validation of Devanagari number failed');
assert(LicenseChecker::validate('12-34-5678') === false, 'Invalid format unexpectedly passed');
assert(LicenseChecker::validate('') === false, 'Empty string unexpectedly passed');

// 3. Test formatting
assert(LicenseChecker::format('010112345678') === '01-01-12345678', 'Formatting raw number failed');
assert(LicenseChecker::format('०१०११२३४५६७८') === '01-01-12345678', 'Formatting Devanagari raw failed');
assert(LicenseChecker::format('0101') === '01-01', 'Formatting partial number failed');

// 4. Test invalid license rejection locally without network
$res = LicenseChecker::check('invalid');
assert($res['status'] === 'error', 'Status should be error');
assert($res['is_ready'] === false, 'is_ready should be false');
assert(str_contains($res['error'], 'Invalid license number format'), 'Error message mismatch');

echo "All PHP SDK tests passed successfully!\n";
