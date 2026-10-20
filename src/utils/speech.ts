/**
 * Web Speech & Authentic Audio Utility
 * - English: Female / girl voice via Web Speech API (Microsoft Zira, Samantha, Google US English, Jenny, Aria).
 * - Nepali: Authentic native female Nepali audio stream via /api/tts.
 * - Concise output: Only speaks license number and status.
 */

let currentAudio: HTMLAudioElement | null = null

export function isSpeechSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'speechSynthesis' in window || typeof Audio !== 'undefined'
}

function findBestEnglishFemaleVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices || voices.length === 0) return null

  // Preferred female voice keywords across Windows, Chrome, macOS, iOS, Edge
  const femaleKeywords = [
    'zira',
    'aria',
    'jenny',
    'samantha',
    'karen',
    'victoria',
    'female',
    'neerja',
    'heera',
    'google us english',
    'google uk english female',
    'veena',
    'natural (female)',
    'en-us-ziraneural',
    'en-us-arianeural',
    'en-us-jennyneural',
  ]

  // 1. Look for English voices matching explicit female names
  const femaleVoice = voices.find((v) => {
    const isEnglish = v.lang.toLowerCase().startsWith('en')
    if (!isEnglish) return false
    const nameLower = v.name.toLowerCase()
    return femaleKeywords.some((kw) => nameLower.includes(kw))
  })
  if (femaleVoice) return femaleVoice

  // 2. Look for any English voice that has 'female' or isn't explicitly male
  const anyEnglishFemale = voices.find((v) => {
    const isEnglish = v.lang.toLowerCase().startsWith('en')
    if (!isEnglish) return false
    const nameLower = v.name.toLowerCase()
    const isMale =
      nameLower.includes('david') ||
      nameLower.includes('mark') ||
      nameLower.includes('george') ||
      nameLower.includes('male')
    return !isMale
  })
  if (anyEnglishFemale) return anyEnglishFemale

  // 3. Fallback to any English voice
  return voices.find((v) => v.lang.toLowerCase().startsWith('en')) || voices[0] || null
}

function findNativeNepaliVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices || voices.length === 0) return null

  // Strictly check for native Nepali voices ONLY. Never match Hindi or other languages.
  return (
    voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith('ne') ||
        v.lang.toLowerCase().includes('np') ||
        v.name.toLowerCase().includes('nepal') ||
        v.name.toLowerCase().includes('sagar') ||
        v.name.toLowerCase().includes('hemkala')
    ) || null
  )
}

export function stopSpeech(): void {
  // 1. Stop any playing audio element (Nepali stream)
  if (currentAudio) {
    try {
      currentAudio.pause()
      currentAudio.currentTime = 0
    } catch {
      // Ignore
    }
    currentAudio = null
  }

  // 2. Stop any client speech synthesis (English speech)
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel()
    } catch {
      // Ignore
    }
  }
}

export function speakResultText({
  text,
  lang,
  onStart,
  onEnd,
  onError,
}: {
  text: string
  lang: 'en' | 'ne'
  onStart?: () => void
  onEnd?: () => void
  onError?: (error: unknown) => void
}): boolean {
  if (typeof window === 'undefined') return false

  // Always cancel any prior audio before starting a new one
  stopSpeech()

  // ─── 1. NEPALI (Authentic Native Nepali Tone) ───
  if (lang === 'ne') {
    try {
      const nativeVoice = findNativeNepaliVoice()

      // Use /api/tts endpoint for 100% authentic Nepali pronunciation (absolutely zero Hindi accent)
      const audioUrl = `/api/tts?lang=ne&text=${encodeURIComponent(text)}`
      const audio = new Audio(audioUrl)
      currentAudio = audio

      audio.onplay = () => {
        onStart?.()
      }

      audio.onended = () => {
        currentAudio = null
        onEnd?.()
      }

      audio.onerror = () => {
        currentAudio = null
        // Fallback to Web Speech API ONLY IF an actual native Nepali voice exists
        if (nativeVoice && 'speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text)
          utterance.voice = nativeVoice
          utterance.lang = 'ne-NP'
          utterance.rate = 0.95
          utterance.onstart = () => onStart?.()
          utterance.onend = () => onEnd?.()
          utterance.onerror = (e) => {
            if (e.error !== 'canceled' && e.error !== 'interrupted') {
              onError?.(e)
            }
            onEnd?.()
          }
          window.speechSynthesis.speak(utterance)
        } else {
          onError?.(new Error('Nepali audio playback failed'))
          onEnd?.()
        }
      }

      audio.play().catch((err) => {
        currentAudio = null
        onError?.(err)
        onEnd?.()
      })

      return true
    } catch (err) {
      currentAudio = null
      onError?.(err)
      onEnd?.()
      return false
    }
  }

  // ─── 2. ENGLISH (Web Speech API with Female / Girl Voice) ───
  if (!('speechSynthesis' in window)) {
    onError?.(new Error('Speech synthesis is not supported on this browser'))
    return false
  }

  try {
    const executeSpeak = () => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = 0.92 // clear, crisp pace
      utterance.pitch = 1.15 // natural, pleasant feminine pitch

      const femaleVoice = findBestEnglishFemaleVoice()
      if (femaleVoice) {
        utterance.voice = femaleVoice
      }

      utterance.onstart = () => {
        onStart?.()
      }

      utterance.onend = () => {
        onEnd?.()
      }

      utterance.onerror = (e) => {
        if (e.error === 'canceled' || e.error === 'interrupted') {
          onEnd?.()
          return
        }
        onError?.(e)
        onEnd?.()
      }

      window.speechSynthesis.speak(utterance)
    }

    const voices = window.speechSynthesis.getVoices()
    if (voices.length === 0 && 'onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        executeSpeak()
      }
    } else {
      executeSpeak()
    }

    return true
  } catch (err) {
    onError?.(err)
    return false
  }
}
