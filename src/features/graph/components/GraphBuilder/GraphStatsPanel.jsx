/**
 * GraphStatsPanel.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Real-time side panel & inspector displaying graph telemetry (total nodes,
 * total edges, start/goal nodes) and interactive controls for selected items.
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Circle,
  Network,
  Flag,
  Target,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ArrowRightLeft,
  MousePointer,
  HelpCircle,
} from 'lucide-react'
import { useGraphStore } from '../../store/useGraphStore.js'
import { validateGraph } from '../../utils/graphUtils.js'
import styles from './GraphBuilder.module.css'

export default function GraphStatsPanel({ onTriggerInlineEdit }) {
  const graph = useGraphStore(s => s.graph)
  const selectedNodeId = useGraphStore(s => s.selectedNodeId)
  const selectedEdgeId = useGraphStore(s => s.selectedEdgeId)

  const setStart = useGraphStore(s => s.setStart)
  const setGoal = useGraphStore(s => s.setGoal)
  const setNodeLabel = useGraphStore(s => s.setNodeLabel)
  const setNodeHeuristic = useGraphStore(s => s.setNodeHeuristic)
  const deleteNode = useGraphStore(s => s.deleteNode)

  const setEdgeWeight = useGraphStore(s => s.setEdgeWeight)
  const toggleEdgeDirected = useGraphStore(s => s.toggleEdgeDirected)
  const deleteEdge = useGraphStore(s => s.deleteEdge)

  const selectedNode = selectedNodeId ? graph.nodes[selectedNodeId] : null
  const selectedEdge = selectedEdgeId ? graph.edges[selectedEdgeId] : null

  // Local state for immediate input changes
  const [labelInput, setLabelInput] = useState('')
  const [hInput, setHInput] = useState('')
  const [weightInput, setWeightInput] = useState('1')

  useEffect(() => {
    if (selectedNode) {
      setLabelInput(selectedNode.label)
      setHInput(selectedNode.hValue !== null && selectedNode.hValue !== undefined ? String(selectedNode.hValue) : '')
    }
  }, [selectedNode])

  useEffect(() => {
    if (selectedEdge) setWeightInput(String(selectedEdge.weight))
  }, [selectedEdge])

  const nodesList = Object.values(graph.nodes)
  const edgesList = Object.values(graph.edges)
  const startNode = graph.startId ? graph.nodes[graph.startId] : null
  const goalNode = graph.goalId ? graph.nodes[graph.goalId] : null

  const validationErrors = validateGraph(graph)

  const handleLabelSubmit = (e) => {
    e.preventDefault()
    if (selectedNodeId && labelInput.trim()) {
      setNodeLabel(selectedNodeId, labelInput.trim())
    }
  }

  const handleHSubmit = (e) => {
    e.preventDefault()
    if (selectedNodeId) {
      setNodeHeuristic(selectedNodeId, hInput.trim() === '' ? null : Number(hInput))
    }
  }

  const handleWeightSubmit = (e) => {
    e.preventDefault()
    if (selectedEdgeId) {
      setEdgeWeight(selectedEdgeId, Math.max(1, Number(weightInput) || 1))
    }
  }

  return (
    <div className={styles.statsPanel}>
      <h3 className={styles.panelTitle}>Graph Telemetry</h3>

      {/* Stats Summary Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statTile}>
          <div className={styles.statHeader}>
            <Circle size={14} className={styles.statIconNodes} />
            <span>Nodes</span>
          </div>
          <span className={styles.statValue}>{nodesList.length}</span>
        </div>

        <div className={styles.statTile}>
          <div className={styles.statHeader}>
            <Network size={14} className={styles.statIconEdges} />
            <span>Edges</span>
          </div>
          <span className={styles.statValue}>{edgesList.length}</span>
        </div>

        <div className={styles.statTile}>
          <div className={styles.statHeader}>
            <Flag size={14} className={styles.statIconStart} />
            <span>Start Node</span>
          </div>
          <span className={`${styles.statValue} ${startNode ? styles.valStart : styles.valEmpty}`}>
            {startNode ? startNode.label : 'None'}
          </span>
        </div>

        <div className={styles.statTile}>
          <div className={styles.statHeader}>
            <Target size={14} className={styles.statIconGoal} />
            <span>Goal Node</span>
          </div>
          <span className={`${styles.statValue} ${goalNode ? styles.valGoal : styles.valEmpty}`}>
            {goalNode ? goalNode.label : 'None'}
          </span>
        </div>
      </div>

      {/* Selected Item Inspector Panel */}
      <div className={styles.inspectorContainer}>
        <h4 className={styles.inspectorHeader}>Inspector</h4>

        <AnimatePresence mode="wait">
          {selectedNode ? (
            <motion.div
              key={`node-${selectedNode.id}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={styles.inspectorBody}
            >
              <div className={styles.itemHeader}>
                <span className={styles.itemBadge}>Node Inspector</span>
                <span className={styles.itemId}>ID: {selectedNode.id}</span>
              </div>

              {/* Edit Name Form */}
              <form onSubmit={handleLabelSubmit} className={styles.editFieldForm}>
                <label className={styles.fieldLabel}>Node Name:</label>
                <div className={styles.fieldRow}>
                  <input
                    type="text"
                    value={labelInput}
                    onChange={(e) => setLabelInput(e.target.value)}
                    className={styles.fieldInput}
                    maxLength={12}
                  />
                  <button type="submit" className="btn btn-ghost btn-sm" title="Save name">
                    <Edit2 size={13} />
                  </button>
                </div>
              </form>

              {/* Edit Heuristic H(n) Form */}
              <form onSubmit={handleHSubmit} className={styles.editFieldForm}>
                <label className={styles.fieldLabel}>Heuristic H(n) [Goal Estimate]:</label>
                <div className={styles.fieldRow}>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Auto (Canvas Distance)"
                    value={selectedNode.isGoal ? '0' : hInput}
                    disabled={selectedNode.isGoal}
                    title={selectedNode.isGoal ? 'The goal node always has h = 0' : undefined}
                    onChange={(e) => {
                      setHInput(e.target.value)
                      setNodeHeuristic(selectedNodeId, e.target.value.trim() === '' ? null : Number(e.target.value))
                    }}
                    className={styles.fieldInput}
                  />
                  <button type="submit" className="btn btn-ghost btn-sm" title="Save heuristic">
                    <Edit2 size={13} />
                  </button>
                </div>
                <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
                  Used by Greedy & A* algorithms as user-defined h(n) value.
                </span>
              </form>

              {/* Node Role Actions */}
              <div className={styles.actionButtonGroup}>
                <button
                  className={`btn ${selectedNode.isStart ? styles.btnActiveStart : 'btn-ghost'} btn-sm`}
                  onClick={() => setStart(selectedNode.id)}
                >
                  <Flag size={13} /> {selectedNode.isStart ? 'Is Start Node' : 'Set as Start'}
                </button>

                <button
                  className={`btn ${selectedNode.isGoal ? styles.btnActiveGoal : 'btn-ghost'} btn-sm`}
                  onClick={() => setGoal(selectedNode.id)}
                >
                  <Target size={13} /> {selectedNode.isGoal ? 'Is Goal Node' : 'Set as Goal'}
                </button>

                <button
                  className="btn btn-ghost btn-sm text-red"
                  onClick={() => deleteNode(selectedNode.id)}
                >
                  <Trash2 size={13} /> Delete Node
                </button>
              </div>
            </motion.div>
          ) : selectedEdge ? (
            <motion.div
              key={`edge-${selectedEdge.id}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={styles.inspectorBody}
            >
              <div className={styles.itemHeader}>
                <span className={styles.itemBadge}>Edge Inspector</span>
                <span className={styles.itemId}>
                  {graph.nodes[selectedEdge.sourceId]?.label ?? selectedEdge.sourceId} →{' '}
                  {graph.nodes[selectedEdge.targetId]?.label ?? selectedEdge.targetId}
                </span>
              </div>

              {/* Edit Weight Form */}
              <form onSubmit={handleWeightSubmit} className={styles.editFieldForm}>
                <label className={styles.fieldLabel}>Edge Weight:</label>
                <div className={styles.fieldRow}>
                  <input
                    type="number"
                    min="1"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    className={styles.fieldInput}
                  />
                  <button type="submit" className="btn btn-ghost btn-sm" title="Save weight">
                    <Edit2 size={13} />
                  </button>
                </div>
              </form>

              {/* Edge Actions */}
              <div className={styles.actionButtonGroup}>
                <button
                  className={`btn ${selectedEdge.directed ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                  onClick={() => toggleEdgeDirected(selectedEdge.id)}
                >
                  <ArrowRightLeft size={13} /> {selectedEdge.directed ? 'Directed' : 'Undirected'}
                </button>

                <button
                  className="btn btn-ghost btn-sm text-red"
                  onClick={() => deleteEdge(selectedEdge.id)}
                >
                  <Trash2 size={13} /> Delete Edge
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="no-selection"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={styles.emptyInspector}
            >
              <MousePointer size={22} className={styles.emptyIcon} />
              <p>Click any node or edge to inspect and edit its properties.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Validation Status Banner */}
      <div className={styles.validationBanner}>
        <div className={styles.validationHeader}>
          {validationErrors.length === 0 ? (
            <>
              <CheckCircle2 size={15} className={styles.validIcon} />
              <span className={styles.validTitle}>Graph Ready</span>
            </>
          ) : (
            <>
              <AlertTriangle size={15} className={styles.invalidIcon} />
              <span className={styles.invalidTitle}>Graph Requirements</span>
            </>
          )}
        </div>

        {validationErrors.length > 0 && (
          <ul className={styles.errorList}>
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
