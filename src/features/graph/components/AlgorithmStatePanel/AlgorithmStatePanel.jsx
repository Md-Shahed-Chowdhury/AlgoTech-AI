/**
 * AlgorithmStatePanel.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Algorithm State Panel rendering real-time step data structures:
 *  - Current Node, Selected Node, Visited Set, Frontier Set, Discovered Nodes, Current Path
 *  - Algorithm-specific data structure details:
 *      • BFS: FIFO Queue (queueBefore → queueAfter)
 *      • DFS: LIFO Stack (stackBefore → stackAfter)
 *      • UCS: Priority Queue table with g(n) path cost
 *      • Greedy: Priority Queue table with h(n) heuristic estimate
 *      • A*: Priority Queue table with g(n), h(n), and f(n) = g(n) + h(n)
 */

import { motion } from 'framer-motion'
import {
  Circle,
  Eye,
  Layers,
  ListOrdered,
  Footprints,
  Compass,
  ArrowRight,
} from 'lucide-react'
import { useAlgorithmStore } from '../../store/useAlgorithmStore.js'
import { ALGORITHM, ALGORITHM_META } from '../../types/graphTypes.js'
import styles from './AlgorithmStatePanel.module.css'

export default function AlgorithmStatePanel() {
  const currentStep = useAlgorithmStore(s => s.steps[s.currentStepIndex] ?? null)
  const selectedAlgorithm = useAlgorithmStore(s => s.selectedAlgorithm)
  const currentStepIndex = useAlgorithmStore(s => s.currentStepIndex)
  const totalSteps = useAlgorithmStore(s => s.steps.length)

  const meta = ALGORITHM_META[selectedAlgorithm]

  if (!currentStep) {
    return (
      <div className={`card ${styles.panel}`}>
        <div className={styles.emptyState}>
          <Compass size={24} className={styles.emptyIcon} />
          <p>Run the algorithm simulation to inspect step-by-step state changes.</p>
        </div>
      </div>
    )
  }

  const {
    currentNode,
    selectedNode,
    visitedNodes,
    frontierNodes,
    unexploredNodes,
    discoveredNodes,
    currentPath,
    frontierDetail,
    algorithmSpecificState,
    gCost,
    hCost,
    fCost,
  } = currentStep

  return (
    <div className={`card ${styles.panel}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.algoTag} style={{ color: meta?.color, background: `${meta?.color}18` }}>
            {meta?.shortName}
          </span>
          <span className={styles.panelTitleText}>Algorithm State</span>
        </div>
        <span className={styles.stepCounter}>
          Step {currentStepIndex + 1} / {totalSteps}
        </span>
      </div>

      {/* Nodes Summary (Current, Selected, Path) */}
      <div className={styles.nodeSummaryGrid}>
        <div className={styles.nodeSummaryTile}>
          <span className={styles.tileLabel}>Current Node</span>
          <span className={`${styles.tileValue} ${currentNode ? styles.valCurrent : styles.valEmpty}`}>
            {currentNode ?? 'None'}
          </span>
        </div>

        <div className={styles.nodeSummaryTile}>
          <span className={styles.tileLabel}>Selected Node</span>
          <span className={`${styles.tileValue} ${selectedNode ? styles.valSelected : styles.valEmpty}`}>
            {selectedNode ?? 'None'}
          </span>
        </div>
      </div>

      {/* Active Edge Evaluation Context */}
      {currentStep.parentNode && currentStep.neighborNode && (
        <div className={styles.neighborContextCard}>
          <span className={styles.neighborContextLabel}>Active Edge Evaluation</span>
          <div className={styles.neighborContextRow}>
            <span className={styles.parentChip}>{currentStep.parentNode}</span>
            <ArrowRight size={14} className={styles.contextArrow} />
            <span className={styles.neighborChip}>{currentStep.neighborNode}</span>
            {currentStep.edgeWeight !== undefined && (
              <span className={styles.weightBadge}>weight: {currentStep.edgeWeight}</span>
            )}
          </div>
        </div>
      )}

      {/* Current Path Breadcrumbs */}
      {currentPath && currentPath.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <Footprints size={13} /> Current Path
          </h3>
          <div className={styles.pathTrail}>
            {currentPath.map((id, idx) => (
              <span key={id} className={styles.pathStep}>
                <span className={styles.pathNodeChip}>{id}</span>
                {idx < currentPath.length - 1 && <ArrowRight size={11} className={styles.pathArrow} />}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Algorithm-Specific Data Structure Section (Queue / Stack / Priority Queue) */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <ListOrdered size={13} />{' '}
          {selectedAlgorithm === ALGORITHM.BFS && 'FIFO Queue'}
          {selectedAlgorithm === ALGORITHM.DFS && 'LIFO Stack'}
          {selectedAlgorithm !== ALGORITHM.BFS && selectedAlgorithm !== ALGORITHM.DFS && 'Priority Queue'}
        </h3>

        {/* BFS Queue Display */}
        {selectedAlgorithm === ALGORITHM.BFS && (
          <div className={styles.dsContainer}>
            <div className={styles.dsRow}>
              <span className={styles.dsSubLabel}>Queue Contents:</span>
              <div className={styles.chipsRow}>
                {(algorithmSpecificState?.queueAfter ?? frontierNodes).length === 0 ? (
                  <span className={styles.emptyText}>Empty Queue</span>
                ) : (
                  (algorithmSpecificState?.queueAfter ?? frontierNodes).map((id, idx) => (
                    <motion.span
                      key={`${id}-${idx}`}
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className={styles.queueChip}
                    >
                      {id}
                    </motion.span>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* DFS Stack Display */}
        {selectedAlgorithm === ALGORITHM.DFS && (
          <div className={styles.dsContainer}>
            <div className={styles.dsRow}>
              <span className={styles.dsSubLabel}>Stack Top → Bottom:</span>
              <div className={styles.chipsRow}>
                {(algorithmSpecificState?.stackAfter ?? frontierNodes).length === 0 ? (
                  <span className={styles.emptyText}>Empty Stack</span>
                ) : (
                  [...(algorithmSpecificState?.stackAfter ?? frontierNodes)].reverse().map((id, idx) => (
                    <motion.span
                      key={`${id}-${idx}`}
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className={styles.stackChip}
                    >
                      {id}
                    </motion.span>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* UCS / Greedy / A* Priority Queue Table */}
        {selectedAlgorithm !== ALGORITHM.BFS && selectedAlgorithm !== ALGORITHM.DFS && (
          <div className={styles.tableWrapper}>
            {frontierDetail && frontierDetail.length > 0 ? (
              <table className={styles.pqTable}>
                <thead>
                  <tr>
                    <th>Node</th>
                    {selectedAlgorithm === ALGORITHM.UCS && <th>g(n)</th>}
                    {selectedAlgorithm === ALGORITHM.GREEDY && <th>h(n)</th>}
                    {selectedAlgorithm === ALGORITHM.ASTAR && (
                      <>
                        <th>g(n)</th>
                        <th>h(n)</th>
                        <th>f(n)</th>
                      </>
                    )}
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {frontierDetail.map(entry => (
                    <tr key={entry.nodeId} className={entry.nodeId === currentNode ? styles.activeRow : ''}>
                      <td className={styles.nodeCell}>{entry.nodeId}</td>
                      {selectedAlgorithm === ALGORITHM.UCS && <td>{gCost[entry.nodeId] ?? entry.g ?? '—'}</td>}
                      {selectedAlgorithm === ALGORITHM.GREEDY && <td>{hCost[entry.nodeId] ?? entry.h ?? '—'}</td>}
                      {selectedAlgorithm === ALGORITHM.ASTAR && (
                        <>
                          <td>{gCost[entry.nodeId] ?? entry.g ?? '—'}</td>
                          <td>{hCost[entry.nodeId] ?? entry.h ?? '—'}</td>
                          <td className={styles.highlightCol}>{fCost[entry.nodeId] ?? entry.f ?? '—'}</td>
                        </>
                      )}
                      <td className={styles.priorityCell}>{entry.priority}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <span className={styles.emptyText}>Frontier is empty</span>
            )}
          </div>
        )}
      </div>

      {/* Visited / Explored Set */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Circle size={13} className={styles.visitedIcon} /> Visited / Explored ({visitedNodes.length})
        </h3>
        <div className={styles.chipsRow}>
          {visitedNodes.length === 0 ? (
            <span className={styles.emptyText}>None visited yet</span>
          ) : (
            visitedNodes.map(id => (
              <span key={id} className={styles.visitedChip}>
                {id}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Frontier / Unexplored Set */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Eye size={13} className={styles.frontierIcon} /> Frontier Nodes ({frontierNodes.length})
        </h3>
        <div className={styles.chipsRow}>
          {frontierNodes.length === 0 ? (
            <span className={styles.emptyText}>None in frontier</span>
          ) : (
            frontierNodes.map(id => (
              <span key={id} className={styles.frontierChip}>
                {id}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
