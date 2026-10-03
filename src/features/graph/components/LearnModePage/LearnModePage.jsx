/**
 * LearnModePage.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Graph Search Learn Mode Page.
 * Professional Educational Simulator Layout:
 *   - LEFT: Interactive 2D SVG Graph Canvas & Builder
 *   - CENTER/RIGHT: AI Teacher Explanation, Algorithm State Panel, Queue/Stack/PQ, Metrics
 *   - BOTTOM: Playback Controls (Prev, Next, Play, Pause, Restart, Speed, Scrubber)
 *   - HEADER: Algorithm selector tabs (BFS, DFS, UCS, Greedy, A*), description, step counter, reset
 *   - COMPLETION: Polished Goal Reached banner with path trace & metrics breakdown
 */

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, RotateCcw, Trophy, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGraphStore } from '../../store/useGraphStore.js'
import { useAlgorithmStore } from '../../store/useAlgorithmStore.js'
import { ALGORITHM, ALGORITHM_META } from '../../types/graphTypes.js'
import { createPresetGraph } from '../../utils/graphUtils.js'

import GraphCanvas from '../GraphCanvas/GraphCanvas.jsx'
import GraphBuilder from '../GraphBuilder/GraphBuilder.jsx'
import PlaybackControls from '../PlaybackControls/PlaybackControls.jsx'
import AlgorithmStatePanel from '../AlgorithmStatePanel/AlgorithmStatePanel.jsx'
import MetricsPanel from '../MetricsPanel/MetricsPanel.jsx'
import ExplanationPanel from '../ExplanationPanel/ExplanationPanel.jsx'

import styles from './LearnModePage.module.css'

const ALGOS = [
  { id: ALGORITHM.BFS,                 name: 'BFS' },
  { id: ALGORITHM.DFS,                 name: 'DFS' },
  { id: ALGORITHM.UCS,                 name: 'UCS' },
  { id: ALGORITHM.GREEDY,              name: 'Greedy' },
  { id: ALGORITHM.ASTAR,               name: 'A*' },
  { id: ALGORITHM.HILL_CLIMBING,       name: 'Hill Climbing' },
  { id: ALGORITHM.SIMULATED_ANNEALING, name: 'Simulated Annealing' },
]

export default function LearnModePage() {
  const { algorithmId } = useParams()
  const navigate = useNavigate()

  const graph = useGraphStore(s => s.graph)
  const loadPreset = useGraphStore(s => s.loadPreset)
  const selectedAlgorithm = useAlgorithmStore(s => s.selectedAlgorithm)
  const setAlgorithm = useAlgorithmStore(s => s.setAlgorithm)
  const prepare = useAlgorithmStore(s => s.prepare)
  const resetPlayback = useAlgorithmStore(s => s.reset)

  const steps = useAlgorithmStore(s => s.steps)
  const currentStepIndex = useAlgorithmStore(s => s.currentStepIndex)
  const currentStep = steps[currentStepIndex] ?? null
  const totalSteps = steps.length

  // Sync URL parameter algorithmId → store & auto-reset to default preset graph
  useEffect(() => {
    const activeAlgo = algorithmId || ALGORITHM.BFS
    loadPreset()
    const defaultGraph = createPresetGraph()
    prepare(defaultGraph, { algorithmId: activeAlgo })
  }, [algorithmId]) // eslint-disable-line react-hooks/exhaustive-deps

  const meta = ALGORITHM_META[selectedAlgorithm] || ALGORITHM_META[ALGORITHM.BFS]

  const handleAlgoSelect = (id) => {
    navigate(`/graph/learn/${id}`)
  }

  const handleRunOrReset = () => {
    prepare(graph)
  }

  const isGoalCompletionStep = currentStep?.isFinal && currentStep?.goalReached

  return (
    <div className={styles.page}>
      {/* ── 1. Algorithm Header ──────────────────────────────────────────── */}
      <div className={styles.headerCard}>
        <div className={styles.headerMain}>
          <div className={styles.headerLeftInfo}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className={styles.pill}>
                <BookOpen size={13} /> Learn Mode Simulator
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => navigate(`/graph/exam/${selectedAlgorithm}`)}
                style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', gap: '0.35rem' }}
              >
                📝 Give Exam
              </button>
            </div>
            <h1 className={styles.title}>
              <span className="gradient-text">{meta.name}</span>
            </h1>
            <p className={styles.sub}>{meta.description}</p>
          </div>

          {/* Quick Algorithm Switcher Pills */}
          <div className={styles.algoSelectorGroup}>
            {ALGOS.map(algo => (
              <button
                key={algo.id}
                className={`${styles.algoTab} ${selectedAlgorithm === algo.id ? styles.algoTabActive : ''}`}
                onClick={() => handleAlgoSelect(algo.id)}
                style={{
                  '--algo-color': ALGORITHM_META[algo.id].color
                }}
              >
                {algo.name}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.headerSubBar}>
          <div className={styles.stepBadge}>
            Step <strong className={styles.stepHighlight}>{totalSteps > 0 ? currentStepIndex + 1 : 0}</strong> / {totalSteps}
          </div>

          <div className={styles.headerActions}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={resetPlayback}
              disabled={totalSteps === 0}
              title="Reset simulation to step 1"
            >
              <RotateCcw size={14} /> Restart Step 1
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Layout (Left: Canvas & Builder | Right: Explanations & State) ──── */}
      <div className={styles.layout}>
        {/* Left Column: Interactive Canvas + Canvas Controls */}
        <div className={styles.leftColumn}>
          {/* Builder Tools Palette */}
          <div className={styles.builderSection}>
            <GraphBuilder onRun={handleRunOrReset} showStatsPanel={false} />
          </div>

          {/* SVG Graph Canvas */}
          <div className={styles.canvasWrapSection}>
            <GraphCanvas width={850} height={520} />
          </div>

          {/* Bottom Simulation Transport Bar */}
          <div className={styles.controlsSection}>
            <PlaybackControls />
          </div>
        </div>

        {/* Right Column: AI Teacher Explanations + Algorithm State + Metrics */}
        <aside className={styles.rightColumn}>
          {/* Goal Reached Completion Banner */}
          <AnimatePresence>
            {isGoalCompletionStep && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: -10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: -10 }}
                className={styles.completionBanner}
              >
                <div className={styles.completionHeader}>
                  <Trophy size={20} className={styles.trophyIcon} />
                  <div>
                    <h3 className={styles.completionTitle}>Goal Node Reached!</h3>
                    <p className={styles.completionSub}>Simulation complete for {meta.name}</p>
                  </div>
                </div>

                <div className={styles.completionMetricsGrid}>
                  <div className={styles.compTile}>
                    <span>Path Cost</span>
                    <strong>{currentStep.metrics?.totalCost ?? 0}</strong>
                  </div>
                  <div className={styles.compTile}>
                    <span>Edges (Length)</span>
                    <strong>{currentStep.metrics?.pathLength ?? Math.max(0, (currentStep.pathNodes?.length ?? 1) - 1)}</strong>
                  </div>
                  <div className={styles.compTile}>
                    <span>Nodes Expanded</span>
                    <strong>{currentStep.metrics?.nodesExpanded ?? 0}</strong>
                  </div>
                  <div className={styles.compTile}>
                    <span>Total Steps</span>
                    <strong>{totalSteps}</strong>
                  </div>
                </div>

                <div className={styles.compPathRow}>
                  <span className={styles.compPathLabel}>Solution Path:</span>
                  <span className={styles.compPathText}>
                    {currentStep.pathNodes?.join(' → ')}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Section 5: AI Teacher Explanation Panel */}
          <ExplanationPanel />

          {/* Section 3 & 4: Algorithm State Panel (Queue/Stack/PQ + Sets) */}
          <AlgorithmStatePanel />

          {/* Section: Metrics Panel */}
          <MetricsPanel />
        </aside>
      </div>
    </div>
  )
}
