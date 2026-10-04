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
  TriangleAlert,
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

  // Checked on every edit so the warning updates as the user builds,
  // ordered by what to do next: nodes → edges → start → goal
  const liveErrors = validateGraph(graph).sort((a, b) => errorRank(a) - errorRank(b))

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
          {/* Live setup warning on the same row as Run, single line, so the
              canvas below never shifts while the user is placing nodes */}
          {liveErrors.length > 0 && (
            <div
              className={styles.setupWarning}
              role="alert"
              title={liveErrors.map(friendlyError).join('\n')}
            >
              <TriangleAlert size={15} className={styles.setupWarningIcon} />
              <span className={styles.setupWarningText}>{friendlyError(liveErrors[0])}</span>
              {liveErrors.length > 1 && (
                <span className={styles.setupWarningMore}>+{liveErrors.length - 1} more</span>
              )}
            </div>
          )}
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

function errorRank(err) {
  if (err.includes('at least 2 nodes')) return 0
  if (err.includes('no edges')) return 1
  if (err.startsWith('No start')) return 2
  if (err.startsWith('No goal')) return 3
  return 4
}

/** Turn validateGraph() messages into instructions that say which tool to use. */
function friendlyError(err) {
  if (err.startsWith('No goal')) return 'Goal node is not set. Choose "Set Goal", then click the node you want to reach.'
  if (err.startsWith('No start')) return 'Start node is not set. Choose "Set Start", then click the node to begin from.'
  if (err.includes('no edges')) return 'The graph has no edges. Choose "Connect Nodes", then click two nodes to link them.'
  if (err.includes('at least 2 nodes')) return 'Add at least 2 nodes. Choose "Add Node", then click on the canvas.'
  return err
}
