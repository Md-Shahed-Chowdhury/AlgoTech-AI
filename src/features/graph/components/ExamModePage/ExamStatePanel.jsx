/**
 * ExamStatePanel.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Real-time state panel for Exam Mode showing:
 *  - Step counter & Progress bar
 *  - Current Node, Visited set, Frontier set, Unexplored set
 *  - Algorithm-Specific Data Structure:
 *      • BFS: FIFO Queue
 *      • DFS: LIFO Stack
 *      • UCS: Priority Queue + g(n)
 *      • Greedy: Priority Queue + h(n)
 *      • A*: Priority Queue + g(n) + h(n) + f(n)
 */

import { motion } from 'framer-motion'
import {
  ListOrdered,
  Footprints,
  Compass,
  CheckCircle2,
  HelpCircle,
  Activity,
  Layers,
} from 'lucide-react'
import { ALGORITHM, ALGORITHM_META } from '../../types/graphTypes.js'
import styles from '../AlgorithmStatePanel/AlgorithmStatePanel.module.css'

export default function ExamStatePanel({
  step,
  algorithmId,
  currentQuestionIndex,
  totalQuestions,
  graph,
}) {
  const meta = ALGORITHM_META[algorithmId] ?? { shortName: algorithmId, color: '#8b5cf6' }

  if (!step) return null

  const {
    currentNode,
    visitedNodes = [],
    frontierNodes = [],
    unexploredNodes = [],
    frontierDetail = [],
    algorithmSpecificState = {},
    gCost = {},
    hCost = {},
    fCost = {},
  } = step

  const progressPct = totalQuestions > 0
    ? Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)
    : 0

  return (
    <div className={`card ${styles.panel}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span
            className={styles.algoTag}
            style={{ color: meta.color, background: `${meta.color}18` }}
          >
            {meta.shortName}
          </span>
          <span className={styles.panelTitleText}>Exam State Tracker</span>
        </div>
        <span className={styles.stepCounter}>
          Step {currentQuestionIndex + 1} / {totalQuestions}
        </span>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{
          height: '6px',
          background: 'var(--bg-elevated)',
          borderRadius: '3px',
          overflow: 'hidden'
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4 }}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #6366f1, #a855f7)'
            }}
          />
        </div>
      </div>

      {/* Node Sets Summary */}
      <div className={styles.nodeSummaryGrid}>
        <div className={styles.nodeSummaryTile}>
          <span className={styles.tileLabel}>Current State Node</span>
          <span className={`${styles.tileValue} ${currentNode ? styles.valCurrent : styles.valEmpty}`}>
            {currentNode ?? 'Select Next...'}
          </span>
        </div>

        <div className={styles.nodeSummaryTile}>
          <span className={styles.tileLabel}>Frontier Size</span>
          <span className={`${styles.tileValue} ${frontierNodes.length > 0 ? styles.valSelected : styles.valEmpty}`}>
            {frontierNodes.length} {frontierNodes.length === 1 ? 'node' : 'nodes'}
          </span>
        </div>
      </div>

      {/* Visited & Frontier Sets Chips */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Footprints size={13} /> Visited & Frontier Sets
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.4rem' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', fontWeight: 600 }}>
              Visited (Closed):
            </div>
            <div className={styles.chipsRow}>
              {visitedNodes.length === 0 ? (
                <span className={styles.emptyText}>None</span>
              ) : (
                visitedNodes.map(id => (
                  <span key={id} className={styles.visitedChip}>{id}</span>
                ))
              )}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', fontWeight: 600 }}>
              Frontier (Open):
            </div>
            <div className={styles.chipsRow}>
              {frontierNodes.length === 0 ? (
                <span className={styles.emptyText}>Empty</span>
              ) : (
                frontierNodes.map(id => (
                  <span key={id} className={styles.frontierChip}>{id}</span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Algorithm-Specific Data Structure Section (Queue / Stack / Priority Queue) */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <ListOrdered size={13} />{' '}
          {algorithmId === ALGORITHM.BFS && 'BFS FIFO Queue'}
          {algorithmId === ALGORITHM.DFS && 'DFS LIFO Stack'}
          {algorithmId === ALGORITHM.UCS && 'UCS Priority Queue [g(n)]'}
          {algorithmId === ALGORITHM.GREEDY && 'Greedy Priority Queue [h(n)]'}
          {algorithmId === ALGORITHM.ASTAR && 'A* Priority Queue [g(n) + h(n) = f(n)]'}
          {algorithmId === ALGORITHM.SIMULATED_ANNEALING && 'Annealing Acceptance Test [move if r < p]'}
        </h3>

        {/* BFS Queue */}
        {algorithmId === ALGORITHM.BFS && (
          <div className={styles.dsContainer}>
            <div className={styles.dsRow}>
              <span className={styles.dsSubLabel}>Queue (Front → Back):</span>
              <div className={styles.chipsRow}>
                {(algorithmSpecificState?.queueAfter ?? frontierNodes).length === 0 ? (
                  <span className={styles.emptyText}>Empty Queue</span>
                ) : (
                  (algorithmSpecificState?.queueAfter ?? frontierNodes).map((id, idx) => (
                    <span key={`${id}-${idx}`} className={styles.queueChip}>
                      {idx === 0 && <span style={{ color: '#10b981', marginRight: '3px', fontWeight: 'bold' }}>Front: </span>}
                      {id}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* DFS Stack */}
        {algorithmId === ALGORITHM.DFS && (
          <div className={styles.dsContainer}>
            <div className={styles.dsRow}>
              <span className={styles.dsSubLabel}>Stack (Top → Bottom):</span>
              <div className={styles.chipsRow}>
                {(algorithmSpecificState?.stackAfter ?? frontierNodes).length === 0 ? (
                  <span className={styles.emptyText}>Empty Stack</span>
                ) : (
                  (algorithmSpecificState?.stackAfter ?? frontierNodes).slice().reverse().map((id, idx) => (
                    <span key={`${id}-${idx}`} className={styles.stackChip}>
                      {idx === 0 && <span style={{ color: '#ec4899', marginRight: '3px', fontWeight: 'bold' }}>Top: </span>}
                      {id}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Simulated Annealing: give the numbers needed to predict the next node */}
        {algorithmId === ALGORITHM.SIMULATED_ANNEALING && (
          <div className={styles.dsContainer}>
            {algorithmSpecificState?.proposedNeighbor ? (
              <>
                <div className={styles.pqTableWrap}>
                  <table className={styles.pqTable}>
                    <tbody>
                      <tr><td className={styles.pqNodeCell}>Walker is on</td><td className={styles.pqCostCell}>{currentNode} (h = {algorithmSpecificState.currentH})</td></tr>
                      <tr><td className={styles.pqNodeCell}>Temperature</td><td className={styles.pqCostCell}>T = {algorithmSpecificState.temperature}</td></tr>
                      <tr><td className={styles.pqNodeCell}>Random proposal</td><td className={styles.pqCostCell}>{algorithmSpecificState.proposedNeighbor} (h = {algorithmSpecificState.proposedH})</td></tr>
                      <tr><td className={styles.pqNodeCell}>ΔE</td><td className={styles.pqCostCell}>{algorithmSpecificState.deltaE}</td></tr>
                      <tr><td className={styles.pqNodeCell}>Acceptance p</td><td className={styles.pqTotalCell}>{algorithmSpecificState.acceptProb}</td></tr>
                      <tr><td className={styles.pqNodeCell}>Random draw r</td><td className={styles.pqTotalCell}>{algorithmSpecificState.roll}</td></tr>
                    </tbody>
                  </table>
                </div>
                <span className={styles.emptyText} style={{ display: 'block', marginTop: '0.5rem' }}>
                  If r &lt; p the walker moves to {algorithmSpecificState.proposedNeighbor}; otherwise it stays on {currentNode}. Click where the walker will be next.
                </span>
              </>
            ) : (
              <span className={styles.emptyText}>
                The walker starts on {currentNode} at temperature T = {algorithmSpecificState?.temperature ?? '—'}. Click the node where the walker stands.
              </span>
            )}
          </div>
        )}

        {/* Priority Queue (UCS / GREEDY / ASTAR) */}
        {algorithmId !== ALGORITHM.BFS && algorithmId !== ALGORITHM.DFS && algorithmId !== ALGORITHM.SIMULATED_ANNEALING && (
          <div className={styles.dsContainer}>
            {frontierNodes.length === 0 ? (
              <span className={styles.emptyText}>Priority Queue is empty.</span>
            ) : (
              <div className={styles.pqTableWrap}>
                <table className={styles.pqTable}>
                  <thead>
                    <tr>
                      <th>Node</th>
                      {algorithmId !== ALGORITHM.GREEDY && <th>g(n)</th>}
                      {algorithmId !== ALGORITHM.UCS && <th>h(n)</th>}
                      {algorithmId === ALGORITHM.ASTAR && <th>f(n)</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {frontierNodes.map(nodeId => {
                      const g = gCost[nodeId] ?? 0
                      const h = hCost[nodeId] ?? 0
                      const f = fCost[nodeId] ?? (g + h)
                      return (
                        <tr key={nodeId}>
                          <td className={styles.pqNodeCell}>{nodeId}</td>
                          {algorithmId !== ALGORITHM.GREEDY && (
                            <td className={styles.pqCostCell}>{g}</td>
                          )}
                          {algorithmId !== ALGORITHM.UCS && (
                            <td className={styles.pqCostCell}>{typeof h === 'number' ? (Number.isInteger(h) ? h : h.toFixed(1)) : h}</td>
                          )}
                          {algorithmId === ALGORITHM.ASTAR && (
                            <td className={styles.pqTotalCell}>{typeof f === 'number' ? (Number.isInteger(f) ? f : f.toFixed(1)) : f}</td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
