/**
 * CompareToolbar.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Graph preset picker, Edit Graph, Split / Overlay view toggle and Run button.
 */

import { motion } from 'framer-motion'
import { LayoutGrid, Layers, Pencil, Play, RotateCcw, ChevronDown } from 'lucide-react'
import { COMPARISON_PRESETS } from '../../../graph/utils/graphUtils.js'
import { useCompareStore, MIN_SELECTED } from '../../store/useCompareStore.js'
import { VIEW_MODE } from '../../constants.js'
import styles from './CompareToolbar.module.css'

const VIEWS = [
  { id: VIEW_MODE.SPLIT,   label: 'Split',   icon: LayoutGrid },
  { id: VIEW_MODE.OVERLAY, label: 'Overlay', icon: Layers },
]

export default function CompareToolbar({ presetId, onPresetChange, onEditGraph, onRun }) {
  const viewMode = useCompareStore(s => s.viewMode)
  const setViewMode = useCompareStore(s => s.setViewMode)
  const selectedCount = useCompareStore(s => s.selected.length)
  const hasResults = useCompareStore(s => !!s.comparison)

  const preset = COMPARISON_PRESETS.find(p => p.id === presetId)
  const canRun = selectedCount >= MIN_SELECTED

  return (
    <div className={styles.toolbar}>
      <div className={styles.left}>
        <label className={styles.selectWrap}>
          <span className={styles.selectLabel}>Graph</span>
          <select
            id="compare-preset"
            className={styles.select}
            value={presetId}
            onChange={e => onPresetChange(e.target.value)}
          >
            {COMPARISON_PRESETS.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
            {presetId === 'custom' && <option value="custom">Custom graph</option>}
          </select>
          <ChevronDown size={14} className={styles.selectIcon} />
        </label>

        <button id="compare-edit-graph" className="btn btn-ghost" onClick={onEditGraph}>
          <Pencil size={14} /> Edit Graph
        </button>

        <div className={styles.segment} role="tablist" aria-label="View mode">
          {VIEWS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={viewMode === id}
              className={`${styles.segBtn} ${viewMode === id ? styles.segActive : ''}`}
              onClick={() => setViewMode(id)}
            >
              {viewMode === id && (
                <motion.span
                  layoutId="compareViewPill"
                  className={styles.segPill}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      <button
        id="compare-run"
        className={`btn btn-primary ${styles.runBtn}`}
        onClick={onRun}
        disabled={!canRun}
        title={canRun ? 'Run every selected algorithm on this graph' : `Select at least ${MIN_SELECTED} algorithms`}
      >
        {hasResults ? <RotateCcw size={15} /> : <Play size={15} fill="currentColor" />}
        {hasResults ? 'Re-run Race' : 'Start Race'}
      </button>

      {preset && <p className={styles.presetDesc}>{preset.description}</p>}
      {presetId === 'custom' && <p className={styles.presetDesc}>Your own graph, edited in Edit Graph.</p>}
    </div>
  )
}
