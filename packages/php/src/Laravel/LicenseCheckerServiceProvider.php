<?php

namespace NepalLicenseChecker\Laravel;

use Illuminate\Support\ServiceProvider;
use NepalLicenseChecker\LicenseChecker;

class LicenseCheckerServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton('nepal-license-checker', function ($app) {
            $apiKey = config('services.nepal_license.api_key') 
                ?? env('NEPAL_LICENSE_API_KEY');
            $baseUrl = config('services.nepal_license.base_url') 
                ?? env('NEPAL_LICENSE_BASE_URL', LicenseChecker::DEFAULT_BASE_URL);
            $timeout = (float) (config('services.nepal_license.timeout') ?? 10.0);

            return new LicenseChecker($apiKey, $baseUrl, $timeout);
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Publishes configuration if required
    }
}
