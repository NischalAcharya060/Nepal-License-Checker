const NEPAL_DIGITS_MAP: Record<string, string> = {
  '०': '0',
  '१': '1',
  '२': '2',
  '३': '3',
  '४': '4',
  '५': '5',
  '६': '6',
  '७': '7',
  '८': '8',
  '९': '9',
};

const ASCII_TO_NEPAL_DIGITS_MAP: Record<string, string> = {
  '0': '०',
  '1': '१',
  '2': '२',
  '3': '३',
  '4': '४',
  '5': '५',
  '6': '६',
  '7': '७',
  '8': '८',
  '9': '९',
};

/**
 * Converts Devanagari numerals (०, १, २, etc.) to Western ASCII digits (0, 1, 2, etc.)
 */
export function devanagariToAsciiDigits(input: string): string {
  if (!input) return '';
  return input.replace(/[०-९]/g, (ch) => NEPAL_DIGITS_MAP[ch] || ch);
}

/**
 * Converts Western ASCII digits (0, 1, 2, etc.) to Devanagari numerals (०, १, २, etc.)
 */
export function asciiToDevanagariDigits(input: string): string {
  if (!input) return '';
  return input.replace(/[0-9]/g, (ch) => ASCII_TO_NEPAL_DIGITS_MAP[ch] || ch);
}

/**
 * Validates whether a license string matches the XX-XX-XXXXXXXX format.
 * Supports both Western ASCII digits and Nepali Devanagari numerals.
 */
export function validateLicenseNumber(license: string): boolean {
  if (!license || typeof license !== 'string') return false;
  const ascii = devanagariToAsciiDigits(license).trim();
  const regex = /^[0-9]{2}-[0-9]{2}-[0-9]{8}$/;
  return regex.test(ascii);
}

/**
 * Formats a raw or partial license string into XX-XX-XXXXXXXX format.
 * Handles Devanagari numerals, spaces, slashes, and raw digit strings.
 */
export function formatLicenseNumber(license: string): string {
  if (!license || typeof license !== 'string') return '';
  const ascii = devanagariToAsciiDigits(license);
  let digits = ascii.replace(/\D/g, '');
  if (digits.length > 12) {
    digits = digits.slice(0, 12);
  }

  if (digits.length > 4) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
  }
  if (digits.length > 2) {
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }
  return digits;
}
