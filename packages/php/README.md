# Nepal License Checker (PHP & Laravel SDK)

Official zero-dependency PHP & Laravel client SDK to check Nepal smart driving license print status via the mirrored Department of Transport Management (DOTM) database API.

Works on **PHP 8.0+** with zero external dependencies. Includes native **Laravel auto-discovery** and Facade support.

---

## Installation

```bash
composer require nepal-license-checker/nepal-license-checker
```

---

## Pure PHP Usage

```php
use NepalLicenseChecker\LicenseChecker;

// 1. Basic check
$result = LicenseChecker::check('01-01-12345678');

if ($result['is_ready']) {
    echo "License is printed for: " . $result['data']['holder_name'] . "\n";
    echo "Office: " . $result['data']['office'] . "\n";
} else {
    echo "License is not printed yet.\n";
}

// 2. With Developer API Key (60 requests/min elevated quota)
$result = LicenseChecker::check('01-01-12345678', 'nlc_live_your_api_key_here');

if (isset($result['rate_limit'])) {
    echo "Remaining quota: " . $result['rate_limit']['remaining'] . "\n";
}
```

---

## Laravel Integration

The package automatically registers via Laravel Package Discovery.

### Configuration (`config/services.php`)

```php
'nepal_license' => [
    'api_key' => env('NEPAL_LICENSE_API_KEY'),
    'timeout' => 10.0,
],
```

Add your key to `.env`:
```env
NEPAL_LICENSE_API_KEY=nlc_live_your_api_key_here
```

### In Controllers / Jobs

```php
use NepalLicenseChecker\Laravel\Facades\LicenseChecker;

class LicenseVerificationController extends Controller
{
    public function verify(Request $request)
    {
        $request->validate([
            'license_number' => 'required|string',
        ]);

        $res = LicenseChecker::checkLicense($request->license_number);

        if ($res['is_ready']) {
            return response()->json([
                'status' => 'verified',
                'holder' => $res['data']['holder_name'],
                'office' => $res['data']['office'],
            ]);
        }

        return response()->json([
            'status' => 'pending',
            'message' => 'License card not printed yet.',
        ], 404);
    }
}
```

---

## Offline Helper Utilities

```php
use NepalLicenseChecker\LicenseChecker;

// Format validation (supports Devanagari numerals)
LicenseChecker::validate('01-01-12345678'); // true
LicenseChecker::validate('०१-०१-१२३४५६७८'); // true
LicenseChecker::validate('12345');          // false

// Auto-formatting raw digits
LicenseChecker::format('010112345678');     // "01-01-12345678"

// Devanagari digit conversion
LicenseChecker::devanagariToAscii('०१-०२'); // "01-02"
LicenseChecker::asciiToDevanagari('01-02'); // "०१-०२"
```

---

## License

MIT © [Nischal Acharya](https://acharyanischal.com.np)
