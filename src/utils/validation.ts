// src/utils/validation.ts
import { devanagariToAsciiDigits } from './sanitize'

export function validateLicenseNumber(license: string): boolean {
  if (!license) return false
  const ascii = devanagariToAsciiDigits(license).trim()
  const regex = /^[0-9]{2}-[0-9]{2}-[0-9]{8}$/
  return regex.test(ascii)
}

/**
 * Formats a raw license string into XX-XX-XXXXXXXX:
 * Handles Devanagari numerals, spaces, slashes, and raw 12-digit strings.
 */
export function formatLicenseNumber(license: string): string {
  if (!license) return ''
  // Convert any Nepali numerals to ASCII digits
  const ascii = devanagariToAsciiDigits(license)
  // Extract only digits
  let digits = ascii.replace(/\D/g, '')
  if (digits.length > 12) {
    digits = digits.slice(0, 12)
  }

  if (digits.length > 4) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`
  }
  if (digits.length > 2) {
    return `${digits.slice(0, 2)}-${digits.slice(2)}`
  }
  return digits
}