/**
 * GraphBuilder.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Toolbar and interaction controller for building / editing a graph.
 * Renders on top of (or beside) GraphCanvas.
 *
 * STUB — full implementation in next phase.
 *
 * Responsibilities:
 *  - Builder mode switcher (Select / Add Node / Add Edge / Delete / Set Start / Set Goal)
 *  - Edge weight editor trigger
 *  - Selected node/edge inspector
 *  - Preset load / reset controls
 *  - Validation error display
 */

import { Network, Plus, Minus, Move, Flag, Target, Trash2, RotateCcw, LayoutTemplate } from 'lucide-react'
import { useGraphStore }     from '../../store/useGraphStore.js'
import { useAlgorithmStore } from '../../store/useAlgorithmStore.js'
import { validateGraph }     from '../../utils/graphUtils.js'
import { BUILDER_MODE }      from '../../types/graphTypes.js'
import styles from './GraphBuilder.module.css'

const TOOLS = [
  { mode: BUILDER_MODE.SELECT,    icon: Move,    label: 'Select' },
  { mode: BUILDER_MODE.ADD_NODE,  icon: Plus,    label: 'Add Node' },
  { mode: BUILDER_MODE.ADD_EDGE,  icon: Network, label: 'Add Edge' },
  { mode: BUILDER_MODE.DELETE,    icon: Trash2,  label: 'Delete' },
  { mode: BUILDER_MODE.SET_START, icon: Flag,    label: 'Set Start' },
  { mode: BUILDER_MODE.SET_GOAL,  icon: Target,  label: 'Set Goal' },
]

export default function GraphBuilder({ onRun }) {
  const builderMode    = useGraphStore(s => s.builderMode)
  const setBuilderMode = useGraphStore(s => s.setBuilderMode)
  const graph          = useGraphStore(s => s.graph)
  const loadPreset     = useGraphStore(s => s.loadPreset)
  const resetGraph     = useGraphStore(s => s.resetGraph)

  const setValidationErrors = useAlgorithmStore(s => s.setValidationErrors)
  const validationErrors    = useAlgorithmStore(s => s.validationErrors)

  const handleRun = () => {
    const errors = validateGraph(graph)
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }
    setValidationErrors([])
    onRun?.()
  }

  return (
    <div className={styles.builder}>
      {/* Tool palette */}
      <div className={styles.toolbar} role="toolbar" aria-label="Graph builder tools">
        {TOOLS.map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            id={`builder-tool-${mode}`}
            className={`${styles.tool} ${builderMode === mode ? styles.toolActive : ''}`}
            onClick={() => setBuilderMode(mode)}
            title={label}
            aria-pressed={builderMode === mode}
          >
            <Icon size={16} />
            <span className={styles.toolLabel}>{label}</span>
          </button>
        ))}
      </div>

      {/* Preset / Reset */}
      <div className={styles.presets}>
        <button
          id="builder-load-preset"
          className="btn btn-ghost"
          onClick={loadPreset}
          title="Load a sample graph"
        >
          <LayoutTemplate size={14} /> Sample Graph
        </button>
        <button
          id="builder-reset"
          className="btn btn-ghost"
          onClick={resetGraph}
          title="Clear the graph"
        >
          <RotateCcw size={14} /> Clear
        </button>
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className={styles.errors} role="alert">
          {validationErrors.map((err, i) => (
            <p key={i} className={styles.error}>{err}</p>
          ))}
        </div>
      )}

      {/* Run button */}
      <button
        id="builder-run"
        className={`btn btn-primary ${styles.runBtn}`}
        onClick={handleRun}
      >
        Run Algorithm
      </button>
    </div>
  )
}
