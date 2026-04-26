// src/components/LicenseResult.tsx
'use client'

import { formatDate } from '@/utils/helpers'

interface LicenseResultProps {
    result: any
    notFound: boolean
}

export default function LicenseResult({ result, notFound }: LicenseResultProps) {
    if (notFound) {
        return (
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                <div className="flex justify-center mb-4">
                    <svg className="w-20 h-20 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">License Not Found</h2>
                <p className="text-gray-600 mb-4">
                    We couldn&#39;t find your license in the printed records.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-gray-700">
                    <p className="font-semibold mb-2">Possible reasons:</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>Your license hasn&#39;t been printed yet</li>
                        <li>The license number might be incorrect</li>
                        <li>The data hasn&#39;t been updated from DOTM</li>
                    </ul>
                </div>
            </div>
        )
    }

    if (result) {
        return (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Success Header */}
                <div className="bg-green-50 p-6 text-center border-b border-green-100">
                    <div className="flex justify-center mb-3">
                        <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-green-800 mb-1">License Printed & Ready</h2>
                    <p className="text-green-700">Your smart card license has been printed</p>
                </div>

                {/* License Details */}
                <div className="p-8">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-gray-500 block">Holder Name</label>
                                <p className="text-lg font-semibold text-gray-900">{result.holder_name}</p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500 block">License Number</label>
                                <p className="text-lg font-semibold text-gray-900 font-mono">{result.license_number}</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-gray-500 block">Issuing Office</label>
                                <p className="text-lg font-semibold text-gray-900">{result.office}</p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500 block">Vehicle Category</label>
                                <p className="text-lg font-semibold text-gray-900">{result.category || 'A/B/C'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <div className="bg-blue-50 rounded-lg p-4">
                            <div className="flex items-start space-x-3">
                                <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <div className="text-sm text-blue-800">
                                    <p className="font-semibold mb-1">Collection Instructions:</p>
                                    <p>Please visit your respective transport management office with original documents to collect your smart card license.</p>
                                    <p className="text-xs mt-2 text-blue-600">Data last updated: {formatDate(result.updatedAt)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return null
}