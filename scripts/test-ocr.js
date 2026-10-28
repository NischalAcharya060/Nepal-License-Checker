// scripts/test-ocr.js
/* eslint-disable no-console */
require('dotenv').config()
const { devanagariToAsciiDigits } = require('../src/utils/sanitize')
const { validateLicenseNumber, formatLicenseNumber } = require('../src/utils/validation')

async function run() {
  console.log('========================================================')
  console.log('🧪 Testing Nepal Driving License OCR & Option B Pipeline')
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

  // Test 3: Gemini Vision API Integration Check
  console.log('\nTest 3: Gemini Vision API Configuration')
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.log('ℹ️  GEMINI_API_KEY is not set in .env yet.')
  } else {
    console.log('✅ GEMINI_API_KEY detected in environment!')
    console.log('   Testing ultra-fast models (gemini-3.5-flash-lite / gemini-flash-lite-latest)...')

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
        console.log(`✅ Gemini API connected successfully in ${elapsed} ms!`)
        console.log(`   Model Engine: ${data.modelVersion || 'gemini-3.5-flash-lite'}`)
      } else {
        console.log(`⚠️ Gemini API responded with status ${res.status}:`, data)
      }
    } catch (err) {
      console.log(`⚠️ Connection test error: ${err.message}`)
    }
  }

  console.log('\n✨ All OCR verification checks completed successfully!')
}

run()
