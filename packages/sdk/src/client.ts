import { CheckLicenseOptions, CheckLicenseResult } from './types';
import { devanagariToAsciiDigits, validateLicenseNumber } from './utils';

export const DEFAULT_API_BASE_URL = 'https://license-checker.acharyanischal.com.np/api/license';

/**
 * Checks whether a Nepal driving license is printed and ready for collection.
 *
 * @param licenseNumber License number in XX-XX-XXXXXXXX format (supports English or Nepali digits)
 * @param options Optional configuration (baseUrl, signal, custom fetch)
 * @returns Object indicating status, isReady boolean, and license details
 *
 * @example
 * ```ts
 * import { checkLicense } from 'nepal-license-checker';
 *
 * const res = await checkLicense('01-01-12345678');
 * if (res.isReady) {
 *   console.log('License ready for:', res.data?.holder_name);
 * } else {
 *   console.log('Not ready yet.');
 * }
 * ```
 */
export async function checkLicense(
  licenseNumber: string,
  options?: CheckLicenseOptions
): Promise<CheckLicenseResult> {
  if (!licenseNumber || typeof licenseNumber !== 'string') {
    return {
      status: 'error',
      isReady: false,
      data: null,
      error: 'License number is required and must be a string.',
    };
  }

  // Normalize Devanagari numerals to ASCII and uppercase
  const normalizedNumber = devanagariToAsciiDigits(licenseNumber).trim().toUpperCase();

  // Validate format
  if (!validateLicenseNumber(normalizedNumber)) {
    return {
      status: 'error',
      isReady: false,
      data: null,
      error: 'Invalid license number format. Expected XX-XX-XXXXXXXX (e.g. 01-01-12345678).',
    };
  }

  const baseUrl = options?.baseUrl || DEFAULT_API_BASE_URL;
  const fetchFn = options?.fetch || globalThis.fetch;

  if (typeof fetchFn !== 'function') {
    return {
      status: 'error',
      isReady: false,
      data: null,
      error: 'Global fetch is not available in this environment. Please provide a custom fetch implementation in options.',
    };
  }

  try {
    const url = new URL(baseUrl);
    url.searchParams.set('number', normalizedNumber);

    const res = await fetchFn(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: options?.signal,
    });

    const json = (await res.json().catch(() => null)) as {
      status?: string;
      data?: import('./types').LicenseData | null;
      message?: string;
      error?: string;
      retryAfter?: number;
    } | null;

    if (res.status === 429) {
      return {
        status: 'error',
        isReady: false,
        data: null,
        error: json?.error || 'Rate limit exceeded. Please wait before retrying.',
        retryAfter: json?.retryAfter,
        statusCode: 429,
      };
    }

    if (!res.ok) {
      return {
        status: 'error',
        isReady: false,
        data: null,
        error: json?.error || `Request failed with status ${res.status}`,
        statusCode: res.status,
      };
    }

    const isReady = Boolean(json?.data);

    return {
      status: 'success',
      isReady,
      data: json?.data || null,
      message: json?.message,
      statusCode: res.status,
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        status: 'error',
        isReady: false,
        data: null,
        error: 'Request was aborted.',
      };
    }

    const message = error instanceof Error ? error.message : 'Failed to fetch license data.';
    return {
      status: 'error',
      isReady: false,
      data: null,
      error: message,
    };
  }
}
