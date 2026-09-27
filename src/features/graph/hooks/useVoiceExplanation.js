/**
 * useVoiceExplanation.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Custom React hook that wraps the Web Speech API (SpeechSynthesis).
 *
 * Consumed by: ExplanationPanel (Learn Mode) and the step narration overlay.
 *
 * Features:
 *  - Speaks a given text string
 *  - Exposes isSupported, isSpeaking, isPaused
 *  - Respects rate, pitch, volume preferences
 *  - Auto-selects a voice (prefers en-US)
 *  - Cancels previous utterance when a new one is requested
 *
 * IMPORTANT: Do NOT call this hook inside the engine files — it is React-only.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_OPTS = {
  rate:   0.9,
  pitch:  1.0,
  volume: 1.0,
  lang:   'en-US',
}

/**
 * @returns {{
 *   speak: (text: string, opts?: object) => void,
 *   stop: () => void,
 *   pause: () => void,
 *   resume: () => void,
 *   isSupported: boolean,
 *   isSpeaking: boolean,
 *   isPaused: boolean,
 *   isEnabled: boolean,
 *   setEnabled: (v: boolean) => void,
 * }}
 */
export function useVoiceExplanation() {
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused,   setIsPaused]   = useState(false)
  const [isEnabled,  setEnabled]    = useState(false)  // opt-in by user
  const voiceRef  = useRef(null)
  const synthRef  = useRef(isSupported ? window.speechSynthesis : null)

  // Pick best voice when voices load
  useEffect(() => {
    if (!isSupported) return
    const pick = () => {
      const voices = synthRef.current.getVoices()
      const best   = voices.find(v => v.lang.startsWith('en-US') && v.localService)
                  ?? voices.find(v => v.lang.startsWith('en'))
                  ?? voices[0]
      voiceRef.current = best ?? null
    }
    pick()
    synthRef.current.addEventListener('voiceschanged', pick)
    return () => synthRef.current?.removeEventListener('voiceschanged', pick)
  }, [isSupported])

  const stop = useCallback(() => {
    if (!isSupported) return
    synthRef.current.cancel()
    setIsSpeaking(false)
    setIsPaused(false)
  }, [isSupported])

  const speak = useCallback((text, opts = {}) => {
    if (!isSupported || !isEnabled || !text) return
    synthRef.current.cancel()

    const utterance       = new SpeechSynthesisUtterance(text)
    utterance.voice       = voiceRef.current
    utterance.rate        = opts.rate   ?? DEFAULT_OPTS.rate
    utterance.pitch       = opts.pitch  ?? DEFAULT_OPTS.pitch
    utterance.volume      = opts.volume ?? DEFAULT_OPTS.volume
    utterance.lang        = opts.lang   ?? DEFAULT_OPTS.lang

    utterance.onstart     = () => { setIsSpeaking(true);  setIsPaused(false) }
    utterance.onend       = () => { setIsSpeaking(false); setIsPaused(false) }
    utterance.onerror     = () => { setIsSpeaking(false); setIsPaused(false) }
    utterance.onpause     = () =>   setIsPaused(true)
    utterance.onresume    = () =>   setIsPaused(false)

    synthRef.current.speak(utterance)
  }, [isSupported, isEnabled])

  const pause = useCallback(() => {
    if (!isSupported || !isSpeaking) return
    synthRef.current.pause()
  }, [isSupported, isSpeaking])

  const resume = useCallback(() => {
    if (!isSupported || !isPaused) return
    synthRef.current.resume()
  }, [isSupported, isPaused])

  // Stop when component unmounts
  useEffect(() => () => stop(), [stop])

  return { speak, stop, pause, resume, isSupported, isSpeaking, isPaused, isEnabled, setEnabled }
}
