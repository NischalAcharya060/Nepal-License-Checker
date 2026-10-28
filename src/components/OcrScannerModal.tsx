'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { useSwipeDownToClose } from '@/hooks/useSwipeDownToClose'
import type { Language, LicenseFormCopy } from '@/lib/i18n'

interface OcrScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onDetected: (licenseNumber: string) => void
  language: Language
  copy?: LicenseFormCopy
}

/**
 * Resizes and compresses an image in-browser to ~80-100KB JPEG
 * for ultra-fast mobile upload and low latency.
 */
function compressImageFile(file: File, maxWidth = 960, quality = 0.72): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = document.createElement('img')
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          return reject(new Error('Canvas context unavailable'))
        }

        ctx.drawImage(img, 0, 0, width, height)
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality)
        resolve({
          base64: compressedBase64,
          mimeType: 'image/jpeg',
        })
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export default function OcrScannerModal({
  isOpen,
  onClose,
  onDetected,
  language,
  copy,
}: OcrScannerModalProps) {
  const [cameraActive, setCameraActive] = useState(false)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)

  const isNe = language === 'ne'

  // Text constants with fallback
  const modalTitle = copy?.scanTitle || (isNe ? 'लाइसेन्स वा रसिद स्क्यान गर्नुहोस्' : 'Scan License or Receipt')
  const modalSubtitle =
    copy?.scanModalSubtitle ||
    (isNe
      ? 'स्मार्ट कार्ड, दस्तुर रसिद, र हातले लेखिएका चिटहरूका लागि AI स्क्यानर'
      : 'AI recognition for smart cards, revenue receipts (रसिद), and handwritten chits')
  const instructionText =
    copy?.scanInstructions ||
    (isNe
      ? 'लाइसेन्स नम्बर वा रसिदलाई फ्रेमभित्र स्पष्ट देखिने गरी राख्नुहोस्'
      : 'Position the license number or receipt clearly inside the frame')

  // Stop video stream helper
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }, [])

  // Manage live camera lifecycle
  useEffect(() => {
    let isCancelled = false
    let activeStream: MediaStream | null = null

    if (!isOpen || previewImage) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      return
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      // Async dispatch error so setState is not synchronous in effect body
      const timer = setTimeout(() => {
        if (!isCancelled) {
          setCameraActive(false)
          setCameraError(
            copy?.scanPermissionDenied ||
              (isNe
                ? 'क्यामेरा चलाउन अनुमति मिलेन वा उपलब्ध छैन। कृपया तलको बटनबाट फोटो अपलोड गर्नुहोस्।'
                : 'Camera access denied or unavailable. Please upload a photo using the button below.')
          )
        }
      }, 0)
      return () => clearTimeout(timer)
    }

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      .then(async (stream) => {
        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        activeStream = stream
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          try {
            await videoRef.current.play()
          } catch {
            // Ignore autoplay interruption
          }
        }

        if (!isCancelled) {
          setCameraActive(true)
          setCameraError(null)
        }
      })
      .catch((err) => {
        console.warn('Camera getUserMedia error:', err)
        if (!isCancelled) {
          setCameraActive(false)
          setCameraError(
            copy?.scanPermissionDenied ||
              (isNe
                ? 'क्यामेरा चलाउन अनुमति मिलेन वा उपलब्ध छैन। कृपया तलको बटनबाट फोटो अपलोड गर्नुहोस्।'
                : 'Camera access denied or unavailable. Please upload a photo using the button below.')
          )
        }
      })

    return () => {
      isCancelled = true
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop())
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }, [isOpen, previewImage, facingMode, copy?.scanPermissionDenied, isNe])

  // Ensure stream is attached to video element as soon as videoRef mounts or updates
  useEffect(() => {
    if (isOpen && !previewImage && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current
        videoRef.current.play().catch(() => {})
      }
    }
  }, [isOpen, previewImage, cameraActive])

  // Handle closing modal with slide-down animation
  const handleFinalCleanup = useCallback(() => {
    stopCamera()
    setPreviewImage(null)
    setScanning(false)
    setCameraError(null)
    onClose()
  }, [stopCamera, onClose])

  const {
    isRendered,
    triggerClose,
    modalStyle,
    backdropStyle,
    handleProps,
    containerProps,
  } = useSwipeDownToClose({
    isOpen,
    onClose: handleFinalCleanup,
    onStartClosing: stopCamera,
  })

  // Toggle camera direction (front / back)
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
  }

  // Capture frame from active video stream
  const capturePhotoFromVideo = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const base64 = canvas.toDataURL('image/jpeg', 0.85)

    stopCamera()
    setPreviewImage(base64)
    processOcr(base64, 'image/jpeg')
  }

  // Handle file select (gallery / photo take)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const { base64, mimeType } = await compressImageFile(file)
      stopCamera()
      setPreviewImage(base64)
      processOcr(base64, mimeType)
    } catch {
      toast.error(isNe ? 'फोटो लोड गर्न सकिएन' : 'Failed to load photo')
    } finally {
      e.target.value = ''
    }
  }

  // Send to /api/ocr with strict 10s max timeout
  const processOcr = async (base64Data: string, mimeType = 'image/jpeg') => {
    setScanning(true)
    const toastId = toast.loading(copy?.scanProcessing || (isNe ? 'AI ले रसिद पहिचान गर्दैछ...' : 'Recognizing with AI Vision...'))

    // Client-side hard timeout: abort fetch after 10,000ms
    const controller = new AbortController()
    const timeoutTimer = setTimeout(() => {
      controller.abort()
    }, 10000)

    try {
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Data,
          mimeType,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutTimer)
      const result = await res.json()

      if (res.ok && result.status === 'success' && result.data?.licenseNumber) {
        const foundNumber = result.data.licenseNumber
        // Haptic feedback
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate([40, 50, 40])
          } catch {
            // Ignore
          }
        }

        toast.success(
          `${copy?.scanSuccessToast || (isNe ? 'लाइसेन्स नम्बर पहिचान भयो' : 'License number recognized')}: ${foundNumber}`,
          { id: toastId, duration: 4500 }
        )

        onDetected(foundNumber)
        triggerClose()
      } else {
        const errorMsg =
          result?.message ||
          copy?.scanFailedToast ||
          (isNe
            ? 'लाइसेन्स नम्बर फेला परेन। कृपया पुनः प्रयास गर्नुहोस् वा हातले टाइप गर्नुहोस्।'
            : 'Could not detect license number. Please try again or type manually.')
        toast.error(errorMsg, { id: toastId, duration: 5000 })
      }
    } catch (err: unknown) {
      clearTimeout(timeoutTimer)
      if (err instanceof Error && err.name === 'AbortError') {
        toast.error(
          isNe
            ? 'स्क्यान समय सकियो (१० सेकेन्ड सीमा)। कृपया पुनः प्रयास गर्नुहोस्।'
            : 'Scan timed out (10s limit). Please try again.',
          { id: toastId, duration: 4500 }
        )
      } else {
        toast.error(
          copy?.scanFailedToast ||
            (isNe
              ? 'स्क्यान गर्दा समस्या आयो। कृपया पुनः प्रयास गर्नुहोस्।'
              : 'Error while scanning. Please try again.'),
          { id: toastId }
        )
      }
    } finally {
      clearTimeout(timeoutTimer)
      setScanning(false)
    }
  }

  const handleRetake = () => {
    setPreviewImage(null)
    setScanning(false)
  }

  if (!isRendered) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-md transition-opacity duration-300"
      style={backdropStyle}
      onClick={triggerClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={modalTitle}
        style={modalStyle}
        {...containerProps}
        className="relative w-full max-w-lg overflow-hidden rounded-t-[28px] sm:rounded-3xl dev-glass-card shadow-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] max-h-[92vh] sm:max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile handle indicator & Swipe Down zone */}
        <div
          className="w-full pt-3 pb-1 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none sm:hidden"
          {...handleProps}
        >
          <div className="w-12 h-1.5 bg-[var(--border-default)] hover:bg-[var(--text-muted)] rounded-full transition-colors" />
          <span className="text-[10px] text-[var(--text-muted)] mt-1 font-medium opacity-65 tracking-tight">
            {isNe ? 'बन्द गर्न तल तान्नुहोस्' : 'Swipe down to close'}
          </span>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={triggerClose}
          aria-label={copy?.scanClose || (isNe ? 'बन्द गर्नुहोस्' : 'Close')}
          className="absolute right-3.5 top-3.5 z-20 flex h-9 w-9 min-[380px]:h-10 min-[380px]:w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-all hover:bg-[var(--nepal-red)] hover:scale-105 active:scale-95 shadow-md cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Header - also draggable on mobile */}
        <div
          className="border-b border-[var(--border-default)] px-4 py-2.5 min-[380px]:px-5 min-[380px]:py-3.5 sm:px-6 sm:py-4 select-none cursor-grab active:cursor-grabbing sm:cursor-default"
          {...handleProps}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 min-[380px]:h-10 min-[380px]:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--nepal-blue)] to-[var(--nepal-blue-mid)] text-white shadow-xs shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <div className="min-w-0 pr-9">
              <h2 className="text-sm min-[380px]:text-base sm:text-lg font-bold text-[var(--text-primary)] leading-snug truncate">
                {modalTitle}
              </h2>
              <p className="text-[11px] min-[380px]:text-xs text-[var(--text-muted)] line-clamp-1">
                {modalSubtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Viewfinder / Preview Area */}
        <div className="relative h-[210px] min-[380px]:h-[250px] min-[420px]:h-[280px] sm:h-auto sm:aspect-[4/3] w-full overflow-hidden bg-black flex items-center justify-center shrink-0">
          {previewImage ? (
            // Preview mode
            <div className="relative h-full w-full">
              <Image
                src={previewImage}
                alt="Receipt scan preview"
                fill
                unoptimized
                className="object-contain"
              />
              {scanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs text-white">
                  <div className="relative flex h-14 w-14 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--nepal-blue)] opacity-75" />
                    <span className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-white/30 border-t-white" />
                  </div>
                  <p className="mt-3 text-sm font-semibold tracking-wide">
                    {copy?.scanProcessing || (isNe ? 'AI पहिचान गरिँदैछ...' : 'Extracting with Gemini AI...')}
                  </p>
                  <p className="text-xs text-white/75 mt-0.5">
                    {isNe ? 'द्रुत स्क्यान (अधिकतम १० सेकेन्ड)' : 'Fast AI scan (max 10s)'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Always keep video mounted so getUserMedia stream attaches immediately on first modal open */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover transition-opacity duration-300 ${
                  cameraActive ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'
                }`}
              />

              {cameraActive ? (
                <>
                  {/* Viewfinder Targeting Reticle */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 min-[380px]:p-6">
                    <div className="relative h-36 min-[380px]:h-40 min-[420px]:h-44 w-64 min-[380px]:w-72 max-w-[85%] rounded-2xl border-2 border-dashed border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                      {/* Glowing corners */}
                      <span className="absolute -left-1 -top-1 h-5 w-5 border-l-3 border-t-3 border-[var(--nepal-blue)]" />
                      <span className="absolute -right-1 -top-1 h-5 w-5 border-r-3 border-t-3 border-[var(--nepal-blue)]" />
                      <span className="absolute -bottom-1 -left-1 h-5 w-5 border-b-3 border-l-3 border-[var(--nepal-blue)]" />
                      <span className="absolute -bottom-1 -right-1 h-5 w-5 border-b-3 border-r-3 border-[var(--nepal-blue)]" />

                      {/* Laser scan animation line */}
                      <div className="absolute inset-x-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--nepal-red)] to-transparent animate-pulse shadow-[0_0_8px_var(--nepal-red)]" />

                      <div className="absolute inset-x-0 bottom-2 text-center">
                        <span className="rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-xs">
                          {isNe ? 'लाइसेन्स वा रसिद नम्बर' : 'License / Receipt No.'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Camera Switch Button */}
                  <button
                    type="button"
                    onClick={toggleFacingMode}
                    className="absolute right-3 bottom-3 z-10 flex h-9 w-9 min-[380px]:h-10 min-[380px]:w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition hover:bg-black/80 hover:scale-105 active:scale-95 cursor-pointer"
                    title={copy?.scanSwitchCamera || (isNe ? 'क्यामेरा बदल्नुहोस्' : 'Switch Camera')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                    </svg>
                  </button>
                </>
              ) : (
                /* Camera loading or error placeholder */
                <div className="p-6 text-center text-white/80">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white/70">
                    {cameraError ? (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                        <line x1="1" y1="1" x2="23" y2="23" strokeWidth="2.2" />
                      </svg>
                    ) : (
                      <span className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-white/30 border-t-white" />
                    )}
                  </div>
                  <p className="text-sm font-medium text-white/90">
                    {cameraError || (isNe ? 'क्यामेरा खुल्दैछ...' : 'Starting camera...')}
                  </p>
                  <p className="mt-1 text-xs text-white/60">
                    {isNe ? 'वा तलको बटनबाट ग्यालरीबाट सिधै फोटो छान्नुहोस्' : 'Or upload a photo directly from your device'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Tip banner */}
        <div className="bg-[var(--info-bg)]/60 px-3.5 py-1.5 min-[380px]:py-2 border-b border-[var(--border-default)]/60">
          <p className="text-center text-[11px] min-[380px]:text-xs text-[var(--info-text)] font-medium leading-tight">
            💡 {instructionText}
          </p>
        </div>

        {/* Controls / Actions */}
        <div className="p-3.5 min-[380px]:p-4 sm:p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {previewImage ? (
            <div className="flex items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={handleRetake}
                disabled={scanning}
                className="flex-1 inline-flex h-10 min-[380px]:h-11 items-center justify-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 text-xs min-[380px]:text-sm font-bold text-[var(--text-secondary)] transition hover:bg-[var(--surface-primary)] hover:text-[var(--text-primary)] active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                <span>{isNe ? 'पुनः फोटो खिच्नुहोस्' : 'Retake'}</span>
              </button>

              <button
                type="button"
                onClick={() => processOcr(previewImage)}
                disabled={scanning}
                className="flex-1 inline-flex h-10 min-[380px]:h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--nepal-blue)] to-[var(--nepal-blue-mid)] px-3 text-xs min-[380px]:text-sm font-bold text-white shadow-md transition hover:brightness-110 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {scanning ? (
                  <>
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span>{copy?.scanProcessing || (isNe ? 'स्क्यान हुँदैछ...' : 'Scanning...')}</span>
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <span>{isNe ? 'पहिचान गर्नुहोस्' : 'Scan Now'}</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-2 min-[380px]:gap-2.5">
              {/* Primary Capture Button */}
              {cameraActive ? (
                <button
                  type="button"
                  onClick={capturePhotoFromVideo}
                  disabled={scanning}
                  className="w-full sm:flex-1 inline-flex h-11 sm:h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--nepal-blue)] to-[var(--nepal-blue-mid)] px-4 text-xs min-[380px]:text-sm font-bold text-white shadow-md transition hover:scale-101 hover:brightness-110 active:scale-98 cursor-pointer"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="3" fill="currentColor" />
                  </svg>
                  <span>{copy?.scanTakePhoto || (isNe ? 'फोटो खिच्नुहोस्' : 'Take Photo')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full sm:flex-1 inline-flex h-11 sm:h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--nepal-blue)] to-[var(--nepal-blue-mid)] px-4 text-xs min-[380px]:text-sm font-bold text-white shadow-md transition hover:brightness-110 active:scale-98 cursor-pointer"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span>{copy?.scanTakePhoto || (isNe ? 'क्यामेरा खोल्नुहोस्' : 'Open Camera')}</span>
                </button>
              )}

              {/* Upload file / gallery button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={scanning}
                className="w-full sm:w-auto inline-flex h-11 sm:h-12 items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 text-xs min-[380px]:text-sm font-bold text-[var(--text-secondary)] transition hover:bg-[var(--surface-primary)] hover:text-[var(--text-primary)] active:scale-98 cursor-pointer"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>{copy?.scanUploadFile || (isNe ? 'ग्यालरीबाट छान्नुहोस्' : 'Upload Photo')}</span>
              </button>

              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
