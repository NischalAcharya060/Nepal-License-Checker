// src/utils/validation.ts
export function validateLicenseNumber(license: string): boolean {
    const regex = /^[0-9]{2}-[0-9]{2}-[0-9]{8}$/;
    return regex.test(license);
}

export function formatLicenseNumber(license: string): string {
    // Remove any non-digit characters
    const digits = license.replace(/\D/g, '');

    if (digits.length === 12) {
        return `${digits.slice(0,2)}-${digits.slice(2,4)}-${digits.slice(4,12)}`;
    }

    return license;
}