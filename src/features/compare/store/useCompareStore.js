/**
 * useCompareStore.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Zustand store for Comparison mode: which algorithms race, their results, and
 * ONE shared step clock. Each algorithm shows steps[min(stepIndex, last)], so a
 * search that finishes early freezes on its final state while the others run.
 *
 * Kept separate from useAlgorithmStore, which models a single algorithm.
 */

import { create } from 'zustand'
import { PLAYBACK } from '../../graph/types/graphTypes.js'
import { validateGraph } from '../../graph/utils/graphUtils.js'
import { runComparison } from '../engine/compareRunner.js'
import { ALGO_ORDER, VIEW_MODE, SPEEDS } from '../constants.js'
import { ANNEALING_DEFAULTS } from '../../graph/engine/simulatedAnnealingEngine.js'

export const MIN_SELECTED = 2

export const LOCAL_SEARCH_DEFAULTS = {
  seed:     ANNEALING_DEFAULTS.seed,
  t0:       ANNEALING_DEFAULTS.t0,
  alpha:    ANNEALING_DEFAULTS.alpha,
  sideways: 0,
}

export const useCompareStore = create((set, get) => ({
  // ── Selection & view ───────────────────────────────────────────────────────
  selected:    ['bfs', 'astar'],
  viewMode:    VIEW_MODE.SPLIT,
  focusedAlgo: null,          // overlay highlight on legend hover

  // ── Local search settings (Hill Climbing / Simulated Annealing) ───────────
  localSearch: { ...LOCAL_SEARCH_DEFAULTS },

  // ── Results ────────────────────────────────────────────────────────────────
  comparison: null,           // { ids, results, baseline, verdict }
  ranGraph:   null,           // the exact graph object the results belong to
  errors:     [],
  revealed:   false,          // results panel shown once the race ends (or on demand)

  // ── Shared playback clock ──────────────────────────────────────────────────
  stepIndex:     0,
  maxSteps:      0,
  playbackState: PLAYBACK.IDLE,
  speed:         SPEEDS[1].ms,
  _timerId:      null,

  // ── Selection actions ──────────────────────────────────────────────────────
  setSelected: (ids) => {
    const next = ALGO_ORDER.filter(id => ids.includes(id))
    set({ selected: next })
    get()._rerunIfActive()
  },

  toggleAlgo: (id) => {
    const { selected } = get()
    const next = selected.includes(id) ? selected.filter(a => a !== id) : [...selected, id]
    get().setSelected(next)
  },

  selectAll: () => get().setSelected(ALGO_ORDER),

  /** Merge local-search settings and re-run an active race with them. */
  setLocalSearch: (patch) => {
    set(state => ({ localSearch: { ...state.localSearch, ...patch } }))
    get()._rerunIfActive({ autoPlay: true })
  },

  setViewMode:    (viewMode) => set({ viewMode }),
  setFocusedAlgo: (focusedAlgo) => set({ focusedAlgo }),

  // ── Run ────────────────────────────────────────────────────────────────────
  /**
   * Run every selected algorithm on the graph and start the race.
   * @param {object} graph
   * @param {{ autoPlay?: boolean }} [opts]
   */
  run: (graph, { autoPlay = true } = {}) => {
    const { selected, localSearch } = get()
    get()._stop()

    const errors = validateGraph(graph)
    if (selected.length < MIN_SELECTED) errors.push(`Select at least ${MIN_SELECTED} algorithms to compare.`)
    if (errors.length > 0) {
      set({ errors })
      return
    }

    const comparison = runComparison(graph, selected, localSearch)
    const maxSteps = Math.max(...comparison.ids.map(id => comparison.results[id].totalSteps))

    set({
      comparison,
      ranGraph: graph,
      errors: [],
      revealed: false,
      stepIndex: 0,
      maxSteps,
      playbackState: PLAYBACK.PAUSED,
    })
    if (autoPlay) get().play()
  },

  /** Re-run on the same graph after the selection changes (keeps panels consistent). */
  _rerunIfActive: ({ autoPlay = false } = {}) => {
    const { comparison, ranGraph } = get()
    if (comparison && ranGraph) get().run(ranGraph, { autoPlay })
  },

  clearResults: () => {
    get()._stop()
    set({ comparison: null, ranGraph: null, errors: [], revealed: false, stepIndex: 0, maxSteps: 0, playbackState: PLAYBACK.IDLE })
  },

  revealResults: () => set({ revealed: true }),

  // ── Playback ───────────────────────────────────────────────────────────────
  seek: (index) => {
    const { maxSteps } = get()
    const clamped = Math.max(0, Math.min(index, maxSteps - 1))
    const atEnd = clamped >= maxSteps - 1
    set(state => ({
      stepIndex: clamped,
      revealed: state.revealed || atEnd,
      playbackState: atEnd && state.playbackState === PLAYBACK.PLAYING ? PLAYBACK.DONE : state.playbackState,
    }))
    if (atEnd) get()._stop()
  },

  stepForward:  () => get().seek(get().stepIndex + 1),
  stepBackward: () => get().seek(get().stepIndex - 1),
  goToFirst:    () => get().seek(0),
  goToLast:     () => { get().pause(); get().seek(get().maxSteps - 1) },

  play: () => {
    const { maxSteps, stepIndex } = get()
    if (!maxSteps) return
    if (stepIndex >= maxSteps - 1) set({ stepIndex: 0 })
    set({ playbackState: PLAYBACK.PLAYING })
    get()._tick()
  },

  pause: () => {
    get()._stop()
    if (get().playbackState === PLAYBACK.PLAYING) set({ playbackState: PLAYBACK.PAUSED })
  },

  togglePlay: () => (get().playbackState === PLAYBACK.PLAYING ? get().pause() : get().play()),

  setSpeed: (speed) => set({ speed }),

  // ── Internal timer (same pattern as useAlgorithmStore) ─────────────────────
  _tick: () => {
    get()._stop()
    const id = setTimeout(() => {
      if (get().playbackState !== PLAYBACK.PLAYING) return
      get().stepForward()
      if (get().playbackState === PLAYBACK.PLAYING) get()._tick()
    }, get().speed)
    set({ _timerId: id })
  },

  _stop: () => {
    const { _timerId } = get()
    if (_timerId !== null) {
      clearTimeout(_timerId)
      set({ _timerId: null })
    }
  },
}))

/** The step an algorithm is showing at the shared clock position. */
export function stepFor(result, stepIndex) {
  if (!result || result.steps.length === 0) return null
  return result.steps[Math.min(stepIndex, result.steps.length - 1)]
}

/** Whether an algorithm has reached its final step at the shared clock position. */
export function isFinishedAt(result, stepIndex) {
  return !!result && stepIndex >= result.steps.length - 1
}
