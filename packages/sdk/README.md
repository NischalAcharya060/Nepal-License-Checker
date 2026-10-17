# Nepal License Checker 🇳🇵

[![npm version](https://img.shields.io/npm/v/nepal-license-checker.svg)](https://www.npmjs.com/package/nepal-license-checker)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Official, zero-dependency JavaScript and TypeScript SDK for checking Nepal smart driving license print status via the mirrored [Department of Transport Management (DOTM)](https://dotm.gov.np) records.

- ⚡ **Zero dependencies** — uses native `fetch` (works in Node.js 18+, Bun, Deno, Next.js, React, Vue, Vite, React Native, and browsers).
- 🇳🇵 **Devanagari numeral support** — accepts both English (`0-9`) and Nepali (`०-९`) numbers seamlessly.
- 🛡️ **Built-in validation & formatting** — easily format and validate license numbers before querying.
- 📦 **Dual ESM & CommonJS** — full TypeScript definitions (`.d.ts`) included out of the box.

---

## Installation

### Option 1: npm Registry (Recommended)

```bash
npm install nepal-license-checker
# or
yarn add nepal-license-checker
# or
pnpm add nepal-license-checker
```

### Option 2: GitHub Packages

```bash
npm install @nischalacharya060/nepal-license-checker
```

If needed, add the following to your project's `.npmrc`:
```ini
@nischalacharya060:registry=https://npm.pkg.github.com
```

---

## Quickstart

### ES Modules / TypeScript

```typescript
import { checkLicense } from 'nepal-license-checker';

async function main() {
  const result = await checkLicense('01-01-12345678');

  if (result.status === 'success') {
    if (result.isReady && result.data) {
      console.log('🎉 License is printed and ready for pickup!');
      console.log(`Holder Name: ${result.data.holder_name}`);
      console.log(`Office:      ${result.data.office}`);
      console.log(`Categories:  ${result.data.category}`);
    } else {
      console.log('⏳ License is not printed yet.');
    }
  } else {
    console.error('Error:', result.error);
  }
}

main();
```

### CommonJS (Node.js)

```javascript
const { checkLicense } = require('nepal-license-checker');

checkLicense('०१-०१-१२३४५६७८').then((res) => {
  console.log(res);
});
```

---

## Utility Functions

The package also exports helpful offline utility functions:

### 1. `validateLicenseNumber(license)`
Checks if a string is a valid Nepal driving license format (`XX-XX-XXXXXXXX`). Supports Nepali Devanagari numerals.

```typescript
import { validateLicenseNumber } from 'nepal-license-checker';

validateLicenseNumber('01-01-12345678'); // true
validateLicenseNumber('०१-०१-१२३४५६७८'); // true
validateLicenseNumber('12345');          // false
```

### 2. `formatLicenseNumber(input)`
Auto-formats raw digits into `XX-XX-XXXXXXXX` format (useful for input masking in forms).

```typescript
import { formatLicenseNumber } from 'nepal-license-checker';

formatLicenseNumber('010112345678'); // '01-01-12345678'
formatLicenseNumber('०१०११२३४५६७८'); // '01-01-12345678'
```

### 3. `devanagariToAsciiDigits(input)` / `asciiToDevanagariDigits(input)`
Converts between Nepali Devanagari numerals (`०-९`) and Western ASCII digits (`0-9`).

```typescript
import { devanagariToAsciiDigits, asciiToDevanagariDigits } from 'nepal-license-checker';

devanagariToAsciiDigits('०१-०१-१२३४५६७८'); // '01-01-12345678'
asciiToDevanagariDigits('01-01-12345678'); // '०१-०१-१२३४५६७८'
```

---

## Advanced Options & Rate Limits

By default, anonymous queries are limited to 15 searches per minute per IP. Authenticated developers can generate an API key at [https://license-checker.acharyanischal.com.np/developer](https://license-checker.acharyanischal.com.np/developer) to unlock **60 requests per minute**.

```typescript
const result = await checkLicense('01-01-12345678', {
  // Pass Developer API Key for elevated rate limits (60 req/min)
  apiKey: 'nlc_live_your_api_key_here',

  // Use a custom self-hosted API endpoint (optional)
  baseUrl: 'https://license-checker.acharyanischal.com.np/api/license',

  // AbortController signal for request timeout (optional)
  signal: AbortSignal.timeout(5000),
});

// Access rate limit metadata returned by the server:
console.log('Limit:', result.rateLimit?.limit);         // e.g. 60
console.log('Remaining:', result.rateLimit?.remaining); // e.g. 59
console.log('Reset:', result.rateLimit?.reset);
```

---

## TypeScript Types

```typescript
export interface LicenseData {
  holder_name: string;
  license_number: string;
  office: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export type CheckLicenseResult =
  | {
      status: 'success';
      isReady: boolean;
      data: LicenseData | null;
      message?: string;
      statusCode: number;
    }
  | {
      status: 'error';
      isReady: false;
      data: null;
      error: string;
      retryAfter?: number;
      statusCode?: number;
    };
```

---

## Direct HTTP REST API (Non-JavaScript Languages)

If you are building services in **Python, Go, PHP, Rust, Java, Dart/Flutter**, or shell scripts, you can query the mirrored REST API directly without using the npm package:

### Base URL
```http
GET https://license-checker.acharyanischal.com.np/api/license?number={license_number}
```

### Query Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `number` | `string` | **Yes** | Nepal driving license number in `XX-XX-XXXXXXXX` format (supports ASCII `0-9` and Devanagari `०-९` digits). |

### Authentication & Headers
| Header | Type | Required | Description |
|---|---|---|---|
| `x-api-key` | `string` | Optional | Developer API key for **60 requests/min** quota (obtain free at the [Developer Portal](https://license-checker.acharyanischal.com.np/developer)). |
| `Authorization` | `string` | Optional | Alternative format: `Bearer <your_api_key>`. |
| `Accept` | `string` | Optional | `application/json` |

> **Note:** Anonymous requests without an API key are rate-limited to 15 requests/minute per IP with a 5-minute lockout penalty on breach. Supplying an API key elevates your limit to **60 requests/minute** with **0s lockout penalty**.

### Code Examples

#### cURL
```bash
curl -H "x-api-key: nlc_live_your_api_key_here" \
  "https://license-checker.acharyanischal.com.np/api/license?number=01-01-12345678"
```

#### Python (`requests`)
```python
import requests

api_url = "https://license-checker.acharyanischal.com.np/api/license"
headers = {"x-api-key": "nlc_live_your_api_key_here"}
params = {"number": "01-01-12345678"}

response = requests.get(api_url, params=params, headers=headers)
data = response.json()

if data.get("isReady"):
    print(f"🎉 Ready for pickup!")
    print(f"Holder:  {data['data']['holder_name']}")
    print(f"Office:  {data['data']['office']}")
    print(f"Category: {data['data']['category']}")
else:
    print("⏳ License is not printed yet.")
```

#### Go
```go
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

func main() {
	url := "https://license-checker.acharyanischal.com.np/api/license?number=01-01-12345678"
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("x-api-key", "nlc_live_your_api_key_here")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body))
}
```

#### PHP
```php
<?php
$licenseNumber = '01-01-12345678';
$apiKey = 'nlc_live_your_api_key_here';

$ch = curl_init("https://license-checker.acharyanischal.com.np/api/license?number=" . urlencode($licenseNumber));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "x-api-key: {$apiKey}",
    "Accept: application/json"
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
if (!empty($data['isReady'])) {
    echo "Ready: " . $data['data']['holder_name'] . " (" . $data['data']['office'] . ")\n";
} else {
    echo "Not ready yet.\n";
}
```

### HTTP Rate Limit Headers
Every API response mirrors standard RFC rate limit headers:
- `X-RateLimit-Limit`: Maximum requests allowed per 60-second sliding window (`60` for authenticated keys, `15` for anonymous).
- `X-RateLimit-Remaining`: Remaining request quota in the current window.
- `X-RateLimit-Reset`: Unix epoch timestamp when the current window resets.
- `Retry-After`: Returned with HTTP `429 Too Many Requests` indicating how many seconds to back off before retrying.

### JSON Response Formats

#### 1. Printed & Ready (`200 OK`)
```json
{
  "status": "success",
  "isReady": true,
  "data": {
    "holder_name": "RAM BAHADUR SHRESTHA",
    "license_number": "01-01-12345678",
    "office": "Yatayat Karyalaya, Ekantakuna, Lalitpur",
    "category": "A, B",
    "createdAt": "2024-01-15T08:30:00.000Z",
    "updatedAt": "2026-10-15T12:00:00.000Z"
  },
  "message": "License is printed and ready for collection.",
  "statusCode": 200
}
```

#### 2. Not Printed Yet (`200 OK`)
```json
{
  "status": "success",
  "isReady": false,
  "data": null,
  "message": "License is not printed yet or not found in official DOTM records.",
  "statusCode": 200
}
```

#### 3. Rate Limit Exceeded (`429 Too Many Requests`)
```json
{
  "status": "error",
  "isReady": false,
  "data": null,
  "error": "Rate limit exceeded. Please retry in 35 seconds.",
  "retryAfter": 35,
  "statusCode": 429
}
```

---

## License

MIT © [Nischal Acharya](https://acharyanischal.com.np)

