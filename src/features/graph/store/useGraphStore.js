/**
 * useGraphStore.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Zustand store that owns the mutable graph topology (nodes, edges, start/goal).
 *
 * Consumed by: GraphBuilder, GraphCanvas, Node, Edge, EdgeWeightEditor
 *
 * Kept separate from useAlgorithmStore so the builder can be cleared/reset
 * independently of any running algorithm session.
 */

import { create } from 'zustand'
import { createGraph, createNode, createEdge } from '../types/graphStructures.js'
import { BUILDER_MODE } from '../types/graphTypes.js'
import { createPresetGraph } from '../utils/graphUtils.js'

let _nodeCounter = 0
const nextNodeId = () => {
  // Generate labels A, B, C … Z, A1, B1 …
  const idx    = _nodeCounter++
  const letter = String.fromCharCode(65 + (idx % 26))
  const suffix = idx >= 26 ? String(Math.floor(idx / 26)) : ''
  return letter + suffix
}

const nextEdgeId = (src, tgt) => `${src}-${tgt}`

// ─────────────────────────────────────────────────────────────────────────────

export const useGraphStore = create((set, get) => ({
  // ── Graph topology ─────────────────────────────────────────────────────────
  graph: createPresetGraph(),

  // ── Builder interaction state ──────────────────────────────────────────────
  builderMode:      BUILDER_MODE.SELECT,
  selectedNodeId:   null,
  selectedEdgeId:   null,
  pendingEdgeSrcId: null,   // first click in ADD_EDGE mode

  // ── Actions ────────────────────────────────────────────────────────────────

  setBuilderMode: (mode) => set({ builderMode: mode, pendingEdgeSrcId: null }),

  // Node CRUD
  addNode: (x, y, customLabel = null) => {
    // Skip ids already taken (loadGraph does not know which labels a graph used)
    let id = nextNodeId()
    while (get().graph.nodes[id]) id = nextNodeId()
    const label = customLabel || id
    const node  = createNode(id, x, y, { label })
    
    set(state => {
      // If this is the first node, automatically set it as start
      const count = Object.keys(state.graph.nodes).length
      const isStart = count === 0
      const startId = isStart ? id : state.graph.startId

      return {
        graph: {
          ...state.graph,
          nodes: { ...state.graph.nodes, [id]: { ...node, isStart } },
          startId,
        },
        selectedNodeId: id,
        selectedEdgeId: null,
      }
    })
    return id
  },

  deleteNode: (nodeId) => {
    set(state => {
      const nodes = { ...state.graph.nodes }
      delete nodes[nodeId]

      // Also delete connected edges
      const edges = Object.fromEntries(
        Object.entries(state.graph.edges).filter(
          ([, e]) => e.sourceId !== nodeId && e.targetId !== nodeId
        )
      )

      const startId = state.graph.startId === nodeId ? null : state.graph.startId
      const goalId  = state.graph.goalId  === nodeId ? null : state.graph.goalId

      return {
        graph: { ...state.graph, nodes, edges, startId, goalId },
        selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
        pendingEdgeSrcId: state.pendingEdgeSrcId === nodeId ? null : state.pendingEdgeSrcId,
      }
    })
  },

  moveNode: (nodeId, x, y) => {
    set(state => ({
      graph: {
        ...state.graph,
        nodes: {
          ...state.graph.nodes,
          [nodeId]: { ...state.graph.nodes[nodeId], x, y },
        },
      },
    }))
  },

  setNodeLabel: (nodeId, label) => {
    const trimmed = label.trim()
    if (!trimmed) return
    set(state => ({
      graph: {
        ...state.graph,
        nodes: {
          ...state.graph.nodes,
          [nodeId]: { ...state.graph.nodes[nodeId], label: trimmed },
        },
      },
    }))
  },

  setNodeHeuristic: (nodeId, heuristic) => {
    const val = (heuristic === '' || heuristic === null || heuristic === undefined)
      ? null
      : (isNaN(Number(heuristic)) ? 0 : Math.max(0, Number(heuristic)))
    set(state => {
      const node = state.graph.nodes[nodeId]
      if (!node) return state
      return {
        graph: {
          ...state.graph,
          nodes: {
            ...state.graph.nodes,
            [nodeId]: { ...node, hValue: val, h: val },
          },
        },
      }
    })
  },

  // Edge CRUD
  addEdge: (sourceId, targetId, weight = 1) => {
    if (sourceId === targetId) return null // Prevent self-loop

    // Check existing edge in either direction for undirected graphs
    const state = get()
    const existing = Object.values(state.graph.edges).find(
      e => (e.sourceId === sourceId && e.targetId === targetId) ||
           (e.sourceId === targetId && e.targetId === sourceId)
    )

    if (existing) {
      // If already exists, select it
      set({ selectedEdgeId: existing.id, pendingEdgeSrcId: null })
      return existing.id
    }

    const id   = nextEdgeId(sourceId, targetId)
    const edge = createEdge(id, sourceId, targetId, { weight: Math.max(1, Number(weight) || 1) })
    set(state => ({
      graph: {
        ...state.graph,
        edges: { ...state.graph.edges, [id]: edge },
      },
      selectedEdgeId: id,
      pendingEdgeSrcId: null,
    }))
    return id
  },

  deleteEdge: (edgeId) => {
    set(state => {
      const edges = { ...state.graph.edges }
      delete edges[edgeId]
      return {
        graph: { ...state.graph, edges },
        selectedEdgeId: state.selectedEdgeId === edgeId ? null : state.selectedEdgeId,
      }
    })
  },

  setEdgeWeight: (edgeId, weight) => {
    const num = Math.max(1, Number(weight) || 1)
    set(state => ({
      graph: {
        ...state.graph,
        edges: {
          ...state.graph.edges,
          [edgeId]: { ...state.graph.edges[edgeId], weight: num },
        },
      },
    }))
  },

  toggleEdgeDirected: (edgeId) => {
    set(state => {
      const edge = state.graph.edges[edgeId]
      if (!edge) return state
      return {
        graph: {
          ...state.graph,
          edges: {
            ...state.graph.edges,
            [edgeId]: { ...edge, directed: !edge.directed },
          },
        },
      }
    })
  },

  // Start / Goal
  setStart: (nodeId) => {
    set(state => {
      const nodes = { ...state.graph.nodes }
      // Clear old start
      if (state.graph.startId && nodes[state.graph.startId]) {
        nodes[state.graph.startId] = { ...nodes[state.graph.startId], isStart: false }
      }
      if (nodes[nodeId]) {
        nodes[nodeId] = { ...nodes[nodeId], isStart: true, isGoal: false }
      }
      return {
        graph: {
          ...state.graph,
          nodes,
          startId: nodeId,
          goalId: state.graph.goalId === nodeId ? null : state.graph.goalId,
        },
      }
    })
  },

  setGoal: (nodeId) => {
    set(state => {
      const nodes = { ...state.graph.nodes }
      if (state.graph.goalId && nodes[state.graph.goalId]) {
        nodes[state.graph.goalId] = { ...nodes[state.graph.goalId], isGoal: false }
      }
      if (nodes[nodeId]) {
        nodes[nodeId] = { ...nodes[nodeId], isGoal: true, isStart: false }
      }
      return {
        graph: {
          ...state.graph,
          nodes,
          goalId: nodeId,
          startId: state.graph.startId === nodeId ? null : state.graph.startId,
        },
      }
    })
  },

  // Selection
  selectNode: (nodeId) => set({ selectedNodeId: nodeId, selectedEdgeId: null }),
  selectEdge:  (edgeId) => set({ selectedEdgeId: edgeId, selectedNodeId: null }),
  clearSelection: () => set({ selectedNodeId: null, selectedEdgeId: null }),

  // Pending edge source (first click in ADD_EDGE mode)
  setPendingEdgeSrc: (nodeId) => set({ pendingEdgeSrcId: nodeId }),

  // Reset
  clearGraph: () => {
    _nodeCounter = 0
    set({
      graph:            createGraph(),
      selectedNodeId:   null,
      selectedEdgeId:   null,
      pendingEdgeSrcId: null,
    })
  },

  resetGraph: () => {
    _nodeCounter = 0
    set({
      graph:            createGraph(),
      selectedNodeId:   null,
      selectedEdgeId:   null,
      pendingEdgeSrcId: null,
    })
  },

  loadPreset: () => {
    _nodeCounter = 6   // A–F already used in preset
    set({
      graph:            createPresetGraph(),
      selectedNodeId:   null,
      selectedEdgeId:   null,
      pendingEdgeSrcId: null,
    })
  },

  loadGraph: (graph) => {
    set({ graph, selectedNodeId: null, selectedEdgeId: null })
  },
}))
