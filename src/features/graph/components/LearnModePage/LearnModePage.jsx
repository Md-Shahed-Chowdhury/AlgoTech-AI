/**
 * LearnModePage.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * The Graph Search Learn Mode page.
 * Composes: GraphBuilder + GraphCanvas + PlaybackControls +
 *           AlgorithmStatePanel + MetricsPanel + ExplanationPanel
 *
 * Route: /graph/learn/:algorithmId  (registered in App.jsx in next phase)
 *
 * STUB — layout shell only, no full UI yet.
 */

import { BookOpen } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { useGraphStore }     from '../../store/useGraphStore.js'
import { useAlgorithmStore } from '../../store/useAlgorithmStore.js'
import { ALGORITHM_META }    from '../../types/graphTypes.js'

import GraphCanvas        from '../GraphCanvas/GraphCanvas.jsx'
import GraphBuilder       from '../GraphBuilder/GraphBuilder.jsx'
import PlaybackControls   from '../PlaybackControls/PlaybackControls.jsx'
import AlgorithmStatePanel from '../AlgorithmStatePanel/AlgorithmStatePanel.jsx'
import MetricsPanel       from '../MetricsPanel/MetricsPanel.jsx'
import ExplanationPanel   from '../ExplanationPanel/ExplanationPanel.jsx'

import styles from './LearnModePage.module.css'

export default function LearnModePage() {
  const { algorithmId } = useParams()
  const graph   = useGraphStore(s => s.graph)
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
          <span className="gradient-text">{meta?.name ?? 'Graph Search'}</span>
        </h1>
        <p className={styles.sub}>
          {meta?.description ?? 'Build a graph, run the algorithm, and step through each decision.'}
        </p>
      </div>

      {/* ── Main layout ─────────────────────────────────────────────────── */}
      <div className={styles.layout}>
        {/* Left sidebar: builder tools */}
        <aside className={styles.sidebar}>
          <GraphBuilder onRun={handleRun} />
        </aside>

        {/* Centre: canvas + playback */}
        <main className={styles.canvasArea}>
          <GraphCanvas width={760} height={480} />
          <PlaybackControls />
        </main>

        {/* Right sidebar: panels */}
        <aside className={styles.panels}>
          <ExplanationPanel />
          <AlgorithmStatePanel />
          <MetricsPanel />
        </aside>
      </div>
    </div>
  )
}
