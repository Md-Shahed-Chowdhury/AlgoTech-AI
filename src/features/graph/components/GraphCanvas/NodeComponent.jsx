/**
 * NodeComponent.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Interactive SVG Node element with drag support, Framer Motion animations,
 * state indicators (Start, Goal, Selected, Frontier, Visited, etc.), and badge flags.
 */

import { memo } from 'react'
import { motion } from 'framer-motion'
import { Flag, Target } from 'lucide-react'
import { NODE_STATE } from '../../types/graphTypes.js'
import styles from './GraphCanvas.module.css'

function NodeComponent({
  node,
  state = NODE_STATE.UNEXPLORED,
  costLabel,
  isSelected = false,
  isPendingSrc = false,
  readOnly = false,
  onPointerDown,
  onClick,
  onDoubleClick,
}) {
  const isStart = node.isStart
  const isGoal = node.isGoal

  // Framer Motion spring transition
  const spring = { type: 'spring', stiffness: 450, damping: 25 }

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      onPointerDown={onPointerDown}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`${styles.nodeGroup} ${styles[`node--${state}`]} ${isSelected ? styles.selected : ''} ${isPendingSrc ? styles.pendingSrc : ''}`}
      style={{ cursor: readOnly ? 'default' : 'grab' }}
      role="button"
      tabIndex={0}
      aria-label={`Node ${node.label} ${isStart ? '(Start)' : ''} ${isGoal ? '(Goal)' : ''}`}
    >
      {/* Outer selection ring animation */}
      {(isSelected || isPendingSrc) && (
        <motion.circle
          r={32}
          fill="none"
          stroke={isPendingSrc ? '#f59e0b' : '#38bdf8'}
          strokeWidth={2.5}
          strokeDasharray="6 4"
          initial={{ rotate: 0, scale: 0.8 }}
          animate={{ rotate: 360, scale: 1 }}
          transition={{ rotate: { repeat: Infinity, duration: 8, ease: 'linear' }, scale: spring }}
        />
      )}

      {/* Main node circle */}
      <circle r={24} className={styles.nodeCircle} />

      {/* Start / Goal badge glow ring */}
      {isStart && <circle r={27} fill="none" stroke="#10b981" strokeWidth={2.5} className={styles.startGlow} />}
      {isGoal && <circle r={27} fill="none" stroke="#f43f5e" strokeWidth={2.5} className={styles.goalGlow} />}

      {/* Node label */}
      <text
        textAnchor="middle"
        dominantBaseline="central"
        className={styles.nodeText}
      >
        {node.label}
      </text>

      {/* Start / Goal Badge Pill above/below node */}
      {isStart && (
        <g transform="translate(0, -36)">
          <rect x="-24" y="-10" width="48" height="18" rx="9" fill="#10b981" className={styles.badgeRect} />
          <text textAnchor="middle" y="3" fill="#ffffff" fontSize="9" fontWeight="800" letterSpacing="0.5">
            START
          </text>
        </g>
      )}

      {isGoal && (
        <g transform="translate(0, -36)">
          <rect x="-22" y="-10" width="44" height="18" rx="9" fill="#f43f5e" className={styles.badgeRect} />
          <text textAnchor="middle" y="3" fill="#ffffff" fontSize="9" fontWeight="800" letterSpacing="0.5">
            GOAL
          </text>
        </g>
      )}

      {/* Cost Label (g/f cost during search) */}
      {costLabel !== undefined && costLabel !== null && (
        <g transform="translate(0, 36)">
          <rect x="-20" y="-8" width="40" height="16" rx="4" fill="rgba(15, 23, 42, 0.85)" stroke="#6366f1" strokeWidth="1" />
          <text textAnchor="middle" y="3" className={styles.costText}>
            {typeof costLabel === 'number' ? (Number.isInteger(costLabel) ? costLabel : costLabel.toFixed(1)) : costLabel}
          </text>
        </g>
      )}
    </g>
  )
}

export default memo(NodeComponent)
