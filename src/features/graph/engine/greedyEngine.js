/**
 * greedyEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Greedy Best-First Search step generator.
 *
 * Expands the node with the smallest heuristic h(n) — ignores path cost.
 * Uses Euclidean distance to the goal node as the heuristic by default.
 *
 * Pure logic — zero React, zero DOM, zero side effects.
 */

import { createAlgorithmStep } from '../types/graphStructures.js'
import { MinHeap } from '../utils/MinHeap.js'
import {
  buildAdjacency,
  getNeighbors,
  euclideanHeuristic,
  reconstructPath,
  pathToEdges,
} from '../utils/graphUtils.js'

/**
 * Run Greedy Best-First Search on the given graph.
 *
 * @param {import('../types/graphStructures.js').Graph} graph
 * @param {function} [heuristicFn] – optional custom heuristic(nodeA, nodeB) → number
 * @returns {import('../types/graphStructures.js').AlgorithmStep[]}
 */
export function runGreedy(graph, heuristicFn = euclideanHeuristic) {
  const steps = []
  const adj   = buildAdjacency(graph, false)

  const { startId, goalId } = graph
  if (!startId || !goalId) return steps

  const goalNode  = graph.nodes[goalId]

  const h = (nodeId) => {
    const node = graph.nodes[nodeId]
    return node && goalNode ? heuristicFn(node, goalNode) : 0
  }

  // ── Data structures ───────────────────────────────────────────────────────
  const pq             = new MinHeap()
  const hCost          = {}
  const parentMap      = { [startId]: null }
  const visited        = new Set()
  const traversedEdges = []
  let   nodesExpanded  = 0

  hCost[startId] = h(startId)
  pq.push({ id: startId, priority: hCost[startId] })

  steps.push(createAlgorithmStep({
    currentNode:     startId,
    visitedNodes:    [],
    frontierNodes:   [startId],
    unexploredNodes: Object.keys(graph.nodes).filter(id => id !== startId),
    hCost:           { ...hCost },
    parentMap:       { ...parentMap },
    frontierDetail:  [{ nodeId: startId, priority: hCost[startId], h: hCost[startId] }],
    reason:          `Start at ${startId}. h(${startId}) = ${hCost[startId].toFixed(1)}.`,
    calculations:    [`h(${startId}) = euclidean distance to ${goalId} = ${hCost[startId].toFixed(2)}`],
    metrics:         { nodesExpanded: 0, pathLength: 0, totalCost: 0, frontierSize: 1 },
    stepIndex:       0,
    isInitial:       true,
    isFinal:         false,
    pathFound:       false,
  }))

  // ── Greedy loop ───────────────────────────────────────────────────────────
  while (!pq.isEmpty()) {
    const { id: current } = pq.pop()

    if (visited.has(current)) continue
    visited.add(current)
    nodesExpanded++

    if (current === goalId) {
      const pathNodes = reconstructPath(parentMap, goalId)
      const pathEdges = pathToEdges(pathNodes, graph)

      steps.push(createAlgorithmStep({
        currentNode:     goalId,
        visitedNodes:    [...visited],
        frontierNodes:   pq.toArray().map(e => e.id),
        pathNodes,
        pathEdges,
        traversedEdges:  [...traversedEdges],
        hCost:           { ...hCost },
        parentMap:       { ...parentMap },
        reason:          `Goal ${goalId} reached! Greedy chose path: ${pathNodes.join(' → ')}`,
        calculations:    [],
        metrics:         {
          nodesExpanded,
          pathLength: pathNodes.length - 1,
          totalCost:  0,   // Greedy doesn't track cost
          frontierSize: 0,
        },
        stepIndex: steps.length,
        isInitial: false,
        isFinal:   true,
        pathFound: true,
      }))
      return steps
    }

    const neighbors = getNeighbors(current, adj)

    for (const { neighborId, edgeId } of neighbors) {
      if (visited.has(neighborId)) continue

      traversedEdges.push(edgeId)
      hCost[neighborId] = h(neighborId)

      if (!(neighborId in parentMap)) {
        parentMap[neighborId] = current
      }
      pq.push({ id: neighborId, priority: hCost[neighborId] })

      steps.push(createAlgorithmStep({
        currentNode:     current,
        visitedNodes:    [...visited],
        frontierNodes:   pq.toArray().map(e => e.id),
        unexploredNodes: Object.keys(graph.nodes).filter(
          id => !visited.has(id) && !pq.toArray().find(e => e.id === id)
        ),
        activeEdge:      edgeId,
        traversedEdges:  [...traversedEdges],
        hCost:           { ...hCost },
        parentMap:       { ...parentMap },
        frontierDetail:  pq.toArray().map(e => ({ nodeId: e.id, priority: e.priority, h: e.priority })),
        reason:          `Enqueue ${neighborId} with h(${neighborId}) = ${hCost[neighborId].toFixed(2)}.`,
        calculations:    [`h(${neighborId}) = distance to ${goalId} = ${hCost[neighborId].toFixed(2)}`],
        metrics:         { nodesExpanded, pathLength: 0, totalCost: 0, frontierSize: pq.size },
        stepIndex:       steps.length,
        isInitial:       false,
        isFinal:         false,
        pathFound:       false,
      }))
    }
  }

  // No path
  steps.push(createAlgorithmStep({
    currentNode:     null,
    visitedNodes:    [...visited],
    frontierNodes:   [],
    traversedEdges:  [...traversedEdges],
    hCost:           { ...hCost },
    parentMap:       { ...parentMap },
    reason:          `No path from ${startId} to ${goalId} found.`,
    calculations:    [],
    metrics:         { nodesExpanded, pathLength: 0, totalCost: 0, frontierSize: 0 },
    stepIndex:       steps.length,
    isInitial:       false,
    isFinal:         true,
    pathFound:       false,
  }))

  return steps
}
