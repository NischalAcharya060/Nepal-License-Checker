// scripts/test-ocr.js
/* eslint-disable no-console */
require('dotenv').config()
const { devanagariToAsciiDigits } = require('../src/utils/sanitize')
const { validateLicenseNumber, formatLicenseNumber } = require('../src/utils/validation')

async function run() {
  console.log('========================================================')
  console.log('🧪 Testing Nepal Driving License OCR & Dual-Key Pipeline')
  console.log('========================================================\n')

  // Test 1: Devanagari numerals conversion
  console.log('Test 1: Devanagari to ASCII conversion')
  const nepaliSample = '०१-०६-००१२३४५६'
  const converted = devanagariToAsciiDigits(nepaliSample)
  const formatted = formatLicenseNumber(converted)
  const isValid = validateLicenseNumber(formatted)

  console.log(`- Input (Nepali Numerals): ${nepaliSample}`)
  console.log(`- Converted ASCII:         ${converted}`)
  console.log(`- Formatted:               ${formatted}`)
  console.log(`- Valid Nepal DL:          ${isValid ? '✅ PASS' : '❌ FAIL'}`)

  if (!isValid || formatted !== '01-06-00123456') {
    console.error('❌ Test 1 failed')
    process.exit(1)
  }

  // Test 2: Irregular receipt formats (spaces, slashes, raw digits)
  console.log('\nTest 2: Irregular receipt formats & handwritten cleanup')
  const testCases = [
    { raw: '01 06 00123456', expected: '01-06-00123456' },
    { raw: '०१/०६/००१२३४५६', expected: '01-06-00123456' },
    { raw: '010600123456', expected: '01-06-00123456' },
    { raw: 'DL No: ०२-०१-००९८७६५४ (Gandaki)', expected: '02-01-00987654' },
  ]

  testCases.forEach((tc, idx) => {
    const clean = devanagariToAsciiDigits(tc.raw)
    const match = clean.match(/\d{2}[-\s/]?\d{2}[-\s/]?\d{8}/)
    const target = match ? match[0] : clean
    const fmt = formatLicenseNumber(target)
    const valid = validateLicenseNumber(fmt)
    console.log(`  Case ${idx + 1}: "${tc.raw}" -> "${fmt}" (${valid ? '✅ Valid' : '❌ Invalid'})`)
    if (fmt !== tc.expected || !valid) {
      console.error(`❌ Case ${idx + 1} failed! Expected ${tc.expected}, got ${fmt}`)
      process.exit(1)
    }
  })

  // Test 3: Primary Gemini Vision API Integration Check
  console.log('\nTest 3: Primary Gemini Vision API Configuration')
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.log('ℹ️  GEMINI_API_KEY is not set in .env yet.')
  } else {
    console.log('✅ Primary GEMINI_API_KEY detected in environment!')
    console.log('   Testing ultra-fast model (gemini-3.5-flash-lite)...')

    const t0 = Date.now()
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Return JSON: {"test": "ok"}' }] }],
          generationConfig: { response_mime_type: 'application/json' },
        }),
        signal: AbortSignal.timeout(9500),
      })

      const elapsed = Date.now() - t0
      const data = await res.json()
      if (res.ok && data?.candidates?.[0]) {
        console.log(`✅ Primary Gemini API connected successfully in ${elapsed} ms!`)
        console.log(`   Model Engine: ${data.modelVersion || 'gemini-3.5-flash-lite'}`)
      } else {
        console.log(`⚠️ Primary Gemini API responded with status ${res.status}:`, data?.error?.message || data)
      }
    } catch (err) {
      console.log(`⚠️ Connection test error: ${err.message}`)
    }
  }

  // Test 4: Secondary / Backup Gemini Vision API Integration Check
  console.log('\nTest 4: Secondary / Backup Gemini Vision API Configuration')
  const secondaryKey = process.env.GEMINI_API_KEY_SECONDARY
  if (!secondaryKey) {
    console.log('ℹ️  GEMINI_API_KEY_SECONDARY is not set in .env.')
  } else {
    console.log('✅ Secondary GEMINI_API_KEY_SECONDARY detected in environment!')
    console.log('   Testing fallback model (gemini-3.5-flash-lite)...')

    const t0 = Date.now()
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${secondaryKey}`
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': secondaryKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Return JSON: {"test": "ok"}' }] }],
          generationConfig: { response_mime_type: 'application/json' },
        }),
        signal: AbortSignal.timeout(9500),
      })

      const elapsed = Date.now() - t0
      const data = await res.json()
      if (res.ok && data?.candidates?.[0]) {
        console.log(`✅ Secondary Gemini API connected successfully in ${elapsed} ms!`)
        console.log(`   Model Engine: ${data.modelVersion || 'gemini-3.5-flash-lite'}`)
      } else {
        console.log(`⚠️ Secondary Gemini API responded with status ${res.status}:`, data?.error?.message || data)
      }
    } catch (err) {
      console.log(`⚠️ Secondary connection test error: ${err.message}`)
    }
  }

  console.log('\n✨ All OCR verification checks completed successfully!')
}

run()
