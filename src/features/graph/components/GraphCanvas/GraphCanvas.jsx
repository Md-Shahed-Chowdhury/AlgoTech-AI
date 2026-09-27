/**
 * GraphCanvas.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * SVG-based canvas that renders nodes and edges.
 * Visual state is derived from the current AlgorithmStep (via useAlgorithmStore)
 * and the graph topology (via useGraphStore).
 *
 * STUB — full rendering implementation comes in the next phase.
 *
 * Props:
 *   readOnly  {boolean}  – if true, disables builder interactions (Exam mode)
 *   width     {number}   – canvas width in pixels
 *   height    {number}   – canvas height in pixels
 */

import { useRef, useCallback } from 'react'
import { useGraphStore }     from '../../store/useGraphStore.js'
import { useAlgorithmStore } from '../../store/useAlgorithmStore.js'
import { BUILDER_MODE, NODE_STATE, EDGE_STATE } from '../../types/graphTypes.js'
import styles from './GraphCanvas.module.css'

// ── Visual state derivation ───────────────────────────────────────────────────

/**
 * Given a step and graph, return a map of { nodeId → NODE_STATE }.
 * This is the only place where algorithm step data is translated to visual state.
 */
function deriveNodeStates(step, graph) {
  const map = {}
  for (const id of Object.keys(graph.nodes)) {
    const node = graph.nodes[id]
    if (node.isStart)                            map[id] = NODE_STATE.START
    else if (node.isGoal)                        map[id] = NODE_STATE.GOAL
    else                                         map[id] = NODE_STATE.UNEXPLORED
  }
  if (!step) return map

  for (const id of (step.unexploredNodes ?? [])) {
    if (!graph.nodes[id]?.isStart && !graph.nodes[id]?.isGoal) {
      map[id] = NODE_STATE.UNEXPLORED
    }
  }
  for (const id of (step.frontierNodes ?? [])) {
    map[id] = NODE_STATE.FRONTIER
  }
  for (const id of (step.visitedNodes ?? [])) {
    if (!graph.nodes[id]?.isStart && !graph.nodes[id]?.isGoal) {
      map[id] = NODE_STATE.VISITED
    }
  }
  for (const id of (step.pathNodes ?? [])) {
    if (!graph.nodes[id]?.isStart && !graph.nodes[id]?.isGoal) {
      map[id] = NODE_STATE.PATH
    }
  }
  if (step.currentNode && !graph.nodes[step.currentNode]?.isGoal) {
    map[step.currentNode] = NODE_STATE.CURRENT
  }

  return map
}

/**
 * Given a step and graph, return a map of { edgeId → EDGE_STATE }.
 */
function deriveEdgeStates(step) {
  const map = {}
  if (!step) return map

  for (const id of (step.traversedEdges ?? [])) map[id] = EDGE_STATE.TRAVERSED
  for (const id of (step.pathEdges      ?? [])) map[id] = EDGE_STATE.PATH
  if (step.activeEdge) map[step.activeEdge] = EDGE_STATE.ACTIVE

  return map
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GraphCanvas({ readOnly = false, width = 800, height = 500 }) {
  const svgRef = useRef(null)

  // Graph topology
  const graph       = useGraphStore(s => s.graph)
  const builderMode = useGraphStore(s => s.builderMode)
  const addNode     = useGraphStore(s => s.addNode)
  const selectNode  = useGraphStore(s => s.selectNode)

  // Algorithm step (null when no run prepared)
  const currentStep = useAlgorithmStore(s => s.steps[s.currentStepIndex] ?? null)

  const nodeStates = deriveNodeStates(currentStep, graph)
  const edgeStates = deriveEdgeStates(currentStep)

  // ── Canvas click handler ────────────────────────────────────────────────────
  const handleCanvasClick = useCallback((e) => {
    if (readOnly) return
    if (builderMode !== BUILDER_MODE.ADD_NODE) return

    const rect = svgRef.current.getBoundingClientRect()
    const x    = e.clientX - rect.left
    const y    = e.clientY - rect.top
    addNode(x, y)
  }, [readOnly, builderMode, addNode])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={styles.canvasWrap} style={{ width, height }}>
      <svg
        ref={svgRef}
        className={styles.svg}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        onClick={handleCanvasClick}
        aria-label="Graph canvas"
      >
        {/* Edges rendered below nodes */}
        {Object.values(graph.edges).map(edge => (
          <EdgeComponent
            key={edge.id}
            edge={edge}
            sourceNode={graph.nodes[edge.sourceId]}
            targetNode={graph.nodes[edge.targetId]}
            state={edgeStates[edge.id] ?? EDGE_STATE.DEFAULT}
            readOnly={readOnly}
          />
        ))}

        {/* Nodes */}
        {Object.values(graph.nodes).map(node => (
          <NodeComponent
            key={node.id}
            node={node}
            state={nodeStates[node.id] ?? NODE_STATE.UNEXPLORED}
            costLabel={currentStep?.gCost?.[node.id] ?? currentStep?.fCost?.[node.id]}
            readOnly={readOnly}
            onClick={() => !readOnly && selectNode(node.id)}
          />
        ))}
      </svg>
    </div>
  )
}

// ── Sub-components (will be split to Node.jsx / Edge.jsx in next phase) ───────

function NodeComponent({ node, state, costLabel, readOnly, onClick }) {
  // Placeholder — real styling comes in next phase
  return (
    <g
      className={`${styles.node} ${styles[`node--${state}`]}`}
      transform={`translate(${node.x}, ${node.y})`}
      onClick={onClick}
      style={{ cursor: readOnly ? 'default' : 'pointer' }}
      role="button"
      aria-label={`Node ${node.label}`}
    >
      <circle r={24} />
      <text textAnchor="middle" dominantBaseline="central" className={styles.nodeLabel}>
        {node.label}
      </text>
      {costLabel !== undefined && (
        <text y={-32} textAnchor="middle" className={styles.costLabel}>
          {typeof costLabel === 'number' ? costLabel.toFixed(1) : costLabel}
        </text>
      )}
    </g>
  )
}

function EdgeComponent({ edge, sourceNode, targetNode, state, readOnly }) {
  if (!sourceNode || !targetNode) return null

  const mx = (sourceNode.x + targetNode.x) / 2
  const my = (sourceNode.y + targetNode.y) / 2

  return (
    <g className={`${styles.edge} ${styles[`edge--${state}`]}`}>
      <line
        x1={sourceNode.x} y1={sourceNode.y}
        x2={targetNode.x} y2={targetNode.y}
        strokeWidth={2}
      />
      {/* Weight label */}
      <text x={mx} y={my - 8} textAnchor="middle" className={styles.edgeWeight}>
        {edge.weight !== 1 ? edge.weight : ''}
      </text>
    </g>
  )
}
