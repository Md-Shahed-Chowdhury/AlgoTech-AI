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
 *      • Hill Climbing: Current state, h(current), candidate neighbor evaluation, selected move, local status
 *      • Simulated Annealing: Current state, temperature T, proposed move, ΔE / p / r acceptance test
 */

import { motion } from 'framer-motion'
import {
  Circle,
  Eye,
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

  const isSA = selectedAlgorithm === ALGORITHM.SIMULATED_ANNEALING
  const isLocal = selectedAlgorithm === ALGORITHM.HILL_CLIMBING || isSA

  const {
    currentNode,
    selectedNode,
    visitedNodes,
    frontierNodes,
    currentPath,
    frontierDetail,
    algorithmSpecificState,
    gCost,
    hCost,
    fCost,
    action,
    goalReached,
  } = currentStep

  const curH = hCost?.[currentNode] ?? algorithmSpecificState?.currentH
  const selectedMove = algorithmSpecificState?.bestCandidate ?? (action === 'EXPLORE_NEIGHBORS' ? selectedNode : null)
  const hcStatus = action === 'GOAL_REACHED' || goalReached
    ? 'Goal Reached'
    : (action === 'LOCAL_OPTIMUM'
      ? 'Local Optimum'
      : (currentStep.neighbors && currentStep.neighbors.length === 0 ? 'No Valid Neighbor' : 'Searching'))

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

      {/* Nodes Summary (Current, Selected / Heuristic, Status / Path) */}
      {isSA ? (
        <div className={styles.nodeSummaryGrid}>
          <div className={styles.nodeSummaryTile}>
            <span className={styles.tileLabel}>Current Node</span>
            <span className={`${styles.tileValue} ${currentNode ? styles.valCurrent : styles.valEmpty}`}>
              {currentNode ?? 'None'}
            </span>
          </div>

          <div className={styles.nodeSummaryTile}>
            <span className={styles.tileLabel}>Temperature</span>
            <span className={`${styles.tileValue} ${styles.valSelected}`}>
              T = {algorithmSpecificState?.temperature ?? '—'}
            </span>
          </div>

          <div className={styles.nodeSummaryTile}>
            <span className={styles.tileLabel}>Proposed Move</span>
            <span className={`${styles.tileValue} ${algorithmSpecificState?.proposedNeighbor ? styles.valSelected : styles.valEmpty}`}>
              {algorithmSpecificState?.proposedNeighbor ?? 'None'}
            </span>
          </div>

          <div className={styles.nodeSummaryTile}>
            <span className={styles.tileLabel}>Status</span>
            <span
              className={styles.tileValue}
              style={{ fontSize: '0.85rem', color: saStatusColor(algorithmSpecificState?.saStatus) }}
            >
              {algorithmSpecificState?.saStatus ?? 'Searching'}
            </span>
          </div>
        </div>
      ) : selectedAlgorithm === ALGORITHM.HILL_CLIMBING ? (
        <div className={styles.nodeSummaryGrid}>
          <div className={styles.nodeSummaryTile}>
            <span className={styles.tileLabel}>Current Node</span>
            <span className={`${styles.tileValue} ${currentNode ? styles.valCurrent : styles.valEmpty}`}>
              {currentNode ?? 'None'}
            </span>
          </div>

          <div className={styles.nodeSummaryTile}>
            <span className={styles.tileLabel}>Current Heuristic</span>
            <span className={`${styles.tileValue} ${curH !== undefined ? styles.valSelected : styles.valEmpty}`}>
              {curH !== undefined ? `h = ${curH}` : '—'}
            </span>
          </div>

          <div className={styles.nodeSummaryTile}>
            <span className={styles.tileLabel}>Selected Move</span>
            <span className={`${styles.tileValue} ${selectedMove ? styles.valSelected : styles.valEmpty}`}>
              {selectedMove ?? 'None'}
            </span>
          </div>

          <div className={styles.nodeSummaryTile}>
            <span className={styles.tileLabel}>Status</span>
            <span
              className={styles.tileValue}
              style={{
                fontSize: '0.85rem',
                color: hcStatus === 'Goal Reached' ? '#10b981' : (hcStatus === 'Local Optimum' ? '#f43f5e' : '#38bdf8')
              }}
            >
              {hcStatus}
            </span>
          </div>
        </div>
      ) : (
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
      )}

      {/* Active Edge Evaluation Context */}
      {currentStep.parentNode && currentStep.neighborNode && selectedAlgorithm !== ALGORITHM.HILL_CLIMBING && (
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
            <Footprints size={13} /> {isLocal ? 'Search Trajectory' : 'Current Path'}
          </h3>
          <div className={styles.pathTrail}>
            {currentPath.map((id, idx) => (
              <span key={`${id}-${idx}`} className={styles.pathStep}>
                <span className={styles.pathNodeChip}>{id}</span>
                {idx < currentPath.length - 1 && <ArrowRight size={11} className={styles.pathArrow} />}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Algorithm-Specific Data Structure Section (Queue / Stack / Priority Queue / Hill Climbing Candidates) */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <ListOrdered size={13} />{' '}
          {selectedAlgorithm === ALGORITHM.BFS && 'FIFO Queue'}
          {selectedAlgorithm === ALGORITHM.DFS && 'LIFO Stack'}
          {selectedAlgorithm === ALGORITHM.HILL_CLIMBING && 'Candidate Neighbors'}
          {isSA && 'Annealing Decision'}
          {selectedAlgorithm !== ALGORITHM.BFS && selectedAlgorithm !== ALGORITHM.DFS && !isLocal && 'Priority Queue'}
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

        {/* Hill Climbing Candidate Neighbors Table */}
        {selectedAlgorithm === ALGORITHM.HILL_CLIMBING && (
          <div className={styles.tableWrapper}>
            {currentStep.neighborsConsidered && currentStep.neighborsConsidered.length > 0 ? (
              <table className={styles.pqTable}>
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>h(candidate)</th>
                    <th>Improvement Status</th>
                  </tr>
                </thead>
                <tbody>
                  {currentStep.neighborsConsidered.map((item) => {
                    const isImproving = item.status === 'improving'
                    const isVisited = item.status === 'already_visited'
                    return (
                      <tr key={item.neighborId} className={item.neighborId === algorithmSpecificState?.bestCandidate ? styles.activeRow : ''}>
                        <td className={styles.nodeCell}>{item.neighborId}</td>
                        <td className={styles.priorityCell}>{item.hValue}</td>
                        <td>
                          {isImproving ? (
                            <span style={{ color: '#10b981', fontWeight: 600 }}>Improving ({item.hValue} &lt; {curH})</span>
                          ) : isVisited ? (
                            <span style={{ color: '#94a3b8' }}>Already Visited</span>
                          ) : (
                            <span style={{ color: '#f43f5e' }}>Not Improving ({item.hValue} ≥ {curH})</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <span className={styles.emptyText}>No candidate neighbors evaluated at this step</span>
            )}
          </div>
        )}

        {/* Simulated Annealing: neighbors with ΔE + Metropolis acceptance test */}
        {isSA && (
          <div className={styles.tableWrapper}>
            {frontierDetail && frontierDetail.length > 0 ? (
              <table className={styles.pqTable}>
                <thead>
                  <tr>
                    <th>Neighbor</th>
                    <th>h(n)</th>
                    <th>ΔE</th>
                    <th>This Iteration</th>
                  </tr>
                </thead>
                <tbody>
                  {frontierDetail.map(entry => {
                    const isProposed = entry.nodeId === algorithmSpecificState?.proposedNeighbor
                    return (
                      <tr key={entry.nodeId} className={isProposed ? styles.activeRow : ''}>
                        <td className={styles.nodeCell}>{entry.nodeId}</td>
                        <td className={styles.priorityCell}>{entry.h}</td>
                        <td style={{ color: entry.deltaE > 0 ? '#f43f5e' : '#10b981' }}>
                          {entry.deltaE > 0 ? `+${entry.deltaE}` : entry.deltaE}
                        </td>
                        <td>
                          {!isProposed ? (
                            <span style={{ color: '#94a3b8' }}>{algorithmSpecificState?.proposedNeighbor ? 'Not proposed' : 'Candidate'}</span>
                          ) : algorithmSpecificState?.accepted ? (
                            <span style={{ color: '#10b981', fontWeight: 600 }}>Proposed → Accepted</span>
                          ) : (
                            <span style={{ color: '#f43f5e', fontWeight: 600 }}>Proposed → Rejected</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <span className={styles.emptyText}>No neighbors at this step</span>
            )}

            {algorithmSpecificState?.proposedNeighbor && (
              <div className={styles.dsRow} style={{ marginTop: '0.6rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                <span className={styles.dsSubLabel}>Acceptance:</span>
                <span className={styles.queueChip}>p = {algorithmSpecificState.acceptProb}</span>
                <span className={styles.queueChip}>r = {algorithmSpecificState.roll}</span>
                <span
                  className={styles.queueChip}
                  style={{ color: algorithmSpecificState.accepted ? '#10b981' : '#f43f5e' }}
                >
                  {algorithmSpecificState.accepted ? 'r < p → ACCEPT' : 'r ≥ p → REJECT'}
                </span>
                <span className={styles.queueChip}>
                  T: {algorithmSpecificState.temperature} → {algorithmSpecificState.nextTemperature}
                </span>
              </div>
            )}
          </div>
        )}

        {/* UCS / Greedy / A* Priority Queue Table */}
        {selectedAlgorithm !== ALGORITHM.BFS && selectedAlgorithm !== ALGORITHM.DFS && !isLocal && (
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

      {/* Frontier Nodes / Immediate Neighbors */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Eye size={13} className={styles.frontierIcon} /> {isLocal ? 'Immediate Neighbors' : 'Frontier Nodes'} ({frontierNodes.length})
        </h3>
        <div className={styles.chipsRow}>
          {frontierNodes.length === 0 ? (
            <span className={styles.emptyText}>{isLocal ? 'No immediate neighbors' : 'None in frontier'}</span>
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

function saStatusColor(status) {
  if (status === 'Goal Reached') return '#10b981'
  if (status === 'Move Rejected' || status === 'Frozen' || status === 'No Neighbors' || status === 'Iteration Limit') return '#f43f5e'
  if (status === 'Uphill Move Accepted') return '#f59e0b'
  return '#38bdf8'
}
