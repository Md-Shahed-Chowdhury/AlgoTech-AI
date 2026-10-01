/**
 * ComparePage.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Algorithm Comparison mode (/compare).
 *   - HEADER:   pill + gradient title (same pattern as LearnPage)
 *   - CONTROLS: algorithm chips (2–5), graph preset, Edit Graph, Split/Overlay, Run
 *   - RACE:     SplitView (one canvas per algorithm) or OverlayView (one canvas)
 *   - PLAYBACK: one sticky bar driving the shared step clock
 *   - RESULTS:  Scoreboard · Metrics · Convergence · Insights (unlock when race ends)
 *
 * URL: ?algos=bfs,astar&preset=classic, so a comparison can be shared or bookmarked.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Swords, Flag, Trophy, BarChart3, LineChart, Lightbulb, AlertTriangle, Keyboard, Eye } from 'lucide-react'

import { useGraphStore } from '../../../graph/store/useGraphStore.js'
import GraphCanvas from '../../../graph/components/GraphCanvas/GraphCanvas.jsx'
import { COMPARISON_PRESETS } from '../../../graph/utils/graphUtils.js'
import { useCompareStore } from '../../store/useCompareStore.js'
import { ALGO_ORDER, ALGO_BY_ID, VIEW_MODE } from '../../constants.js'
import { fitViewBox } from '../../layout.js'

import AlgorithmPicker from '../AlgorithmPicker/AlgorithmPicker.jsx'
import CompareToolbar from '../CompareToolbar/CompareToolbar.jsx'
import SplitView from '../SplitView/SplitView.jsx'
import OverlayView from '../OverlayView/OverlayView.jsx'
import ComparePlayback from '../ComparePlayback/ComparePlayback.jsx'
import Scoreboard from '../Scoreboard/Scoreboard.jsx'
import MetricsTable from '../MetricsTable/MetricsTable.jsx'
import ConvergenceChart from '../ConvergenceChart/ConvergenceChart.jsx'
import InsightsPanel from '../InsightsPanel/InsightsPanel.jsx'
import EditGraphDrawer from '../EditGraphDrawer/EditGraphDrawer.jsx'

import styles from './ComparePage.module.css'

const TABS = [
  { id: 'scoreboard',  label: 'Scoreboard',  icon: Trophy },
  { id: 'metrics',     label: 'Metrics',     icon: BarChart3 },
  { id: 'convergence', label: 'Convergence', icon: LineChart },
  { id: 'insights',    label: 'Insights',    icon: Lightbulb },
]

const DEFAULT_PRESET = 'classic'

export default function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [presetId, setPresetId] = useState(() => {
    const p = searchParams.get('preset')
    return COMPARISON_PRESETS.some(x => x.id === p) ? p : DEFAULT_PRESET
  })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [tab, setTab] = useState('scoreboard')
  const graphAtOpen = useRef(null)

  const graph = useGraphStore(s => s.graph)
  const loadGraph = useGraphStore(s => s.loadGraph)

  const selected = useCompareStore(s => s.selected)
  const comparison = useCompareStore(s => s.comparison)
  const ranGraph = useCompareStore(s => s.ranGraph)
  const viewMode = useCompareStore(s => s.viewMode)
  const errors = useCompareStore(s => s.errors)
  const revealed = useCompareStore(s => s.revealed)
  const { run, setSelected, clearResults, revealResults, pause, togglePlay, stepForward, stepBackward } = useCompareStore.getState()

  // ── Mount: read URL → selection + graph; clean up the timer on leave ──────
  useEffect(() => {
    clearResults()
    const fromUrl = (searchParams.get('algos') ?? '').split(',').filter(id => ALGO_ORDER.includes(id))
    if (fromUrl.length > 0) setSelected(fromUrl)
    const preset = COMPARISON_PRESETS.find(p => p.id === presetId) ?? COMPARISON_PRESETS[0]
    loadGraph(preset.create())
    return () => pause()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Keep URL in sync so comparisons are shareable ─────────────────────────
  useEffect(() => {
    const params = { algos: selected.join(',') }
    if (presetId !== 'custom') params.preset = presetId
    setSearchParams(params, { replace: true })
  }, [selected, presetId, setSearchParams])

  // ── Keyboard: Space play/pause, ←/→ step ─────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (drawerOpen || !comparison) return
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return
      if (e.key === ' ') { e.preventDefault(); togglePlay() }
      else if (e.key === 'ArrowRight') { e.preventDefault(); pause(); stepForward() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); pause(); stepBackward() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen, comparison, togglePlay, pause, stepForward, stepBackward])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handlePresetChange = (id) => {
    const preset = COMPARISON_PRESETS.find(p => p.id === id)
    if (!preset) return
    const next = preset.create()
    setPresetId(id)
    loadGraph(next)
    if (comparison) run(next)
  }

  const openDrawer = () => {
    pause()
    graphAtOpen.current = graph
    setDrawerOpen(true)
  }

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
    const current = useGraphStore.getState().graph
    if (current !== graphAtOpen.current) {
      setPresetId('custom')
      if (useCompareStore.getState().comparison) run(current)
    }
  }, [run])

  // Results always render the graph they were computed on
  const displayGraph = comparison && ranGraph ? ranGraph : graph
  const viewBox = useMemo(() => fitViewBox(displayGraph), [displayGraph])

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.pill}>
          <Swords size={13} /> Compare Mode
        </div>
        <h1 className={styles.title}>
          Compare <span className="gradient-text">Algorithms</span>
        </h1>
        <p className={styles.sub}>
          Race up to five search algorithms on the same graph and compare execution time,
          solution quality, efficiency and convergence side by side.
        </p>
      </div>

      {/* Controls */}
      <section className={`card ${styles.controls}`}>
        <AlgorithmPicker />
        <div className={styles.divider} />
        <CompareToolbar
          presetId={presetId}
          onPresetChange={handlePresetChange}
          onEditGraph={openDrawer}
          onRun={() => run(graph)}
        />
      </section>

      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div
            className={styles.errors}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <AlertTriangle size={16} />
            <ul>{errors.map(e => <li key={e}>{e}</li>)}</ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Race area */}
      <section className={styles.race}>
        {!comparison ? (
          <EmptyState graph={graph} viewBox={viewBox} selected={selected} onStart={() => run(graph)} />
        ) : viewMode === VIEW_MODE.SPLIT ? (
          <SplitView graph={displayGraph} viewBox={viewBox} />
        ) : (
          <OverlayView graph={displayGraph} viewBox={viewBox} />
        )}
      </section>

      <ComparePlayback />

      {/* Results */}
      {comparison && (
        <section className={`card ${styles.results}`}>
          {!revealed ? (
            <div className={styles.locked}>
              <Flag size={20} className={styles.lockedIcon} />
              <div>
                <h3 className={styles.lockedTitle}>Race in progress</h3>
                <p className={styles.lockedSub}>The scoreboard unlocks when every algorithm reaches its final step.</p>
              </div>
              <button className="btn btn-ghost" onClick={revealResults}>
                <Eye size={14} /> Show results now
              </button>
            </div>
          ) : (
            <>
              <div className={styles.tabs} role="tablist" aria-label="Comparison results">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={tab === id}
                    className={`${styles.tab} ${tab === id ? styles.tabActive : ''}`}
                    onClick={() => setTab(id)}
                  >
                    <Icon size={15} /> {label}
                    {id === 'insights' && <span className={styles.tabCount}>{comparison.verdict.insights.length}</span>}
                    {tab === id && <motion.span layoutId="compareResultTab" className={styles.tabUnderline} />}
                  </button>
                ))}
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className={styles.tabBody}
                >
                  {tab === 'scoreboard' && <Scoreboard comparison={comparison} />}
                  {tab === 'metrics' && <MetricsTable comparison={comparison} />}
                  {tab === 'convergence' && <ConvergenceChart comparison={comparison} />}
                  {tab === 'insights' && <InsightsPanel comparison={comparison} />}
                </motion.div>
              </AnimatePresence>
            </>
          )}
        </section>
      )}

      {comparison && (
        <p className={styles.shortcuts}>
          <Keyboard size={13} /> <kbd>Space</kbd> play / pause · <kbd>←</kbd> <kbd>→</kbd> step
        </p>
      )}

      <EditGraphDrawer open={drawerOpen} onClose={closeDrawer} />
    </div>
  )
}

function EmptyState({ graph, viewBox, selected, onStart }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyCanvas}>
        <GraphCanvas readOnly graph={graph} activeStep={null} viewBox={viewBox} />
      </div>
      <div className={styles.emptyOverlay}>
        <div className={styles.lineup}>
          {selected.map(id => (
            <span key={id} className={styles.lineupChip} style={{ '--c': ALGO_BY_ID[id].color }}>
              {ALGO_BY_ID[id].shortName}
            </span>
          ))}
        </div>
        <h3 className={styles.emptyTitle}>
          {selected.length >= 2 ? 'Ready to race' : 'Pick at least two algorithms'}
        </h3>
        <p className={styles.emptySub}>Every selected algorithm searches this graph at the same time, each in its own color.</p>
        <button className="btn btn-primary" onClick={onStart} disabled={selected.length < 2}>
          <Flag size={15} /> Start Race
        </button>
      </div>
    </div>
  )
}
