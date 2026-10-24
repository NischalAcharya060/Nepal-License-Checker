<?php

namespace NepalLicenseChecker\Laravel\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * @method static array checkLicense(string $licenseNumber)
 * @method static array check(string $licenseNumber, ?string $apiKey = null, array $options = [])
 * @method static bool validate(string $licenseNumber)
 * @method static string format(string $raw)
 * @method static string devanagariToAscii(string $text)
 * @method static string asciiToDevanagari(string $text)
 *
 * @see \NepalLicenseChecker\LicenseChecker
 */
class LicenseChecker extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return 'nepal-license-checker';
    }
}
