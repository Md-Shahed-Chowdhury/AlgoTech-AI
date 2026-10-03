/**
 * MetricsTable.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Side-by-side numbers for every algorithm. The best measured value in each
 * row is highlighted; theory rows (complexity, guarantees) are not ranked.
 */

import { Crown, Check, X } from 'lucide-react'
import { ALGO_BY_ID, formatTime } from '../../constants.js'
import styles from './MetricsTable.module.css'

// `value` returns a number used to find the best cell (lower is better unless
// `higher` is set); `show` renders the cell.
const ROWS = [
  { group: 'Solution quality' },
  { label: 'Path found', show: r => <Bool value={r.pathFound} /> },
  { label: 'Path', show: r => (r.pathFound ? r.pathNodes.join(' → ') : '—'), mono: true },
  { label: 'Path cost', value: r => r.realCost, show: r => r.realCost ?? '—' },
  { label: 'Cost vs optimal', value: r => r.optimalityRatio, show: r => (r.optimalityRatio == null ? '—' : `${r.optimalityRatio.toFixed(2)}×`) },
  { label: 'Hops (edges)', show: r => r.hops ?? '—' },

  { group: 'Efficiency' },
  { label: 'Nodes expanded', hint: 'Iterations for local search', value: r => r.nodesExpanded, show: r => r.nodesExpanded },
  { label: 'Wasted expansions', hint: 'Expanded but not on the final path', value: r => r.wastedExpansions, show: r => r.wastedExpansions },
  { label: 'Peak frontier (memory)', value: r => r.maxFrontier, show: r => r.maxFrontier },

  { group: 'Convergence & time' },
  { label: 'Steps to finish', value: r => r.stepsToGoal, show: r => r.stepsToGoal ?? '—' },
  { label: 'Avg execution time', hint: 'Averaged over repeated runs', value: r => r.timeMs, show: r => formatTime(r.timeMs) },

  { group: 'Robustness', localOnly: true },
  { label: 'Success rate', hint: 'Seeded re-runs reaching the goal', value: r => r.robustness?.successRate, higher: true, anyOutcome: true, show: r => (r.robustness ? `${Math.round(r.robustness.successRate * 100)}% (${r.robustness.successes}/${r.robustness.trials})` : '—') },
  { label: 'Avg cost (successful runs)', value: r => r.robustness?.avgCost, show: r => (r.robustness?.avgCost != null ? formatAvg(r.robustness.avgCost) : '—') },
  { label: 'Distance walked', hint: 'Total weight moved, including loops', value: r => r.walkedCost, show: r => r.walkedCost ?? '—' },

  { group: 'Theory' },
  { label: 'Time complexity', show: (r, a) => a.complexity.time, mono: true },
  { label: 'Space complexity', show: (r, a) => a.complexity.space, mono: true },
  { label: 'Complete?', show: (r, a) => a.complete },
  { label: 'Optimal?', show: (r, a) => a.optimal },
]

export default function MetricsTable({ comparison }) {
  const { ids, results, baseline } = comparison

  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.metricCol}>
              Metric
              {baseline.optimalCost != null && <span className={styles.baseline}>optimal cost = {baseline.optimalCost}</span>}
            </th>
            {ids.map(id => (
              <th key={id} style={{ '--c': ALGO_BY_ID[id].color }}>
                <span className={styles.algoHead}>
                  <span className={styles.swatch} />
                  {ALGO_BY_ID[id].shortName}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRows(ROWS, results, ids).map((row, i) => {
            if (row.group) {
              return (
                <tr key={`g${i}`} className={styles.groupRow}>
                  <td colSpan={ids.length + 1}>{row.group}</td>
                </tr>
              )
            }
            const best = row.value ? bestIds(ids, results, row) : []
            return (
              <tr key={row.label}>
                <th scope="row" className={styles.metricCol}>
                  {row.label}
                  {row.hint && <span className={styles.rowHint}>{row.hint}</span>}
                </th>
                {ids.map(id => {
                  const isBest = best.includes(id)
                  return (
                    <td
                      key={id}
                      className={`${row.mono ? styles.mono : ''} ${isBest ? styles.best : ''}`}
                      style={{ '--c': ALGO_BY_ID[id].color }}
                    >
                      {row.show(results[id], ALGO_BY_ID[id])}
                      {isBest && <Crown size={12} className={styles.crown} aria-label="best" />}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** Drop the Robustness group (header + rows) when no local search is racing. */
function visibleRows(rows, results, ids) {
  const hasLocal = ids.some(id => results[id].isLocal)
  const out = []
  let skipping = false
  for (const row of rows) {
    if (row.group) skipping = !!row.localOnly && !hasLocal
    if (!skipping) out.push(row)
  }
  return out
}

const formatAvg = (v) => (Number.isInteger(v) ? v : v.toFixed(1))

/**
 * Ids holding the best value in a row; none when every value is identical.
 * Searches that never reached the goal cannot take the crown (being fast or
 * frugal while failing is not "best"), except on rows marked `anyOutcome`.
 */
function bestIds(ids, results, row) {
  const pool = row.anyOutcome ? ids : ids.filter(id => results[id].pathFound)
  const vals = pool.map(id => row.value(results[id])).filter(v => v != null && isFinite(v))
  if (vals.length < 2) return []
  const best = row.higher ? Math.max(...vals) : Math.min(...vals)
  const all = pool.filter(id => row.value(results[id]) === best)
  return all.length === ids.length ? [] : all
}

function Bool({ value }) {
  return value
    ? <span className={styles.yes}><Check size={13} strokeWidth={3} /> Yes</span>
    : <span className={styles.no}><X size={13} strokeWidth={3} /> No</span>
}
