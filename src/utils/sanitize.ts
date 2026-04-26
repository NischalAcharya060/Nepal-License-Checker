// src/utils/sanitize.ts
export function sanitizeInput(input: string): string {
    if (!input) return '';

    // Remove HTML tags
    let sanitized = input.replace(/<[^>]*>/g, '');

    // Remove special characters
    sanitized = sanitized.replace(/[^\w\s-]/g, '');

    // Trim whitespace
    sanitized = sanitized.trim();

    // Convert to uppercase for license numbers
    if (sanitized.match(/^\d{2}-\d{2}-\d{8}$/)) {
        sanitized = sanitized.toUpperCase();
    }

    return sanitized;
}