# Nepal License Checker (Python SDK)

Official zero-dependency Python SDK to check Nepal smart driving license print status via the mirrored Department of Transport Management (DOTM) database API.

Works on Python 3.8+ with **zero external dependencies** (uses standard library `urllib`).

---

## Installation

```bash
pip install nepal-license-checker
```

---

## Quickstart

```python
from nepal_license_checker import check_license

# Basic usage (supports English or Nepali digits)
result = check_license("01-01-12345678")

if result["is_ready"]:
    print("License is printed and ready for pickup!")
    data = result["data"]
    print(f"Holder: {data.get('holder_name')}")
    print(f"Office: {data.get('office')}")
else:
    print("License is not printed yet.")
```

### With API Key (Elevated 60 req/min limit)

```python
from nepal_license_checker import check_license

result = check_license(
    "01-01-12345678",
    api_key="nlc_live_your_api_key_here"
)

if result["rate_limit"]:
    print(f"Remaining quota: {result['rate_limit']['remaining']}")
```

---

## Offline Utilities

Format and validate license numbers locally without hitting the network:

```python
from nepal_license_checker import (
    validate_license_number,
    format_license_number,
    devanagari_to_ascii_digits,
    ascii_to_devanagari_digits,
)

# Validation (returns True/False)
validate_license_number("01-01-12345678")  # True
validate_license_number("०१-०१-१२३४५६७८")  # True (Devanagari supported!)
validate_license_number("12345")           # False

# Auto-formatting
format_license_number("010112345678")      # "01-01-12345678"

# Devanagari conversion
devanagari_to_ascii_digits("०१-०२-१२३४")   # "01-02-1234"
ascii_to_devanagari_digits("01-02-1234")   # "०१-०२-१२३४"
```

---

## License

MIT © [Nischal Acharya](https://acharyanischal.com.np)
