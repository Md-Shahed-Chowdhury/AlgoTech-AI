/**
 * MetricsPanel.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays algorithm performance metrics for the current step:
 *  - Nodes expanded / evaluated
 *  - Frontier size / candidate count
 *  - Path length / trajectory length
 *  - Total cost / current heuristic
 *  - Calculation breakdown (g/h/f formulas from engine)
 */

import { Activity, GitFork, Hash, DollarSign, Compass, Award } from 'lucide-react'
import { useAlgorithmStore } from '../../store/useAlgorithmStore.js'
import { ALGORITHM } from '../../types/graphTypes.js'
import styles from './MetricsPanel.module.css'

export default function MetricsPanel() {
  const currentStep = useAlgorithmStore(s => s.steps[s.currentStepIndex] ?? null)
  const selectedAlgorithm = useAlgorithmStore(s => s.selectedAlgorithm)

  if (!currentStep) {
    return (
      <div className={`card ${styles.panel}`}>
        <p className={styles.empty}>Metrics will appear here during playback.</p>
      </div>
    )
  }

  const { metrics, calculations, currentPath, goalReached, isFinal, action } = currentStep
  const curH = currentStep.hCost?.[currentStep.currentNode] ?? currentStep.algorithmSpecificState?.currentH ?? 0

  if (selectedAlgorithm === ALGORITHM.HILL_CLIMBING) {
    const hcMetrics = [
      { label: 'Nodes Evaluated', value: metrics?.nodesExpanded ?? 0, icon: Activity },
      { label: 'Moves Made', value: Math.max(0, (currentPath?.length ?? 1) - 1), icon: GitFork },
      { label: 'Current Heuristic', value: `h = ${curH}`, icon: Compass },
      { label: 'Trajectory Length', value: currentPath?.length ?? 1, icon: Hash },
      { label: 'Goal Status', value: goalReached ? 'Reached' : (action === 'LOCAL_OPTIMUM' ? 'Local Optimum' : 'Searching'), icon: Award },
      { label: 'Termination', value: isFinal ? (goalReached ? 'Target Reached' : 'Stuck at Local Optimum') : 'In Progress', icon: DollarSign },
    ]

    return (
      <div className={`card ${styles.panel}`}>
        <h2 className={styles.title}>Hill Climbing Metrics</h2>

        <div className={styles.grid}>
          {hcMetrics.map(({ label, value, icon: Icon }) => (
            <div key={label} className={styles.metric}>
              <Icon size={14} className={styles.metricIcon} />
              <span className={styles.metricLabel}>{label}</span>
              <span className={styles.metricValue}>{value}</span>
            </div>
          ))}
        </div>

        {calculations?.length > 0 && (
          <div className={styles.calculations}>
            <h3 className={styles.calcTitle}>Local Objective Calculation</h3>
            {calculations.map((calc, i) => (
              <code key={i} className={styles.calcLine}>{calc}</code>
            ))}
          </div>
        )}
      </div>
    )
  }

  const METRIC_ROWS = [
    { key: 'nodesExpanded',  label: 'Nodes Expanded', icon: Activity },
    { key: 'frontierSize',   label: 'Frontier Size',  icon: GitFork  },
    { key: 'pathLength',     label: 'Path Length',    icon: Hash     },
    { key: 'totalCost',      label: 'Total Cost',     icon: DollarSign },
  ]

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
