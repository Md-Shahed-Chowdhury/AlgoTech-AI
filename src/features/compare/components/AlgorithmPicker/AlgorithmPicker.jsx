/**
 * AlgorithmPicker.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Toggle chips for choosing which algorithms race (2–5).
 */

import { Check } from 'lucide-react'
import { useCompareStore, MIN_SELECTED } from '../../store/useCompareStore.js'
import { COMPARE_ALGOS } from '../../constants.js'
import styles from './AlgorithmPicker.module.css'

export default function AlgorithmPicker() {
  const selected = useCompareStore(s => s.selected)
  const toggleAlgo = useCompareStore(s => s.toggleAlgo)
  const selectAll = useCompareStore(s => s.selectAll)
  const setSelected = useCompareStore(s => s.setSelected)

  const allSelected = selected.length === COMPARE_ALGOS.length

  return (
    <div className={styles.picker}>
      <div className={styles.labelRow}>
        <span className={styles.label}>Algorithms</span>
        <span className={`${styles.count} ${selected.length < MIN_SELECTED ? styles.countWarn : ''}`}>
          {selected.length} / {COMPARE_ALGOS.length} selected
          {selected.length < MIN_SELECTED && ` · pick at least ${MIN_SELECTED}`}
        </span>
        <button
          className={styles.allBtn}
          onClick={() => (allSelected ? setSelected(['bfs', 'astar']) : selectAll())}
        >
          {allSelected ? 'Reset' : 'Select all'}
        </button>
      </div>

      <div className={styles.chips} role="group" aria-label="Algorithms to compare">
        {COMPARE_ALGOS.map(algo => {
          const on = selected.includes(algo.id)
          return (
            <button
              key={algo.id}
              id={`compare-algo-${algo.id}`}
              className={`${styles.chip} ${on ? styles.chipOn : ''}`}
              style={{ '--c': algo.color }}
              onClick={() => toggleAlgo(algo.id)}
              aria-pressed={on}
              title={algo.description}
            >
              <span className={styles.check}>{on && <Check size={11} strokeWidth={3.5} />}</span>
              <span className={styles.chipText}>
                <span className={styles.short}>{algo.shortName}</span>
                <span className={styles.full}>{algo.name}</span>
              </span>
              <span className={styles.complexity}>{algo.complexity.time}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
