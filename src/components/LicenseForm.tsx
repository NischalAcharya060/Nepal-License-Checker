// src/components/LicenseForm.tsx
'use client'

import { useState, useCallback, useRef } from 'react'
import { validateLicenseNumber } from '@/utils/validation'

interface LicenseFormProps {
    onSubmit: (licenseNumber: string) => Promise<void>
    loading: boolean
}

export default function LicenseForm({ onSubmit, loading }: LicenseFormProps) {
    const [licenseNumber, setLicenseNumber] = useState('')
    const [error, setError] = useState('')
    const debounceTimer = useRef<NodeJS.Timeout | undefined>(undefined)

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.toUpperCase()

        // Auto-format: add hyphens after 2 and 5 characters
        if (value.length === 2 && !value.includes('-')) {
            value = value + '-'
        } else if (value.length === 5 && value[2] === '-' && !value[5]) {
            value = value + '-'
        }

        setLicenseNumber(value)

        // Debounce validation
        if (debounceTimer.current) clearTimeout(debounceTimer.current)
        debounceTimer.current = setTimeout(() => {
            if (value && !validateLicenseNumber(value)) {
                setError('Invalid license number format. Use XX-XX-XXXXXXXX')
            } else {
                setError('')
            }
        }, 300)
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!licenseNumber) {
            setError('Please enter a license number')
            return
        }

        if (!validateLicenseNumber(licenseNumber)) {
            setError('Invalid license number format. Use XX-XX-XXXXXXXX')
            return
        }

        await onSubmit(licenseNumber)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    Driving License Number
                </label>
                <input
                    type="text"
                    id="licenseNumber"
                    value={licenseNumber}
                    onChange={handleInputChange}
                    placeholder="e.g., 01-01-12345678"
                    className={`w-full px-4 py-3 border rounded-lg transition-all duration-200 input-focus
            ${error ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-primary'}`}
                    disabled={loading}
                    autoComplete="off"
                />
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>

            <button
                type="submit"
                disabled={loading || !!error || !licenseNumber}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200
          ${loading || !!error || !licenseNumber
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-primary hover:bg-blue-700 transform hover:scale-[1.02] active:scale-[0.98]'}`}
            >
                {loading ? (
                    <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Checking Status...
          </span>
                ) : (
                    'Verify Now'
                )}
            </button>
        </form>
    )
}