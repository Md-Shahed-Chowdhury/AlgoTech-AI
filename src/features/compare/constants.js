/**
 * constants.js — Comparison-mode identity for each algorithm.
 * ─────────────────────────────────────────────────────────────────────────────
 * Colors match ALGORITHM_META except DFS: its violet (#8b5cf6) is nearly
 * indistinguishable from BFS indigo when both share one chart, so comparison
 * mode uses cyan for DFS. Every algorithm also gets a dash pattern so lines are
 * never identified by color alone.
 */

import { ALGORITHM, ALGORITHM_META } from '../graph/types/graphTypes.js'

export const COMPARE_ALGOS = [
  { id: ALGORITHM.BFS,    color: '#6366f1', dash: '',          complete: 'Yes', optimal: 'Only if unweighted' },
  { id: ALGORITHM.DFS,    color: '#22d3ee', dash: '7 4',       complete: 'Finite graphs', optimal: 'No' },
  { id: ALGORITHM.UCS,    color: '#10b981', dash: '2 4',       complete: 'Yes', optimal: 'Yes' },
  { id: ALGORITHM.GREEDY, color: '#f59e0b', dash: '10 4 2 4',  complete: 'Finite graphs', optimal: 'No' },
  { id: ALGORITHM.ASTAR,  color: '#f43f5e', dash: '4 3 4 8',   complete: 'Yes', optimal: 'If h is admissible' },
].map(a => ({ ...a, ...pickMeta(ALGORITHM_META[a.id]) }))

function pickMeta(meta) {
  return { name: meta.name, shortName: meta.shortName, complexity: meta.complexity, description: meta.description }
}

export const ALGO_BY_ID = Object.fromEntries(COMPARE_ALGOS.map(a => [a.id, a]))
export const ALGO_ORDER = COMPARE_ALGOS.map(a => a.id)

export const VIEW_MODE = { SPLIT: 'split', OVERLAY: 'overlay' }

export const SPEEDS = [
  { label: '0.5×', ms: 1100 },
  { label: '1×',   ms: 650 },
  { label: '2×',   ms: 320 },
  { label: '4×',   ms: 140 },
]

/** Human-friendly execution time (engines run in microseconds on small graphs). */
export function formatTime(ms) {
  if (ms == null || !isFinite(ms)) return '—'
  if (ms < 1) return `${(ms * 1000).toFixed(ms < 0.01 ? 2 : 1)} µs`
  return `${ms.toFixed(2)} ms`
}

export function formatNumber(n, digits = 0) {
  if (n == null || !isFinite(n)) return '—'
  return Number.isInteger(n) ? String(n) : n.toFixed(digits || 2)
}
