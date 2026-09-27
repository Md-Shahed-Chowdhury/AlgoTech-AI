/**
 * useAlgorithmStore.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Zustand store that owns algorithm playback state.
 *
 * Consumed by: AlgorithmStatPanel, MetricsPanel, ExplanationPanel,
 *              GraphCanvas (to apply visual states per step), VoiceExplanation.
 *
 * The store does NOT import React — it is pure Zustand.
 */

import { create } from 'zustand'
import { ALGORITHM, PLAYBACK } from '../types/graphTypes.js'
import { runAlgorithm } from '../engine/algorithmEngine.js'
import { explainAllSteps } from '../engine/explanationGenerator.js'

export const useAlgorithmStore = create((set, get) => ({
  // ── Algorithm selection ────────────────────────────────────────────────────
  selectedAlgorithm: ALGORITHM.BFS,

  // ── Generated step data ────────────────────────────────────────────────────
  steps:        [],        // AlgorithmStep[]
  explanations: [],        // StepExplanation[] (parallel array to steps)
  currentStepIndex: 0,

  // ── Playback control ───────────────────────────────────────────────────────
  playbackState:   PLAYBACK.IDLE,
  playbackSpeed:   600,    // ms per step during auto-play
  _playbackTimerId: null,  // internal timer handle

  // ── Error / validation ─────────────────────────────────────────────────────
  validationErrors: [],

  // ── Derived selectors (computed from current index) ───────────────────────
  get currentStep()        { return get().steps[get().currentStepIndex] ?? null },
  get currentExplanation() { return get().explanations[get().currentStepIndex] ?? null },
  get totalSteps()         { return get().steps.length },
  get isFirstStep()        { return get().currentStepIndex === 0 },
  get isLastStep()         { return get().currentStepIndex >= get().steps.length - 1 },

  // ── Actions ────────────────────────────────────────────────────────────────

  setAlgorithm: (algorithmId) => set({
    selectedAlgorithm: algorithmId,
    steps:             [],
    explanations:      [],
    currentStepIndex:  0,
    playbackState:     PLAYBACK.IDLE,
  }),

  /**
   * Generate steps for the given graph using the currently selected algorithm.
   * Does NOT start playback automatically.
   *
   * @param {import('../types/graphStructures.js').Graph} graph
   * @param {object} [options]
   */
  prepare: (graph, options = {}) => {
    const { selectedAlgorithm } = get()
    const steps        = runAlgorithm(selectedAlgorithm, graph, options)
    const explanations = explainAllSteps(steps, selectedAlgorithm, graph)

    set({
      steps,
      explanations,
      currentStepIndex: 0,
      playbackState:    steps.length > 0 ? PLAYBACK.PAUSED : PLAYBACK.IDLE,
      validationErrors: [],
    })
  },

  setValidationErrors: (errors) => set({ validationErrors: errors }),

  // Step navigation
  goToStep: (index) => {
    const { steps } = get()
    const clamped = Math.max(0, Math.min(index, steps.length - 1))
    set({ currentStepIndex: clamped })
  },

  stepForward: () => {
    const { currentStepIndex, steps } = get()
    if (currentStepIndex < steps.length - 1) {
      set({ currentStepIndex: currentStepIndex + 1 })
    } else {
      // Reached end — stop auto-play if running
      get()._stopPlayback()
      set({ playbackState: PLAYBACK.DONE })
    }
  },

  stepBackward: () => {
    const { currentStepIndex } = get()
    if (currentStepIndex > 0) {
      set({ currentStepIndex: currentStepIndex - 1 })
    }
  },

  goToFirst: () => set({ currentStepIndex: 0 }),

  goToLast: () => {
    const { steps } = get()
    set({ currentStepIndex: Math.max(0, steps.length - 1) })
  },

  // Auto-play
  play: () => {
    const { playbackState, steps } = get()
    if (!steps.length) return
    if (playbackState === PLAYBACK.DONE) {
      // Restart from beginning
      set({ currentStepIndex: 0 })
    }
    set({ playbackState: PLAYBACK.PLAYING })
    get()._tick()
  },

  pause: () => {
    get()._stopPlayback()
    set({ playbackState: PLAYBACK.PAUSED })
  },

  setPlaybackSpeed: (ms) => set({ playbackSpeed: ms }),

  reset: () => {
    get()._stopPlayback()
    set({
      currentStepIndex: 0,
      playbackState:    PLAYBACK.PAUSED,
    })
  },

  fullReset: () => {
    get()._stopPlayback()
    set({
      steps:            [],
      explanations:     [],
      currentStepIndex: 0,
      playbackState:    PLAYBACK.IDLE,
      validationErrors: [],
    })
  },

  // ── Internal timer helpers (not part of public API) ───────────────────────
  _tick: () => {
    const { playbackSpeed } = get()
    const id = setTimeout(() => {
      const { playbackState } = get()
      if (playbackState !== PLAYBACK.PLAYING) return
      get().stepForward()
      if (get().playbackState === PLAYBACK.PLAYING) {
        get()._tick()
      }
    }, playbackSpeed)
    set({ _playbackTimerId: id })
  },

  _stopPlayback: () => {
    const { _playbackTimerId } = get()
    if (_playbackTimerId !== null) {
      clearTimeout(_playbackTimerId)
      set({ _playbackTimerId: null })
    }
  },
}))
