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

## Advanced Options

You can pass options to `checkLicense`:

```typescript
const result = await checkLicense('01-01-12345678', {
  // Use a custom self-hosted API endpoint
  baseUrl: 'https://license-checker.acharyanischal.com.np/api/license',

  // AbortController signal for request timeout
  signal: AbortSignal.timeout(5000),
});
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

## License

MIT © [Nischal Acharya](https://acharyanischal.com.np)
