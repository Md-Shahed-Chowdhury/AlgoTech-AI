/**
 * ConvergenceChart.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Inline-SVG line chart: x = step, one line per algorithm (color + dash
 * pattern), showing distance to goal. Crosshair tooltip on hover, direct end labels,
 * and a marker for the current playback step.
 */

import { useState, useRef } from 'react'
import { useCompareStore } from '../../store/useCompareStore.js'
import { ALGO_BY_ID } from '../../constants.js'
import styles from './ConvergenceChart.module.css'

const METRICS = [
  { id: 'distance', label: 'Distance to goal', help: 'True remaining cost from the node being expanded. A line that drops quickly to 0 means the search homes in on the goal; jumps upward mean it wandered away.' },
]

const W = 720
const H = 300
const M = { top: 16, right: 64, bottom: 34, left: 40 }
const PW = W - M.left - M.right
const PH = H - M.top - M.bottom

export default function ConvergenceChart({ comparison }) {
  const [chosenMetric, setMetric] = useState('distance')
  const [hover, setHover] = useState(null) // step index under the cursor
  const svgRef = useRef(null)
  const stepIndex = useCompareStore(s => s.stepIndex)

  const { ids, results } = comparison
  const metrics = METRICS.filter(m => !m.requires || ids.includes(m.requires))
  // Fall back if the chosen metric's algorithm left the race
  const metric = metrics.some(m => m.id === chosenMetric) ? chosenMetric : 'distance'
  const maxStep = Math.max(1, ...ids.map(id => results[id].totalSteps - 1))
  const maxVal = niceCeil(Math.max(1, ...ids.flatMap(id => results[id].series.map(p => p[metric] ?? 0))))

  const x = (step) => M.left + (step / maxStep) * PW
  const y = (v) => M.top + PH - (v / maxVal) * PH

  const xTicks = ticks(maxStep, 8)
  const yTicks = ticks(maxVal, 5)

  // End-of-line labels, nudged apart so they never overlap
  const ends = ids
    .map(id => {
      const pts = results[id].series.filter(p => p[metric] != null)
      const last = pts[pts.length - 1]
      return last ? { id, step: last.step, y: y(last[metric]) } : null
    })
    .filter(Boolean)
    .sort((a, b) => a.y - b.y)
  for (let i = 1; i < ends.length; i++) {
    if (ends[i].y - ends[i - 1].y < 13) ends[i].labelY = (ends[i - 1].labelY ?? ends[i - 1].y) + 13
  }

  const onMove = (e) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    const step = Math.round(((px - M.left) / PW) * maxStep)
    setHover(Math.max(0, Math.min(maxStep, step)))
  }

  const help = METRICS.find(m => m.id === metric).help

  return (
    <div className={styles.wrap}>
      <div className={styles.controls}>
        <div className={styles.metricTabs} role="tablist" aria-label="Chart metric">
          {metrics.map(m => (
            <button
              key={m.id}
              role="tab"
              aria-selected={metric === m.id}
              className={`${styles.metricBtn} ${metric === m.id ? styles.metricActive : ''}`}
              onClick={() => setMetric(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className={styles.legend}>
          {ids.map(id => (
            <span key={id} className={styles.legendItem}>
              <svg width="24" height="8" aria-hidden="true">
                <line x1="1" y1="4" x2="23" y2="4" stroke={ALGO_BY_ID[id].color} strokeWidth="2.5" strokeDasharray={ALGO_BY_ID[id].dash || undefined} />
              </svg>
              {ALGO_BY_ID[id].shortName}
            </span>
          ))}
        </div>
      </div>
      <p className={styles.help}>{help}</p>

      <div className={styles.chart}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className={styles.svg}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label={`${METRICS.find(m => m.id === metric).label} per step for ${ids.map(id => ALGO_BY_ID[id].shortName).join(', ')}`}
        >
          {/* Recessive grid + axes */}
          {yTicks.map(t => (
            <g key={`y${t}`}>
              <line x1={M.left} x2={M.left + PW} y1={y(t)} y2={y(t)} className={styles.grid} />
              <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className={styles.tick}>{t}</text>
            </g>
          ))}
          {xTicks.map(t => (
            <text key={`x${t}`} x={x(t)} y={M.top + PH + 18} textAnchor="middle" className={styles.tick}>{t}</text>
          ))}
          <line x1={M.left} x2={M.left + PW} y1={M.top + PH} y2={M.top + PH} className={styles.axis} />
          <text x={M.left + PW / 2} y={H - 2} textAnchor="middle" className={styles.axisLabel}>step</text>

          {/* Current playback position */}
          <line x1={x(Math.min(stepIndex, maxStep))} x2={x(Math.min(stepIndex, maxStep))} y1={M.top} y2={M.top + PH} className={styles.playhead} />

          {/* Series */}
          {ids.map(id => {
            const algo = ALGO_BY_ID[id]
            return (
              <path
                key={id}
                d={linePath(results[id].series, metric, x, y)}
                fill="none"
                stroke={algo.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={algo.dash || undefined}
              />
            )
          })}

          {/* End markers + direct labels */}
          {ends.map(e => {
            const algo = ALGO_BY_ID[e.id]
            const ly = e.labelY ?? e.y
            return (
              <g key={e.id}>
                <circle cx={x(e.step)} cy={e.y} r={4.5} fill={algo.color} className={styles.endDot} />
                {ids.length <= 4 && (
                  <text x={x(e.step) + 9} y={ly} dy="0.32em" className={styles.endLabel}>{algo.shortName}</text>
                )}
              </g>
            )
          })}

          {/* Crosshair */}
          {hover != null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={M.top} y2={M.top + PH} className={styles.crosshair} />
              {ids.map(id => {
                const p = results[id].series[hover]
                if (!p || p[metric] == null) return null
                return <circle key={id} cx={x(hover)} cy={y(p[metric])} r={4} fill={ALGO_BY_ID[id].color} className={styles.endDot} />
              })}
            </g>
          )}

          {/* Hit area larger than the marks */}
          <rect x={M.left} y={M.top} width={PW} height={PH} fill="transparent" />
        </svg>

        {hover != null && (
          <div
            className={styles.tooltip}
            style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > maxStep / 2 ? 'calc(-100% - 12px)' : '12px'})` }}
          >
            <div className={styles.tipTitle}>Step {hover}</div>
            {ids.map(id => {
              const r = results[id]
              const p = r.series[hover]
              return (
                <div key={id} className={styles.tipRow}>
                  <span className={styles.tipSwatch} style={{ background: ALGO_BY_ID[id].color }} />
                  <span className={styles.tipName}>{ALGO_BY_ID[id].shortName}</span>
                  <span className={styles.tipVal}>
                    {p ? (p[metric] ?? '—') : <em>done at {r.totalSteps - 1}</em>}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function linePath(series, metric, x, y) {
  let d = ''
  let pen = false
  for (const p of series) {
    const v = p[metric]
    if (v == null) { pen = false; continue }
    d += `${pen ? 'L' : 'M'} ${x(p.step).toFixed(1)} ${y(v).toFixed(1)} `
    pen = true
  }
  return d
}

function niceCeil(v) {
  if (v <= 5) return Math.ceil(v)
  const mag = 10 ** Math.floor(Math.log10(v))
  const n = v / mag
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10
  return nice * mag
}

function ticks(max, count) {
  const step = Math.max(1, Math.ceil(max / count))
  const out = []
  for (let t = 0; t <= max; t += step) out.push(t)
  return out
}
