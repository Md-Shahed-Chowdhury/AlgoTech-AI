/**
 * SplitView.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * One read-only, color-tinted GraphCanvas per algorithm, all driven by the
 * shared step clock. Finished searches freeze with a finishing-place badge.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { Flag, XCircle, Loader2, Mountain, Thermometer } from 'lucide-react'
import GraphCanvas from '../../../graph/components/GraphCanvas/GraphCanvas.jsx'
import { useCompareStore, stepFor, isFinishedAt } from '../../store/useCompareStore.js'
import { ALGO_BY_ID } from '../../constants.js'
import { LOCAL_SEARCH } from '../../engine/runAny.js'
import { getNodeHeuristic } from '../../../graph/utils/graphUtils.js'
import styles from './SplitView.module.css'

const ORDINAL = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th']

export default function SplitView({ graph, viewBox }) {
  const comparison = useCompareStore(s => s.comparison)
  const stepIndex = useCompareStore(s => s.stepIndex)
  if (!comparison) return null

  return (
    <div className={styles.grid} data-count={comparison.ids.length}>
      <AnimatePresence initial={false}>
        {comparison.ids.map(id => (
          <motion.div
            key={id}
            layout
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            className={styles.cell}
          >
            <RacePanel result={comparison.results[id]} stepIndex={stepIndex} graph={graph} viewBox={viewBox} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

function RacePanel({ result, stepIndex, graph, viewBox }) {
  const algo = ALGO_BY_ID[result.id]
  const step = stepFor(result, stepIndex)
  const finished = isFinishedAt(result, stepIndex)
  const shownIndex = Math.min(stepIndex, result.totalSteps - 1)
  const progress = result.totalSteps > 1 ? shownIndex / (result.totalSteps - 1) : 1

  return (
    <article className={`${styles.panel} ${finished ? styles.panelDone : ''}`} style={{ '--c': algo.color }}>
      <header className={styles.head}>
        <span className={styles.swatch} aria-hidden="true" />
        <div className={styles.titleBlock}>
          <h3 className={styles.name}>{algo.shortName}</h3>
          <span className={styles.fullName}>{algo.name}</span>
        </div>
        <StatusBadge result={result} finished={finished} />
      </header>

      <div className={styles.progressTrack}>
        <motion.div
          className={styles.progressFill}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.25 }}
        />
      </div>

      <div className={styles.stats}>
        {result.isLocal ? (
          <>
            <Stat label="Iterations" value={step?.metrics?.nodesExpanded ?? 0} />
            {result.id === LOCAL_SEARCH.ANNEALING
              ? <Stat label="Temp T" value={step?.algorithmSpecificState?.temperature ?? '—'} />
              : <Stat label="h(current)" value={step?.currentNode ? getNodeHeuristic(step.currentNode, graph) : '—'} />}
          </>
        ) : (
          <>
            <Stat label="Expanded" value={step?.metrics?.nodesExpanded ?? 0} />
            <Stat label="Frontier" value={step?.metrics?.frontierSize ?? 0} />
          </>
        )}
        <Stat label="Step" value={`${shownIndex}/${result.totalSteps - 1}`} />
        <Stat label="Path cost" value={finished && result.pathFound ? result.realCost : '—'} highlight={finished && result.pathFound} />
      </div>

      <div className={styles.canvas}>
        <GraphCanvas readOnly graph={graph} activeStep={step} accentColor={algo.color} viewBox={viewBox} />
      </div>

      <footer className={styles.foot}>
        {finished && result.pathFound ? (
          <span className={styles.path}>
            {result.pathNodes.join(' → ')}
            {result.isOptimal
              ? <span className={styles.optimal}>optimal</span>
              : <span className={styles.subopt}>+{Math.round((result.optimalityRatio - 1) * 100)}% cost</span>}
          </span>
        ) : (
          <span className={styles.reason}>{step?.reason ?? '—'}</span>
        )}
      </footer>
    </article>
  )
}

function StatusBadge({ result, finished }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {!finished ? (
        <motion.span key="run" className={`${styles.badge} ${styles.badgeRun}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Loader2 size={12} className={styles.spin} /> Searching
        </motion.span>
      ) : result.pathFound ? (
        <motion.span
          key="done"
          className={`${styles.badge} ${styles.badgeDone}`}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 18 }}
        >
          <Flag size={12} /> {ORDINAL[result.finishRank] ?? `#${result.finishRank}`} · step {result.stepsToGoal}
        </motion.span>
      ) : (
        <motion.span key="fail" className={`${styles.badge} ${styles.badgeFail}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {result.endReason === 'LOCAL_MINIMUM' ? (
            <><Mountain size={12} /> Stuck at {result.stuckAt}</>
          ) : result.endReason === 'FROZEN' ? (
            <><Thermometer size={12} /> Frozen at {result.stuckAt}</>
          ) : (
            <><XCircle size={12} /> No path</>
          )}
        </motion.span>
      )}
    </AnimatePresence>
  )
}

function Stat({ label, value, highlight }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={`${styles.statValue} ${highlight ? styles.statHighlight : ''}`}>{value}</span>
    </div>
  )
}
