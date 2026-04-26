// src/app/page.tsx
'use client'

import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import LicenseForm from '@/components/LicenseForm'
import LicenseResult from '@/components/LicenseResult'
import { validateLicenseNumber } from '@/utils/validation'

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [notFound, setNotFound] = useState(false)

  const checkLicense = useCallback(async (licenseNumber: string) => {
    setLoading(true)
    setResult(null)
    setNotFound(false)

    try {
      const response = await fetch(`/api/license?number=${encodeURIComponent(licenseNumber)}`)
      const data = await response.json()

      if (data.status === 'success' && data.data) {
        setResult(data.data)
        setNotFound(false)
        toast.success('License found!')
      } else {
        setNotFound(true)
        toast.error('License not found in printed records')
      }
    } catch (error) {
      console.error('Error checking license:', error)
      toast.error('Failed to check license. Please try again.')
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [])

  return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-12 md:py-20">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="text-center mb-10">
              <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
                Nepal License Print Status
              </h1>
              <p className="text-lg text-gray-600 mb-2">
                Check if your smart card driving license is printed and ready for collection
              </p>
              <p className="text-sm text-gray-500">
                Official data from Department of Transport Management (DOTM), Nepal
              </p>
            </div>

            {/* Form */}
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-8">
              <LicenseForm onSubmit={checkLicense} loading={loading} />
            </div>

            {/* Result Section */}
            {(result || notFound) && !loading && (
                <div className="animate-fade-in">
                  <LicenseResult result={result} notFound={notFound} />
                </div>
            )}

            {/* Info Section */}
            <div className="mt-12 text-center text-sm text-gray-600">
              <div className="bg-white/50 rounded-lg p-6 backdrop-blur-sm">
                <h3 className="font-semibold mb-2">License Number Format</h3>
                <p className="mb-2">Example: <code className="bg-gray-100 px-2 py-1 rounded">01-01-12345678</code></p>
                <p className="text-xs">Format: XX-XX-XXXXXXXX (Office Code-District Code-Unique Number)</p>
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
      </main>
  )
}