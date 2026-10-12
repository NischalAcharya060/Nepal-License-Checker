import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  devanagariToAsciiDigits,
  asciiToDevanagariDigits,
  validateLicenseNumber,
  formatLicenseNumber,
  checkLicense,
} from '../dist/index.mjs';

test('devanagariToAsciiDigits converts Nepali digits correctly', () => {
  assert.equal(devanagariToAsciiDigits('०१-०२-१२३४५६७८'), '01-02-12345678');
});

test('asciiToDevanagariDigits converts ASCII digits to Nepali', () => {
  assert.equal(asciiToDevanagariDigits('01-02-12345678'), '०१-०२-१२३४५६७८');
});

test('validateLicenseNumber checks valid and invalid license formats', () => {
  assert.equal(validateLicenseNumber('01-01-12345678'), true);
  assert.equal(validateLicenseNumber('०१-०१-१२३४५६७८'), true);
  assert.equal(validateLicenseNumber('12-34-5678'), false);
  assert.equal(validateLicenseNumber(''), false);
});

test('formatLicenseNumber auto formats raw digits', () => {
  assert.equal(formatLicenseNumber('010112345678'), '01-01-12345678');
  assert.equal(formatLicenseNumber('०१०११२३४५६७८'), '01-01-12345678');
  assert.equal(formatLicenseNumber('0101'), '01-01');
});

test('checkLicense rejects invalid license number locally before fetching', async () => {
  const result = await checkLicense('invalid');
  assert.equal(result.status, 'error');
  assert.equal(result.isReady, false);
  assert.match(result.error, /Invalid license number format/);
});

test('checkLicense fetches with mock fetch successfully', async () => {
  const mockFetch = async (url) => {
    assert.match(url, /01-01-12345678/);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        status: 'success',
        data: {
          holder_name: 'RAM SHARMA',
          license_number: '01-01-12345678',
          office: 'Ekantakuna, Lalitpur',
          category: 'A, B',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      }),
    };
  };

  const result = await checkLicense('01-01-12345678', { fetch: mockFetch });
  assert.equal(result.status, 'success');
  assert.equal(result.isReady, true);
  assert.equal(result.data?.holder_name, 'RAM SHARMA');
});
