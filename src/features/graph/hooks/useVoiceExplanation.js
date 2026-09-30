/**
 * useVoiceExplanation.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Custom React hook that wraps the Web Speech API (SpeechSynthesis).
 *
 * Consumed by: ExplanationPanel (Learn Mode) and the step narration overlay.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_OPTS = {
  rate:   0.9,
  pitch:  1.0,
  volume: 1.0,
  lang:   'en-US',
}

export function useVoiceExplanation() {
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused,   setIsPaused]   = useState(false)
  const [isEnabled,  setEnabled]    = useState(false)  // opt-in by user
  const voiceRef  = useRef(null)
  const synthRef  = useRef(isSupported ? window.speechSynthesis : null)

  // Pick best voice when voices load
  useEffect(() => {
    if (!isSupported || !synthRef.current) return
    const pick = () => {
      try {
        const voices = synthRef.current?.getVoices?.() ?? []
        if (voices.length === 0) return
        const best   = voices.find(v => v?.lang?.startsWith('en-US') && v?.localService)
                    ?? voices.find(v => v?.lang?.startsWith('en'))
                    ?? voices[0]
        voiceRef.current = best ?? null
      } catch {
        // Safe fallback if speech synthesis is disabled by browser policy
      }
    }
    pick()
    try {
      if (synthRef.current && typeof synthRef.current.addEventListener === 'function') {
        synthRef.current.addEventListener('voiceschanged', pick)
        return () => synthRef.current?.removeEventListener?.('voiceschanged', pick)
      }
    } catch {
      // Ignore event listener errors
    }
  }, [isSupported])

  const stop = useCallback(() => {
    if (!isSupported || !synthRef.current) return
    try {
      synthRef.current.cancel()
    } catch {
      // Ignore
    }
    setIsSpeaking(false)
    setIsPaused(false)
  }, [isSupported])

  const speak = useCallback((text, opts = {}) => {
    if (!isSupported || !isEnabled || !text || !synthRef.current) return
    try {
      synthRef.current.cancel()

      const utterance       = new SpeechSynthesisUtterance(text)
      if (voiceRef.current) utterance.voice = voiceRef.current
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
    } catch {
      // Fallback
    }
  }, [isSupported, isEnabled])

  const pause = useCallback(() => {
    if (!isSupported || !isSpeaking || !synthRef.current) return
    try { synthRef.current.pause() } catch {}
  }, [isSupported, isSpeaking])

  const resume = useCallback(() => {
    if (!isSupported || !isPaused || !synthRef.current) return
    try { synthRef.current.resume() } catch {}
  }, [isSupported, isPaused])

  // Stop when component unmounts
  useEffect(() => () => stop(), [stop])

  return { speak, stop, pause, resume, isSupported, isSpeaking, isPaused, isEnabled, setEnabled }
}
