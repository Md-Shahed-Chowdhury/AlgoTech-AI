/**
 * AlgorithmPicker.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Toggle chips for choosing which algorithms race (2–7), grouped into
 * systematic search and local search.
 */

import { Check } from 'lucide-react'
import { useCompareStore, MIN_SELECTED } from '../../store/useCompareStore.js'
import { COMPARE_ALGOS, FAMILY } from '../../constants.js'
import styles from './AlgorithmPicker.module.css'

const GROUPS = [
  { family: FAMILY.SYSTEMATIC, label: 'Systematic search', hint: 'Explore a frontier; complete on finite graphs' },
  { family: FAMILY.LOCAL,      label: 'Local search',      hint: 'Walk one node at a time by h(n); O(1) memory' },
]

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

      {GROUPS.map(group => (
        <div key={group.family} className={styles.group}>
          <div className={styles.groupHead}>
            <span className={styles.groupLabel}>{group.label}</span>
            <span className={styles.groupHint}>{group.hint}</span>
          </div>
          <div className={styles.chips} role="group" aria-label={group.label}>
            {COMPARE_ALGOS.filter(a => a.family === group.family).map(algo => {
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
                  <span className={styles.complexity}>{algo.complexity.space === 'O(1)' ? 'O(1) mem' : algo.complexity.time}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
