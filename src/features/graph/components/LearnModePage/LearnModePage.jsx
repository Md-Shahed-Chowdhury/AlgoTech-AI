/**
 * LearnModePage.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Graph Search Learn Mode Page.
 * Master 2-column layout:
 *   - Left: GraphBuilder (toolbar, hints, telemetry, node/edge inspector)
 *   - Right: GraphCanvas + PlaybackControls + Info Panels Grid
 */

import { BookOpen } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { useGraphStore } from '../../store/useGraphStore.js'
import { useAlgorithmStore } from '../../store/useAlgorithmStore.js'
import { ALGORITHM_META } from '../../types/graphTypes.js'

import GraphCanvas from '../GraphCanvas/GraphCanvas.jsx'
import GraphBuilder from '../GraphBuilder/GraphBuilder.jsx'
import PlaybackControls from '../PlaybackControls/PlaybackControls.jsx'
import AlgorithmStatePanel from '../AlgorithmStatePanel/AlgorithmStatePanel.jsx'
import MetricsPanel from '../MetricsPanel/MetricsPanel.jsx'
import ExplanationPanel from '../ExplanationPanel/ExplanationPanel.jsx'

import styles from './LearnModePage.module.css'

export default function LearnModePage() {
  const { algorithmId } = useParams()
  const graph = useGraphStore(s => s.graph)
  const prepare = useAlgorithmStore(s => s.prepare)
  const setAlgorithm = useAlgorithmStore(s => s.setAlgorithm)

  // Sync URL param → store
  const meta = ALGORITHM_META[algorithmId]

  const handleRun = () => {
    if (algorithmId) setAlgorithm(algorithmId)
    prepare(graph)
  }

  return (
    <div className={styles.page}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.pill}>
          <BookOpen size={13} /> Learn Mode
        </div>
        <h1 className={styles.title}>
          <span className="gradient-text">{meta?.name ?? 'Graph Search Simulator'}</span>
        </h1>
        <p className={styles.sub}>
          {meta?.description ?? 'Build a graph manually, run the search algorithm, and step through each decision.'}
        </p>
      </div>

      {/* ── Main layout ─────────────────────────────────────────────────── */}
      <div className={styles.layout}>
        {/* Left column: builder toolbar, tools, hints & inspector */}
        <aside className={styles.sidebar}>
          <GraphBuilder onRun={handleRun} />
        </aside>

        {/* Right column: canvas area + playback + info panels */}
        <main className={styles.mainContent}>
          <div className={styles.canvasArea}>
            <GraphCanvas width={850} height={500} />
            <PlaybackControls />
          </div>

          <div className={styles.panelsGrid}>
            <ExplanationPanel />
            <AlgorithmStatePanel />
            <MetricsPanel />
          </div>
        </main>
      </div>
    </div>
  )
}
