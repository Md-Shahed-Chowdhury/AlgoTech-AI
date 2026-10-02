/**
 * constants.js — Comparison-mode identity for each algorithm.
 * ─────────────────────────────────────────────────────────────────────────────
 * Colors match ALGORITHM_META except DFS: its violet (#8b5cf6) is nearly
 * indistinguishable from BFS indigo when both share one chart, so comparison
 * mode uses cyan for DFS. Every algorithm also gets a dash pattern so lines are
 * never identified by color alone.
 *
 * Local-search algorithms (Hill Climbing, Simulated Annealing) are Compare-only:
 * they are NOT in the shared ALGORITHM / ALGORITHM_META registry, so their
 * metadata lives here.
 */

import { ALGORITHM, ALGORITHM_META } from '../graph/types/graphTypes.js'
import { LOCAL_SEARCH } from './engine/runAny.js'

export const FAMILY = { SYSTEMATIC: 'systematic', LOCAL: 'local' }

const SYSTEMATIC = [
  { id: ALGORITHM.BFS,    color: '#6366f1', dash: '',          complete: 'Yes', optimal: 'Only if unweighted' },
  { id: ALGORITHM.DFS,    color: '#22d3ee', dash: '7 4',       complete: 'Finite graphs', optimal: 'No' },
  { id: ALGORITHM.UCS,    color: '#10b981', dash: '2 4',       complete: 'Yes', optimal: 'Yes' },
  { id: ALGORITHM.GREEDY, color: '#f59e0b', dash: '10 4 2 4',  complete: 'Finite graphs', optimal: 'No' },
  { id: ALGORITHM.ASTAR,  color: '#f43f5e', dash: '4 3 4 8',   complete: 'Yes', optimal: 'If h is admissible' },
].map(a => ({ ...a, family: FAMILY.SYSTEMATIC, ...pickMeta(ALGORITHM_META[a.id]) }))

const LOCAL = [
  {
    id: LOCAL_SEARCH.HILL,
    name: 'Hill Climbing',
    shortName: 'Hill',
    color: '#a3e635',
    dash: '1 3',
    complexity: { time: 'O(iterations · b)', space: 'O(1)' },
    complete: 'No: stops at local minima',
    optimal: 'No',
    description: 'Always moves to the neighbor with the lowest h(n). Uses almost no memory but gets stuck at local minima.',
  },
  {
    id: LOCAL_SEARCH.ANNEALING,
    name: 'Simulated Annealing',
    shortName: 'SA',
    color: '#e879f9',
    dash: '12 3 2 3 2 3',
    complexity: { time: 'O(iterations)', space: 'O(1)' },
    complete: 'Only with very slow cooling',
    optimal: 'No',
    description: 'Random moves; accepts worse moves with probability e^(−ΔE/T) so it can escape local minima as the temperature cools.',
  },
].map(a => ({ ...a, family: FAMILY.LOCAL }))

export const COMPARE_ALGOS = [...SYSTEMATIC, ...LOCAL]

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
