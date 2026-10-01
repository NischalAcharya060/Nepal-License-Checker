// src/utils/sanitize.ts

// Devanagari (Nepali) digit to ASCII digit map
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
}

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
}

/**
 * Converts Devanagari numerals (०, १, २, etc.) to Western ASCII digits (0, 1, 2, etc.)
 */
export function devanagariToAsciiDigits(input: string): string {
  if (!input) return ''
  return input.replace(/[०-९]/g, (ch) => NEPAL_DIGITS_MAP[ch] || ch)
}

/**
 * Converts Western ASCII digits (0, 1, 2, etc.) to Devanagari numerals (०, १, २, etc.)
 */
export function asciiToDevanagariDigits(input: string): string {
  if (!input) return ''
  return input.replace(/[0-9]/g, (ch) => ASCII_TO_NEPAL_DIGITS_MAP[ch] || ch)
}

/**
 * Cleans user-entered license number:
 * - Converts Devanagari numbers to ASCII
 * - Strips unwanted characters
 * - Normalizes hyphens
 */
export function sanitizeInput(input: string): string {
  if (!input) return ''

  // Convert Devanagari numerals first
  let sanitized = devanagariToAsciiDigits(input)

  // Remove HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '')

  // Remove characters other than digits, letters, and hyphens/spaces
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s-]/g, '')

  // Trim whitespace
  sanitized = sanitized.trim()

  return sanitized
}