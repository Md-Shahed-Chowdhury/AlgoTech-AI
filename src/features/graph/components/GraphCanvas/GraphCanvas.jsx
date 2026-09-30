/**
 * GraphCanvas.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * SVG-based interactive canvas.
 * Renders nodes, edges, rubber-band connection lines, dot-grid background,
 * and inline editing popover. Handles drag-and-drop node placement.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGraphStore } from '../../store/useGraphStore.js'
import { useAlgorithmStore } from '../../store/useAlgorithmStore.js'
import { BUILDER_MODE, NODE_STATE, EDGE_STATE } from '../../types/graphTypes.js'

import NodeComponent from './NodeComponent.jsx'
import EdgeComponent from './EdgeComponent.jsx'
import InlineEditor from './InlineEditor.jsx'
import TraversalParticle from './TraversalParticle.jsx'
import styles from './GraphCanvas.module.css'

// ── Visual state derivation ───────────────────────────────────────────────────

function deriveNodeStates(step, graph) {
  const map = {}
  for (const id of Object.keys(graph.nodes)) {
    const node = graph.nodes[id]
    if (node.isStart) map[id] = NODE_STATE.START
    else if (node.isGoal) map[id] = NODE_STATE.GOAL
    else map[id] = NODE_STATE.UNEXPLORED
  }
  if (!step) return map

  for (const id of step.unexploredNodes ?? []) {
    if (!graph.nodes[id]?.isStart && !graph.nodes[id]?.isGoal) {
      map[id] = NODE_STATE.UNEXPLORED
    }
  }
  for (const id of step.frontierNodes ?? []) {
    map[id] = NODE_STATE.FRONTIER
  }
  for (const id of step.visitedNodes ?? []) {
    if (!graph.nodes[id]?.isStart && !graph.nodes[id]?.isGoal) {
      map[id] = NODE_STATE.VISITED
    }
  }
  for (const id of step.pathNodes ?? []) {
    if (!graph.nodes[id]?.isStart && !graph.nodes[id]?.isGoal) {
      map[id] = NODE_STATE.PATH
    }
  }
  if (step.currentNode && !graph.nodes[step.currentNode]?.isGoal) {
    map[step.currentNode] = NODE_STATE.CURRENT
  }

  return map
}

function deriveEdgeStates(step) {
  const map = {}
  if (!step) return map

  for (const id of step.traversedEdges ?? []) map[id] = EDGE_STATE.TRAVERSED
  for (const id of step.pathEdges ?? []) map[id] = EDGE_STATE.PATH
  if (step.activeEdge) map[step.activeEdge] = EDGE_STATE.ACTIVE

  return map
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GraphCanvas({ readOnly = false, width = 850, height = 550 }) {
  const svgRef = useRef(null)

  // Graph topology store
  const graph = useGraphStore(s => s.graph)
  const builderMode = useGraphStore(s => s.builderMode)
  const selectedNodeId = useGraphStore(s => s.selectedNodeId)
  const selectedEdgeId = useGraphStore(s => s.selectedEdgeId)
  const pendingEdgeSrcId = useGraphStore(s => s.pendingEdgeSrcId)

  // Store actions
  const addNode = useGraphStore(s => s.addNode)
  const moveNode = useGraphStore(s => s.moveNode)
  const deleteNode = useGraphStore(s => s.deleteNode)
  const setNodeLabel = useGraphStore(s => s.setNodeLabel)
  const setNodeHeuristic = useGraphStore(s => s.setNodeHeuristic)
  const addEdge = useGraphStore(s => s.addEdge)
  const deleteEdge = useGraphStore(s => s.deleteEdge)
  const setEdgeWeight = useGraphStore(s => s.setEdgeWeight)
  const setStart = useGraphStore(s => s.setStart)
  const setGoal = useGraphStore(s => s.setGoal)
  const selectNode = useGraphStore(s => s.selectNode)
  const selectEdge = useGraphStore(s => s.selectEdge)
  const clearSelection = useGraphStore(s => s.clearSelection)
  const setPendingEdgeSrc = useGraphStore(s => s.setPendingEdgeSrc)

  // Algorithm step data
  const currentStep = useAlgorithmStore(s => s.steps[s.currentStepIndex] ?? null)
  const nodeStates = deriveNodeStates(currentStep, graph)
  const edgeStates = deriveEdgeStates(currentStep)

  // Dragging & Mouse Pointer tracking state
  const [dragNodeId, setDragNodeId] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [inlineEditorTarget, setInlineEditorTarget] = useState(null) // { type, id, x, y, initialValue }

  // Convert screen client coordinates (clientX, clientY) to SVG viewBox space
  const getCanvasCoords = useCallback((clientX, clientY) => {
    if (!svgRef.current) return { x: 0, y: 0 }
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse())
    return {
      x: Math.round(Math.max(30, Math.min(width - 30, svgP.x))),
      y: Math.round(Math.max(30, Math.min(height - 30, svgP.y)))
    }
  }, [width, height])

  // Window-level PointerMove and PointerUp listeners while dragging a node
  useEffect(() => {
    if (!dragNodeId || readOnly) return

    const handleWindowPointerMove = (e) => {
      const { x, y } = getCanvasCoords(e.clientX, e.clientY)
      moveNode(dragNodeId, x, y)
    }

    const handleWindowPointerUp = () => {
      setDragNodeId(null)
    }

    window.addEventListener('pointermove', handleWindowPointerMove)
    window.addEventListener('pointerup', handleWindowPointerUp)

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove)
      window.removeEventListener('pointerup', handleWindowPointerUp)
    }
  }, [dragNodeId, readOnly, getCanvasCoords, moveNode])

  // Canvas pointer down (Clicking canvas background)
  const handleCanvasPointerDown = useCallback((e) => {
    if (readOnly) return
    // Only react if target is the SVG background or grid
    if (e.target.tagName !== 'svg' && e.target.tagName !== 'rect') return

    const { x, y } = getCanvasCoords(e.clientX, e.clientY)

    if (builderMode === BUILDER_MODE.ADD_NODE) {
      addNode(x, y)
    } else {
      clearSelection()
      setInlineEditorTarget(null)
    }
  }, [readOnly, builderMode, getCanvasCoords, addNode, clearSelection])

  // Canvas pointer move (tracks rubber-band edge endpoint)
  const handleSvgPointerMove = useCallback((e) => {
    if (pendingEdgeSrcId) {
      const { x, y } = getCanvasCoords(e.clientX, e.clientY)
      setMousePos({ x, y })
    }
  }, [pendingEdgeSrcId, getCanvasCoords])

  // Node pointer down (starts drag and selects node)
  const handleNodePointerDown = (nodeId, e) => {
    if (readOnly) return
    e.stopPropagation()

    selectNode(nodeId)
    if (builderMode === BUILDER_MODE.SELECT || builderMode === BUILDER_MODE.ADD_NODE || builderMode === BUILDER_MODE.MOVE_NODE) {
      setDragNodeId(nodeId)
    }
  }

  const handleNodeClick = (nodeId, e) => {
    if (readOnly) return
    e.stopPropagation()

    switch (builderMode) {
      case BUILDER_MODE.SELECT:
        selectNode(nodeId)
        break

      case BUILDER_MODE.ADD_EDGE:
        if (!pendingEdgeSrcId) {
          setPendingEdgeSrc(nodeId)
        } else if (pendingEdgeSrcId !== nodeId) {
          addEdge(pendingEdgeSrcId, nodeId)
        } else {
          setPendingEdgeSrc(null) // Cancel if clicked same node twice
        }
        break

      case BUILDER_MODE.SET_START:
        setStart(nodeId)
        break

      case BUILDER_MODE.SET_GOAL:
        setGoal(nodeId)
        break

      case BUILDER_MODE.DELETE:
        deleteNode(nodeId)
        break

      default:
        selectNode(nodeId)
    }
  }

  const handleNodeDoubleClick = (node, e) => {
    if (readOnly) return
    e.stopPropagation()
    setInlineEditorTarget({
      type: 'node',
      id: node.id,
      x: node.x,
      y: node.y - 70,
      initialValue: node.label,
      initialHValue: node.hValue ?? node.h ?? null,
    })
  }

  // Edge interaction logic
  const handleEdgeClick = (edgeId, e) => {
    if (readOnly) return
    e.stopPropagation()

    if (builderMode === BUILDER_MODE.DELETE) {
      deleteEdge(edgeId)
    } else {
      selectEdge(edgeId)
    }
  }

  const handleEdgeDoubleClick = (edge, e) => {
    if (readOnly) return
    e.stopPropagation()
    const srcNode = graph.nodes[edge.sourceId]
    const tgtNode = graph.nodes[edge.targetId]
    if (!srcNode || !tgtNode) return

    const mx = (srcNode.x + tgtNode.x) / 2
    const my = (srcNode.y + tgtNode.y) / 2

    setInlineEditorTarget({
      type: 'edge',
      id: edge.id,
      x: mx,
      y: my - 30,
      initialValue: edge.weight,
    })
  }

  // Pending edge source node object
  const pendingSrcNode = pendingEdgeSrcId ? graph.nodes[pendingEdgeSrcId] : null

  return (
    <div className={styles.canvasWrap} style={{ width: '100%', height }}>
      <svg
        ref={svgRef}
        className={styles.svg}
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleSvgPointerMove}
        aria-label="Interactive graph canvas"
      >
        <defs>
          {/* Subtle Dot Grid Background Pattern */}
          <pattern id="dotGrid" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="12" cy="12" r="1.2" fill="var(--border)" opacity="0.45" />
          </pattern>

          {/* Directional Arrow Marker */}
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="var(--accent)" />
          </marker>
        </defs>

        {/* Grid Background */}
        <rect width="100%" height="100%" fill="url(#dotGrid)" />

        {/* Edges layer */}
        <g className="edgesLayer">
          {Object.values(graph.edges).map(edge => (
            <EdgeComponent
              key={edge.id}
              edge={edge}
              sourceNode={graph.nodes[edge.sourceId]}
              targetNode={graph.nodes[edge.targetId]}
              state={edgeStates[edge.id] ?? EDGE_STATE.DEFAULT}
              isSelected={selectedEdgeId === edge.id}
              readOnly={readOnly}
              onClick={(e) => handleEdgeClick(edge.id, e)}
              onDoubleClick={(e) => handleEdgeDoubleClick(edge, e)}
            />
          ))}
        </g>

        {/* Animated edge traversal particles for evaluated neighbors */}
        {(() => {
          if (!currentStep) return null
          const particles = []
          const activeNodeId = currentStep.currentNode ?? currentStep.parentNode
          const pNode = activeNodeId ? graph.nodes[activeNodeId] : null

          if (pNode && currentStep.neighborsConsidered && currentStep.neighborsConsidered.length > 0) {
            currentStep.neighborsConsidered.forEach((item, idx) => {
              const nNode = graph.nodes[item.neighborId]
              if (nNode) {
                particles.push(
                  <TraversalParticle
                    key={`${currentStep.stepIndex ?? 0}-${activeNodeId}-${item.neighborId}-${idx}`}
                    x1={pNode.x}
                    y1={pNode.y}
                    x2={nNode.x}
                    y2={nNode.y}
                    delay={idx * 120}
                  />
                )
              }
            })
          } else if (currentStep.parentNode && currentStep.neighborNode) {
            const srcNode = graph.nodes[currentStep.parentNode]
            const tgtNode = graph.nodes[currentStep.neighborNode]
            if (srcNode && tgtNode) {
              particles.push(
                <TraversalParticle
                  key={`${currentStep.stepIndex ?? 0}-${currentStep.parentNode}-${currentStep.neighborNode}`}
                  x1={srcNode.x}
                  y1={srcNode.y}
                  x2={tgtNode.x}
                  y2={tgtNode.y}
                />
              )
            }
          }
          return particles
        })()}

        {/* Rubber-band connection line in ADD_EDGE mode */}
        {pendingSrcNode && (
          <motion.line
            x1={pendingSrcNode.x}
            y1={pendingSrcNode.y}
            x2={mousePos.x}
            y2={mousePos.y}
            stroke="#f59e0b"
            strokeWidth={2.5}
            strokeDasharray="6 4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
        )}

        {/* Nodes layer */}
        <g className="nodesLayer">
          <AnimatePresence>
            {Object.values(graph.nodes).map(node => (
              <NodeComponent
                key={node.id}
                node={node}
                state={nodeStates[node.id] ?? NODE_STATE.UNEXPLORED}
                costLabel={currentStep?.gCost?.[node.id] ?? currentStep?.fCost?.[node.id]}
                isSelected={selectedNodeId === node.id}
                isPendingSrc={pendingEdgeSrcId === node.id}
                readOnly={readOnly}
                onPointerDown={(e) => handleNodePointerDown(node.id, e)}
                onClick={(e) => handleNodeClick(node.id, e)}
                onDoubleClick={(e) => handleNodeDoubleClick(node, e)}
              />
            ))}
          </AnimatePresence>
        </g>
      </svg>

      {/* Inline Editor Popover Overlay */}
      {inlineEditorTarget && (
        <InlineEditor
          target={inlineEditorTarget}
          onSave={(newValue, newHValue) => {
            if (inlineEditorTarget.type === 'node') {
              setNodeLabel(inlineEditorTarget.id, newValue)
              // newHValue is null when cleared, or a number
              setNodeHeuristic(inlineEditorTarget.id, newHValue)
            } else if (inlineEditorTarget.type === 'edge') {
              setEdgeWeight(inlineEditorTarget.id, newValue)
            }
            setInlineEditorTarget(null)
          }}
          onCancel={() => setInlineEditorTarget(null)}
        />
      )}
    </div>
  )
}
