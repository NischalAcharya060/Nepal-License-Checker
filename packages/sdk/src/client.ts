import { CheckLicenseOptions, CheckLicenseResult, RateLimitInfo } from './types';
import { devanagariToAsciiDigits, validateLicenseNumber } from './utils';

export const DEFAULT_API_BASE_URL = 'https://license-checker.acharyanischal.com.np/api/license';

/**
 * Checks whether a Nepal driving license is printed and ready for collection.
 *
 * @param licenseNumber License number in XX-XX-XXXXXXXX format (supports English or Nepali digits)
 * @param options Optional configuration (baseUrl, apiKey, signal, custom fetch)
 * @returns Object indicating status, isReady boolean, license details, and rate limit info
 *
 * @example
 * ```ts
 * import { checkLicense } from 'nepal-license-checker';
 *
 * const res = await checkLicense('01-01-12345678', {
 *   apiKey: 'nlc_live_your_key',
 * });
 *
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

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (options?.apiKey) {
      headers['x-api-key'] = options.apiKey;
    }

    const res = await fetchFn(url.toString(), {
      method: 'GET',
      headers,
      signal: options?.signal,
    });

    const json = (await res.json().catch(() => null)) as {
      status?: string;
      data?: import('./types').LicenseData | null;
      message?: string;
      error?: string;
      retryAfter?: number;
    } | null;

    // Helper to safely extract rate limit headers
    const extractRateLimit = (): RateLimitInfo | undefined => {
      try {
        const getHeader = (name: string) => res.headers?.get?.(name);
        const limitStr = getHeader('x-ratelimit-limit');
        const remStr = getHeader('x-ratelimit-remaining');
        const resetStr = getHeader('x-ratelimit-reset');

        if (limitStr || remStr || resetStr) {
          return {
            limit: limitStr ? Number(limitStr) : undefined,
            remaining: remStr ? Number(remStr) : undefined,
            reset: resetStr ? Number(resetStr) : undefined,
          };
        }
      } catch {
        // Headers parsing not supported by custom fetch mock
      }
      return undefined;
    };

    const rateLimit = extractRateLimit();

    let retryAfter = json?.retryAfter;
    if (retryAfter === undefined) {
      try {
        const headerRetry = res.headers?.get?.('retry-after');
        if (headerRetry) retryAfter = Number(headerRetry);
      } catch {
        // ignore
      }
    }

    if (res.status === 429) {
      return {
        status: 'error',
        isReady: false,
        data: null,
        error: json?.error || 'Rate limit exceeded. Please wait before retrying.',
        retryAfter,
        statusCode: 429,
        rateLimit,
      };
    }

    if (!res.ok) {
      return {
        status: 'error',
        isReady: false,
        data: null,
        error: json?.error || `Request failed with status ${res.status}`,
        statusCode: res.status,
        rateLimit,
      };
    }

    const isReady = Boolean(json?.data);

    return {
      status: 'success',
      isReady,
      data: json?.data || null,
      message: json?.message,
      statusCode: res.status,
      rateLimit,
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
