/**
 * MetricsPanel.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays algorithm performance metrics for the current step:
 *  - Nodes expanded
 *  - Frontier size
 *  - Path length
 *  - Total cost
 *  - Calculation breakdown (g/h/f formulas from engine)
 *
 * STUB — full rendering in next phase.
 */

import { Activity, GitFork, Hash, DollarSign } from 'lucide-react'
import { useAlgorithmStore } from '../../store/useAlgorithmStore.js'
import styles from './MetricsPanel.module.css'

const METRIC_ROWS = [
  { key: 'nodesExpanded',  label: 'Nodes Expanded', icon: Activity },
  { key: 'frontierSize',   label: 'Frontier Size',  icon: GitFork  },
  { key: 'pathLength',     label: 'Path Length',    icon: Hash     },
  { key: 'totalCost',      label: 'Total Cost',     icon: DollarSign },
]

export default function MetricsPanel() {
  const currentStep = useAlgorithmStore(s => s.steps[s.currentStepIndex] ?? null)

  if (!currentStep) {
    return (
      <div className={`card ${styles.panel}`}>
        <p className={styles.empty}>Metrics will appear here during playback.</p>
      </div>
    )
  }

  const { metrics, calculations } = currentStep

  return (
    <div className={`card ${styles.panel}`}>
      <h2 className={styles.title}>Metrics</h2>

      <div className={styles.grid}>
        {METRIC_ROWS.map(({ key, label, icon: Icon }) => (
          <div key={key} className={styles.metric}>
            <Icon size={14} className={styles.metricIcon} />
            <span className={styles.metricLabel}>{label}</span>
            <span className={styles.metricValue}>
              {metrics?.[key] ?? 0}
            </span>
          </div>
        ))}
      </div>

      {/* Calculations (g/h/f breakdown) */}
      {calculations?.length > 0 && (
        <div className={styles.calculations}>
          <h3 className={styles.calcTitle}>Calculation</h3>
          {calculations.map((calc, i) => (
            <code key={i} className={styles.calcLine}>{calc}</code>
          ))}
        </div>
      )}
    </div>
  )
}
