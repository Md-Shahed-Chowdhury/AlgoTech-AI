/**
 * OverlayView.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * All selected algorithms layered on ONE graph.
 *  - Every node carries a ring split into one arc per algorithm: solid arc =
 *    visited, dashed = in frontier, glowing = currently expanding.
 *  - Each found path is drawn in the algorithm's color and dash pattern, offset
 *    sideways so overlapping paths stay visible.
 *  - Hovering a legend entry focuses that algorithm and dims the rest.
 */

import { Flag, XCircle, Loader2 } from 'lucide-react'
import { useCompareStore, stepFor, isFinishedAt } from '../../store/useCompareStore.js'
import { ALGO_BY_ID } from '../../constants.js'
import { getNodeHeuristic } from '../../../graph/utils/graphUtils.js'
import styles from './OverlayView.module.css'

const NODE_R = 22
const RING_R = 31
const PATH_GAP = 5.5

export default function OverlayView({ graph, viewBox }) {
  const comparison = useCompareStore(s => s.comparison)
  const stepIndex = useCompareStore(s => s.stepIndex)
  const focusedAlgo = useCompareStore(s => s.focusedAlgo)
  const setFocusedAlgo = useCompareStore(s => s.setFocusedAlgo)
  if (!comparison || !graph) return null

  const { ids, results } = comparison
  const k = ids.length
  const steps = Object.fromEntries(ids.map(id => [id, stepFor(results[id], stepIndex)]))
  const opacityFor = (id) => (!focusedAlgo || focusedAlgo === id ? 1 : 0.12)

  const nodes = Object.values(graph.nodes)
  const edges = Object.values(graph.edges)
  const [, , vbW, vbH] = viewBox.split(' ').map(Number)

  return (
    <div className={styles.wrap}>
      <div className={styles.canvas} style={{ aspectRatio: `${vbW} / ${vbH}` }}>
        <svg className={styles.svg} viewBox={viewBox} role="img" aria-label="All selected algorithms overlaid on one graph">
          <defs>
            <pattern id="overlayDots" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="12" cy="12" r="1.2" fill="var(--border)" opacity="0.45" />
            </pattern>
          </defs>
          <rect x="-2000" y="-2000" width="5000" height="5000" fill="url(#overlayDots)" />

          {/* Base edges */}
          {edges.map(e => {
            const a = graph.nodes[e.sourceId]
            const b = graph.nodes[e.targetId]
            if (!a || !b) return null
            return <line key={e.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={styles.edge} />
          })}

          {/* Found paths, one offset lane per algorithm */}
          {ids.map((id, i) => {
            const pathNodes = steps[id]?.pathNodes ?? []
            if (pathNodes.length < 2) return null
            const offset = (i - (k - 1) / 2) * PATH_GAP
            const algo = ALGO_BY_ID[id]
            return (
              <g key={id} style={{ opacity: opacityFor(id) }} className={styles.fade}>
                {pathNodes.slice(0, -1).map((from, j) => {
                  const a = graph.nodes[from]
                  const b = graph.nodes[pathNodes[j + 1]]
                  if (!a || !b) return null
                  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
                  const nx = (-(b.y - a.y) / len) * offset
                  const ny = ((b.x - a.x) / len) * offset
                  return (
                    <line
                      key={j}
                      x1={a.x + nx} y1={a.y + ny} x2={b.x + nx} y2={b.y + ny}
                      stroke={algo.color}
                      strokeWidth={3.5}
                      strokeLinecap="round"
                      strokeDasharray={algo.dash || undefined}
                      className={styles.pathLine}
                    />
                  )
                })}
              </g>
            )
          })}

          {/* Edge weight badges (above path lanes so they stay readable) */}
          {edges.map(e => {
            const a = graph.nodes[e.sourceId]
            const b = graph.nodes[e.targetId]
            if (!a || !b) return null
            const mx = (a.x + b.x) / 2
            const my = (a.y + b.y) / 2
            return (
              <g key={e.id} transform={`translate(${mx}, ${my})`}>
                <rect x={-12} y={-10} width={24} height={20} rx={6} className={styles.weightBadge} />
                <text textAnchor="middle" dy="0.35em" className={styles.weightText}>{e.weight}</text>
              </g>
            )
          })}

          {/* Nodes with per-algorithm ring slices */}
          {nodes.map(node => (
            <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
              {ids.map((id, i) => (
                <RingSlice
                  key={id}
                  index={i}
                  count={k}
                  color={ALGO_BY_ID[id].color}
                  state={nodeStateFor(steps[id], node.id)}
                  opacity={opacityFor(id)}
                />
              ))}
              <circle
                r={NODE_R}
                className={`${styles.node} ${node.isStart ? styles.start : ''} ${node.isGoal ? styles.goal : ''}`}
              />
              <text textAnchor="middle" dy="0.35em" className={styles.nodeText}>{node.label}</text>
              <text textAnchor="middle" y={RING_R + 15} className={styles.hText}>h={getNodeHeuristic(node.id, graph)}</text>
              {(node.isStart || node.isGoal) && (
                <text textAnchor="middle" y={-RING_R - 8} className={node.isStart ? styles.startTag : styles.goalTag}>
                  {node.isStart ? 'START' : 'GOAL'}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>

      {/* Legend: hover to focus one algorithm */}
      <div className={styles.legend} onMouseLeave={() => setFocusedAlgo(null)}>
        {ids.map(id => {
          const algo = ALGO_BY_ID[id]
          const r = results[id]
          const finished = isFinishedAt(r, stepIndex)
          return (
            <button
              key={id}
              className={`${styles.legendItem} ${focusedAlgo === id ? styles.legendFocused : ''}`}
              style={{ '--c': algo.color }}
              onMouseEnter={() => setFocusedAlgo(id)}
              onFocus={() => setFocusedAlgo(id)}
              onBlur={() => setFocusedAlgo(null)}
              onClick={() => setFocusedAlgo(focusedAlgo === id ? null : id)}
            >
              <svg width="28" height="10" aria-hidden="true">
                <line x1="2" y1="5" x2="26" y2="5" stroke={algo.color} strokeWidth="3.5" strokeLinecap="round" strokeDasharray={algo.dash || undefined} />
              </svg>
              <span className={styles.legendName}>{algo.shortName}</span>
              <span className={styles.legendStatus}>
                {!finished ? (
                  <><Loader2 size={11} className={styles.spin} /> {stepFor(r, stepIndex)?.metrics?.nodesExpanded ?? 0} expanded</>
                ) : r.pathFound ? (
                  <><Flag size={11} /> #{r.finishRank} · cost {r.realCost}</>
                ) : (
                  <><XCircle size={11} /> no path</>
                )}
              </span>
            </button>
          )
        })}
      </div>

      <div className={styles.key}>
        <span><KeySwatch kind="visited" /> visited</span>
        <span><KeySwatch kind="frontier" /> in frontier</span>
        <span><KeySwatch kind="current" /> expanding now</span>
        <span className={styles.keyNote}>Each ring is split into one arc per algorithm, in legend order clockwise from the top.</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function nodeStateFor(step, nodeId) {
  if (!step) return 'none'
  if (step.currentNode === nodeId && !step.isFinal) return 'current'
  if (step.visitedNodes?.includes(nodeId)) return 'visited'
  if (step.frontierNodes?.includes(nodeId)) return 'frontier'
  return 'none'
}

function polar(r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180
  return [r * Math.cos(rad), r * Math.sin(rad)]
}

function arcPath(r, start, end) {
  const [x1, y1] = polar(r, start)
  const [x2, y2] = polar(r, end)
  const large = end - start > 180 ? 1 : 0
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
}

function RingSlice({ index, count, color, state, opacity }) {
  const slice = 360 / count
  const gap = count > 1 ? 10 : 0
  const start = index * slice + gap / 2
  // A single full-circle arc degenerates; stop just short of 360°
  const end = Math.min((index + 1) * slice - gap / 2, start + 359.5)
  const d = arcPath(RING_R, start, end)

  const common = { d, fill: 'none', strokeLinecap: 'round', style: { opacity }, className: styles.fade }
  switch (state) {
    case 'current':
      return <path {...common} stroke={color} strokeWidth={7} style={{ opacity, filter: `drop-shadow(0 0 6px ${color})` }} />
    case 'visited':
      return <path {...common} stroke={color} strokeWidth={5} />
    case 'frontier':
      return <path {...common} stroke={color} strokeWidth={2.5} strokeDasharray="4 4" />
    default:
      return <path {...common} stroke="rgba(255,255,255,0.08)" strokeWidth={2} />
  }
}

function KeySwatch({ kind }) {
  const props = {
    visited:  { strokeWidth: 5 },
    frontier: { strokeWidth: 2.5, strokeDasharray: '4 4' },
    current:  { strokeWidth: 7, style: { filter: 'drop-shadow(0 0 4px var(--accent-light))' } },
  }[kind]
  return (
    <svg width="26" height="12" aria-hidden="true">
      <line x1="4" y1="6" x2="22" y2="6" stroke="var(--accent-light)" strokeLinecap="round" {...props} />
    </svg>
  )
}
