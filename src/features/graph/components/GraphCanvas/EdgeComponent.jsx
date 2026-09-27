/**
 * EdgeComponent.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Interactive SVG Edge line between two nodes with weight pill, directional arrows,
 * hover highlights, selection indicator, and Framer Motion animations.
 */

import { memo } from 'react'
import { motion } from 'framer-motion'
import { EDGE_STATE } from '../../types/graphTypes.js'
import styles from './GraphCanvas.module.css'

function EdgeComponent({
  edge,
  sourceNode,
  targetNode,
  state = EDGE_STATE.DEFAULT,
  isSelected = false,
  readOnly = false,
  onClick,
  onDoubleClick,
}) {
  if (!sourceNode || !targetNode) return null

  const x1 = sourceNode.x
  const y1 = sourceNode.y
  const x2 = targetNode.x
  const y2 = targetNode.y

  // Midpoint for weight label
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2

  // Distance for arrow offset
  const dx = x2 - x1
  const dy = y2 - y1
  const dist = Math.hypot(dx, dy) || 1

  // Point at edge of target node circle (radius 24px)
  const nodeRadius = 24
  const targetX = x2 - (nodeRadius * dx) / dist
  const targetY = y2 - (nodeRadius * dy) / dist

  return (
    <g className={`${styles.edgeGroup} ${styles[`edge--${state}`]} ${isSelected ? styles.edgeSelected : ''}`}>
      {/* Wide invisible line for click/hover target */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: readOnly ? 'default' : 'pointer' }}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      />

      {/* Main visible line */}
      <motion.line
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        x1={x1}
        y1={y1}
        x2={edge.directed ? targetX : x2}
        y2={edge.directed ? targetY : y2}
        className={styles.edgeLine}
        markerEnd={edge.directed ? 'url(#arrowhead)' : undefined}
      />

      {/* Selected highlight line background */}
      {isSelected && (
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#38bdf8"
          strokeWidth={5}
          strokeOpacity={0.6}
          strokeDasharray="4 4"
        />
      )}

      {/* Editable Weight Pill Badge */}
      <g
        transform={`translate(${mx}, ${my})`}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        style={{ cursor: readOnly ? 'default' : 'pointer' }}
      >
        <rect
          x="-14"
          y="-11"
          width="28"
          height="22"
          rx="6"
          className={`${styles.weightBadge} ${isSelected ? styles.weightBadgeSelected : ''}`}
        />
        <text
          textAnchor="middle"
          dominantBaseline="central"
          className={styles.weightText}
        >
          {edge.weight}
        </text>
      </g>
    </g>
  )
}

export default memo(EdgeComponent)
