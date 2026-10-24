<?php

namespace NepalLicenseChecker;

/**
 * Nepal License Checker PHP SDK
 * Zero external dependencies. Works in standard PHP and Laravel.
 */
class LicenseChecker
{
    public const DEFAULT_BASE_URL = 'https://license-checker.acharyanischal.com.np/api/license';

    private const DEVANAGARI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
    private const ASCII_DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

    private ?string $apiKey;
    private string $baseUrl;
    private float $timeout;

    public function __construct(?string $apiKey = null, string $baseUrl = self::DEFAULT_BASE_URL, float $timeout = 10.0)
    {
        $this->apiKey = $apiKey;
        $this->baseUrl = $baseUrl;
        $this->timeout = $timeout;
    }

    /**
     * Static convenience method to check a driving license.
     */
    public static function check(string $licenseNumber, ?string $apiKey = null, array $options = []): array
    {
        $baseUrl = $options['baseUrl'] ?? self::DEFAULT_BASE_URL;
        $timeout = $options['timeout'] ?? 10.0;
        $instance = new self($apiKey, $baseUrl, $timeout);
        return $instance->checkLicense($licenseNumber);
    }

    /**
     * Checks if a driving license is printed and ready for pickup.
     */
    public function checkLicense(string $licenseNumber): array
    {
        if (trim($licenseNumber) === '') {
            return [
                'status' => 'error',
                'is_ready' => false,
                'data' => null,
                'error' => 'License number is required.',
            ];
        }

        $normalized = strtoupper(trim(self::devanagariToAscii($licenseNumber)));

        if (!self::validate($normalized)) {
            return [
                'status' => 'error',
                'is_ready' => false,
                'data' => null,
                'error' => 'Invalid license number format. Expected XX-XX-XXXXXXXX (e.g. 01-01-12345678).',
            ];
        }

        $url = $this->baseUrl . '?number=' . urlencode($normalized);
        $headers = [
            'Accept: application/json',
            'User-Agent: nepal-license-checker-php/1.0.0',
        ];

        if (!empty($this->apiKey)) {
            $headers[] = 'x-api-key: ' . trim($this->apiKey);
        }

        return $this->executeHttpRequest($url, $headers);
    }

    /**
     * Validates license number format (XX-XX-XXXXXXXX), accepting ASCII or Devanagari.
     */
    public static function validate(string $licenseNumber): bool
    {
        $normalized = strtoupper(trim(self::devanagariToAscii($licenseNumber)));
        return (bool) preg_match('/^\d{2}-\d{2}-\d{8}$/', $normalized);
    }

    /**
     * Formats raw digits into XX-XX-XXXXXXXX.
     */
    public static function format(string $raw): string
    {
        $digits = preg_replace('/\D/', '', self::devanagariToAscii($raw));
        $digits = substr($digits, 0, 12);

        $parts = [];
        if (strlen($digits) > 0) {
            $parts[] = substr($digits, 0, 2);
        }
        if (strlen($digits) > 2) {
            $parts[] = substr($digits, 2, 2);
        }
        if (strlen($digits) > 4) {
            $parts[] = substr($digits, 4, 8);
        }

        return implode('-', $parts);
    }

    /**
     * Converts Devanagari numerals (०-९) to ASCII (0-9).
     */
    public static function devanagariToAscii(string $text): string
    {
        return str_replace(self::DEVANAGARI_DIGITS, self::ASCII_DIGITS, $text);
    }

    /**
     * Converts ASCII numerals (0-9) to Devanagari (०-९).
     */
    public static function asciiToDevanagari(string $text): string
    {
        return str_replace(self::ASCII_DIGITS, self::DEVANAGARI_DIGITS, $text);
    }

    private function executeHttpRequest(string $url, array $headers): array
    {
        if (extension_loaded('curl')) {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
            curl_setopt($ch, CURLOPT_HEADER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, $this->timeout);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
            $error = curl_error($ch);
            curl_close($ch);

            if ($response === false) {
                return [
                    'status' => 'error',
                    'is_ready' => false,
                    'data' => null,
                    'error' => 'cURL error: ' . $error,
                ];
            }

            $rawHeaders = substr($response, 0, $headerSize);
            $body = substr($response, $headerSize);
            $rateLimit = $this->parseRateLimitHeaders($rawHeaders);

            $data = json_decode($body, true);
            if (!is_array($data)) {
                return [
                    'status' => 'error',
                    'is_ready' => false,
                    'data' => null,
                    'error' => 'Failed to parse JSON response.',
                    'http_status' => $httpCode,
                ];
            }

            $isReady = ($data['status'] ?? '') === 'success' && !empty($data['data']);

            return [
                'status' => $data['status'] ?? ($httpCode === 200 ? 'success' : 'error'),
                'is_ready' => $isReady,
                'data' => $data['data'] ?? null,
                'rate_limit' => $rateLimit,
                'http_status' => $httpCode,
                'error' => $data['error'] ?? null,
            ];
        }

        // Fallback using stream context (file_get_contents)
        $opts = [
            'http' => [
                'method' => 'GET',
                'header' => implode("\r\n", $headers),
                'timeout' => $this->timeout,
                'ignore_errors' => true,
            ],
        ];

        $context = stream_context_create($opts);
        $body = @file_get_contents($url, false, $context);

        if ($body === false) {
            return [
                'status' => 'error',
                'is_ready' => false,
                'data' => null,
                'error' => 'Connection to license verification server failed.',
            ];
        }

        $data = json_decode($body, true) ?: [];
        $isReady = ($data['status'] ?? '') === 'success' && !empty($data['data']);

        return [
            'status' => $data['status'] ?? 'success',
            'is_ready' => $isReady,
            'data' => $data['data'] ?? null,
            'error' => $data['error'] ?? null,
        ];
    }

    private function parseRateLimitHeaders(string $rawHeaders): ?array
    {
        $limit = null;
        $remaining = null;
        $reset = null;

        foreach (explode("\r\n", $rawHeaders) as $line) {
            if (stripos($line, 'x-ratelimit-limit:') === 0) {
                $limit = (int) trim(substr($line, 18));
            } elseif (stripos($line, 'x-ratelimit-remaining:') === 0) {
                $remaining = (int) trim(substr($line, 22));
            } elseif (stripos($line, 'x-ratelimit-reset:') === 0) {
                $reset = (int) trim(substr($line, 18));
            }
        }

        if ($limit !== null || $remaining !== null || $reset !== null) {
            return [
                'limit' => $limit,
                'remaining' => $remaining,
                'reset' => $reset,
            ];
        }

        return null;
    }
}
