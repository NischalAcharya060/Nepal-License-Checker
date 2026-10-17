export interface LicenseData {
  /** Full name of the license holder */
  holder_name: string;
  /** Normalized license number in format XX-XX-XXXXXXXX */
  license_number: string;
  /** Transport office / Yatayat Karyalaya where issued */
  office: string;
  /** Authorized vehicle categories (e.g. "A, B") */
  category: string;
  /** Timestamp when the record was indexed */
  createdAt: string;
  /** Timestamp when the record was last updated */
  updatedAt: string;
}

export interface RateLimitInfo {
  /** Maximum requests allowed in the rate window */
  limit?: number;
  /** Remaining requests in the current window */
  remaining?: number;
  /** Epoch timestamp in seconds when the rate limit window resets */
  reset?: number;
}

export interface CheckLicenseSuccessResult {
  status: 'success';
  /** True if the license has been printed and is ready for pickup */
  isReady: boolean;
  /** License details if found; null if not printed yet */
  data: LicenseData | null;
  /** Informational message from the server */
  message?: string;
  /** HTTP response status code */
  statusCode: number;
  /** Rate limit metadata returned by the server */
  rateLimit?: RateLimitInfo;
}

export interface CheckLicenseErrorResult {
  status: 'error';
  isReady: false;
  data: null;
  /** Error message description */
  error: string;
  /** Seconds to wait before retry if rate-limited (HTTP 429) */
  retryAfter?: number;
  /** HTTP response status code */
  statusCode?: number;
  /** Rate limit metadata returned by the server */
  rateLimit?: RateLimitInfo;
}

export type CheckLicenseResult = CheckLicenseSuccessResult | CheckLicenseErrorResult;

export interface CheckLicenseOptions {
  /**
   * Custom API base URL if self-hosting or testing against local server.
   * Defaults to: "https://license-checker.acharyanischal.com.np/api/license"
   */
  baseUrl?: string;
  /**
   * Developer API Key to unlock higher rate limits (60 req/min).
   * Obtainable from https://license-checker.acharyanischal.com.np/developer
   */
  apiKey?: string;
  /**
   * Optional custom fetch implementation (useful for testing or specific runtimes).
   */
  fetch?: typeof globalThis.fetch;
  /**
   * AbortSignal to cancel the request if needed.
   */
  signal?: AbortSignal;
}
