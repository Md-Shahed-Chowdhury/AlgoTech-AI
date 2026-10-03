/**
 * soundEffects.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Web Audio API synthesizer helper for subtle, pleasant audio feedback
 * during interactive search simulations and exam sessions. Zero external dependencies.
 */

let audioCtx = null

function getAudioContext() {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioCtxClass = window.AudioContext || window.webkitAudioContext
    if (AudioCtxClass) {
      audioCtx = new AudioCtxClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

/**
 * Play a short pleasant ascending chime for correct answers or reaching goal.
 */
export function playSuccessSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(523.25, now)       // C5
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.07) // E5
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.14) // G5

    gain.gain.setValueAtTime(0.12, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.32)
  } catch {
    // Ignore audio block/policy restrictions
  }
}

/**
 * Play a soft gentle low buzz/thud for wrong answers or local optimum traps.
 */
export function playErrorSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(220, now)      // A3
    osc.frequency.linearRampToValueAtTime(164.81, now + 0.12) // E3

    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.22)
  } catch {
    // Ignore audio block/policy restrictions
  }
}

/**
 * Play a soft high blip for evaluating neighbor candidates.
 */
export function playEvaluateSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, now) // D5
    gain.gain.setValueAtTime(0.05, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.08)
  } catch {
    // Ignore
  }
}

/**
 * Play a pleasant mid tone when selecting the next node or moving to neighbor.
 */
export function playSelectSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(440, now)       // A4
    osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.06) // C5
    gain.gain.setValueAtTime(0.08, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.12)
  } catch {
    // Ignore
  }
}

/**
 * Play a subtle click for general step transitions.
 */
export function playStepSound() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(350, now)
    gain.gain.setValueAtTime(0.04, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.05)
  } catch {
    // Ignore
  }
}
