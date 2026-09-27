/**
 * AlgorithmStatePanel.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays the current algorithm data structure state:
 *  - Queue / Stack / Priority Queue contents
 *  - Visited set
 *  - Parent map
 *  - Current step index & total steps
 *
 * STUB — full rendering in next phase.
 */

import { useAlgorithmStore } from '../../store/useAlgorithmStore.js'
import { ALGORITHM_META }    from '../../types/graphTypes.js'
import styles from './AlgorithmStatePanel.module.css'

export default function AlgorithmStatePanel() {
  const currentStep       = useAlgorithmStore(s => s.steps[s.currentStepIndex] ?? null)
  const selectedAlgorithm = useAlgorithmStore(s => s.selectedAlgorithm)
  const currentStepIndex  = useAlgorithmStore(s => s.currentStepIndex)
  const totalSteps        = useAlgorithmStore(s => s.steps.length)

  const meta = ALGORITHM_META[selectedAlgorithm]

  if (!currentStep) {
    return (
      <div className={`card ${styles.panel}`}>
        <p className={styles.empty}>Run the algorithm to see step-by-step state.</p>
      </div>
    )
  }

  return (
    <div className={`card ${styles.panel}`}>
      <div className={styles.header}>
        <span className={styles.algoTag} style={{ color: meta?.color }}>
          {meta?.shortName}
        </span>
        <span className={styles.stepCounter}>
          Step {currentStepIndex + 1} / {totalSteps}
        </span>
      </div>

      {/* Frontier */}
      <Section title="Frontier" items={currentStep.frontierNodes} color="var(--accent)" />

      {/* Visited */}
      <Section title="Visited" items={currentStep.visitedNodes} color="var(--text-muted)" />

      {/* Priority detail (UCS / Greedy / A*) */}
      {currentStep.frontierDetail?.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Priority Queue</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Node</th>
                {currentStep.gCost && Object.keys(currentStep.gCost).length > 0 && <th>g</th>}
                {currentStep.hCost && Object.keys(currentStep.hCost).length > 0 && <th>h</th>}
                <th>priority</th>
              </tr>
            </thead>
            <tbody>
              {currentStep.frontierDetail.map(entry => (
                <tr key={entry.nodeId}>
                  <td>{entry.nodeId}</td>
                  {entry.g !== undefined && <td>{typeof entry.g === 'number' ? entry.g.toFixed(1) : entry.g}</td>}
                  {entry.h !== undefined && <td>{typeof entry.h === 'number' ? entry.h.toFixed(2) : entry.h}</td>}
                  <td>{typeof entry.priority === 'number' ? entry.priority.toFixed(2) : entry.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Section({ title, items, color }) {
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <div className={styles.chips}>
        {items.length === 0
          ? <span className={styles.empty}>—</span>
          : items.map(id => (
              <span key={id} className={styles.chip} style={{ borderColor: color }}>
                {id}
              </span>
            ))
        }
      </div>
    </div>
  )
}
