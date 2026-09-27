/**
 * GraphBuilder.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Primary toolbar and interaction control bar for the interactive graph editor.
 * Includes animated tool switcher, mode hints, graph presets, clear/reset options,
 * and integration with GraphStatsPanel.
 */

import { motion } from 'framer-motion'
import {
  MousePointer,
  Plus,
  Network,
  Flag,
  Target,
  Trash2,
  RotateCcw,
  LayoutTemplate,
  Eraser,
  Play,
  Info,
} from 'lucide-react'
import { useGraphStore } from '../../store/useGraphStore.js'
import { useAlgorithmStore } from '../../store/useAlgorithmStore.js'
import { validateGraph } from '../../utils/graphUtils.js'
import { BUILDER_MODE } from '../../types/graphTypes.js'
import GraphStatsPanel from './GraphStatsPanel.jsx'
import styles from './GraphBuilder.module.css'

const TOOLS = [
  { mode: BUILDER_MODE.SELECT, icon: MousePointer, label: 'Select & Move', hint: 'Click node or edge to inspect/edit. Drag nodes to move.' },
  { mode: BUILDER_MODE.ADD_NODE, icon: Plus, label: 'Add Node', hint: 'Click anywhere on the canvas to place a new node.' },
  { mode: BUILDER_MODE.ADD_EDGE, icon: Network, label: 'Connect Nodes', hint: 'Click source node, then click target node to create an edge.' },
  { mode: BUILDER_MODE.SET_START, icon: Flag, label: 'Set Start', hint: 'Click a node to mark it as the Start Node.' },
  { mode: BUILDER_MODE.SET_GOAL, icon: Target, label: 'Set Goal', hint: 'Click a node to mark it as the Goal Node.' },
  { mode: BUILDER_MODE.DELETE, icon: Trash2, label: 'Delete Tool', hint: 'Click any node or edge to delete it.' },
]

export default function GraphBuilder({ onRun, showStatsPanel = true }) {
  const builderMode = useGraphStore(s => s.builderMode)
  const setBuilderMode = useGraphStore(s => s.setBuilderMode)
  const graph = useGraphStore(s => s.graph)
  const loadPreset = useGraphStore(s => s.loadPreset)
  const clearGraph = useGraphStore(s => s.clearGraph)

  const pendingEdgeSrcId = useGraphStore(s => s.pendingEdgeSrcId)

  const setValidationErrors = useAlgorithmStore(s => s.setValidationErrors)
  const validationErrors = useAlgorithmStore(s => s.validationErrors)

  const activeTool = TOOLS.find(t => t.mode === builderMode) || TOOLS[0]

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
    <div className={styles.builderContainer}>
      {/* Primary Toolbar */}
      <div className={styles.toolbarHeader}>
        <div className={styles.toolsGroup} role="toolbar" aria-label="Graph editing tools">
          {TOOLS.map(({ mode, icon: Icon, label }) => {
            const isActive = builderMode === mode
            return (
              <button
                key={mode}
                id={`builder-tool-${mode}`}
                className={`${styles.toolButton} ${isActive ? styles.toolActive : ''}`}
                onClick={() => setBuilderMode(mode)}
                title={label}
                aria-pressed={isActive}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeToolPill"
                    className={styles.activePillBackground}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <Icon size={16} className={styles.toolIcon} />
                <span className={styles.toolLabel}>{label}</span>
              </button>
            )
          })}
        </div>

        {/* Quick Action Buttons */}
        <div className={styles.actionsGroup}>
          <button
            id="builder-load-preset"
            className="btn btn-ghost btn-sm"
            onClick={loadPreset}
            title="Load sample graph preset"
          >
            <LayoutTemplate size={14} /> Preset Graph
          </button>

          <button
            id="builder-clear"
            className="btn btn-ghost btn-sm"
            onClick={clearGraph}
            title="Clear all nodes and edges"
          >
            <Eraser size={14} /> Clear
          </button>
        </div>
      </div>

      {/* Tool Hint Bar */}
      <div className={styles.hintBar}>
        <Info size={14} className={styles.hintIcon} />
        <span>
          {pendingEdgeSrcId ? (
            <strong className={styles.pendingHint}>
              Source node selected ({graph.nodes[pendingEdgeSrcId]?.label}). Now click target node to create edge!
            </strong>
          ) : (
            activeTool.hint
          )}
        </span>
      </div>

      {/* Optional Side Telemetry & Inspector Panel */}
      {showStatsPanel && <GraphStatsPanel />}

      {/* Run Algorithm Button (if onRun is provided) */}
      {onRun && (
        <div className={styles.runBar}>
          <button
            id="builder-run"
            className={`btn btn-primary ${styles.runBtn}`}
            onClick={handleRun}
          >
            <Play size={16} fill="currentColor" /> Run Search Algorithm
          </button>
        </div>
      )}
    </div>
  )
}
