/**
 * ucsEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Uniform Cost Search step generator.
 *
 * UCS expands the node with the lowest cumulative path cost g(n).
 * Equivalent to Dijkstra's algorithm for single-target search.
 *
 * Pure logic — zero React, zero DOM, zero side effects.
 */

import { createAlgorithmStep } from '../types/graphStructures.js'
import { MinHeap } from '../utils/MinHeap.js'
import {
  buildAdjacency,
  getNeighbors,
  reconstructPath,
  pathToEdges,
} from '../utils/graphUtils.js'

/**
 * Run UCS on the given graph.
 *
 * @param {import('../types/graphStructures.js').Graph} graph
 * @returns {import('../types/graphStructures.js').AlgorithmStep[]}
 */
export function runUCS(graph) {
  const steps = []
  const adj   = buildAdjacency(graph, false)

  const { startId, goalId } = graph
  if (!startId || !goalId) return steps

  // ── Data structures ───────────────────────────────────────────────────────
  const pq             = new MinHeap()
  const gCost          = { [startId]: 0 }
  const parentMap      = { [startId]: null }
  const visited        = new Set()
  const traversedEdges = []
  let   nodesExpanded  = 0

  pq.push({ id: startId, priority: 0 })

  steps.push(createAlgorithmStep({
    currentNode:     startId,
    visitedNodes:    [],
    frontierNodes:   [startId],
    unexploredNodes: Object.keys(graph.nodes).filter(id => id !== startId),
    gCost:           { ...gCost },
    parentMap:       { ...parentMap },
    frontierDetail:  pq.toArray().map(e => ({ nodeId: e.id, priority: e.priority, g: e.priority })),
    reason:          `Start at node ${startId}. g(${startId}) = 0. Add to priority queue.`,
    calculations:    ['g(start) = 0'],
    metrics:         { nodesExpanded: 0, pathLength: 0, totalCost: 0, frontierSize: 1 },
    stepIndex:       0,
    isInitial:       true,
    isFinal:         false,
    pathFound:       false,
  }))

  // ── UCS loop ──────────────────────────────────────────────────────────────
  while (!pq.isEmpty()) {
    const { id: current, priority: currentCost } = pq.pop()

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
        unexploredNodes: Object.keys(graph.nodes).filter(
          id => !visited.has(id) && !pq.toArray().find(e => e.id === id)
        ),
        pathNodes,
        pathEdges,
        traversedEdges:  [...traversedEdges],
        gCost:           { ...gCost },
        parentMap:       { ...parentMap },
        frontierDetail:  pq.toArray().map(e => ({ nodeId: e.id, priority: e.priority, g: e.priority })),
        reason:          `Goal ${goalId} dequeued with g(${goalId}) = ${currentCost}. Path: ${pathNodes.join(' → ')}`,
        calculations:    [`Total cost: ${currentCost}`],
        metrics:         {
          nodesExpanded,
          pathLength: pathNodes.length - 1,
          totalCost:  currentCost,
          frontierSize: pq.size,
        },
        stepIndex: steps.length,
        isInitial: false,
        isFinal:   true,
        pathFound: true,
      }))
      return steps
    }

    const neighbors = getNeighbors(current, adj)

    for (const { neighborId, edgeId, weight } of neighbors) {
      if (visited.has(neighborId)) continue

      const newG = (gCost[current] ?? Infinity) + weight
      const oldG = gCost[neighborId] ?? Infinity

      traversedEdges.push(edgeId)

      if (newG < oldG) {
        gCost[neighborId]  = newG
        parentMap[neighborId] = current
        pq.push({ id: neighborId, priority: newG })

        steps.push(createAlgorithmStep({
          currentNode:     current,
          visitedNodes:    [...visited],
          frontierNodes:   pq.toArray().map(e => e.id),
          unexploredNodes: Object.keys(graph.nodes).filter(
            id => !visited.has(id) && !pq.toArray().find(e => e.id === id)
          ),
          activeEdge:      edgeId,
          traversedEdges:  [...traversedEdges],
          gCost:           { ...gCost },
          parentMap:       { ...parentMap },
          frontierDetail:  pq.toArray().map(e => ({ nodeId: e.id, priority: e.priority, g: e.priority })),
          reason:          `Relaxing edge ${current} → ${neighborId}: g(${neighborId}) updated from ${oldG === Infinity ? '∞' : oldG} to ${newG}.`,
          calculations:    [
            `g(${neighborId}) = g(${current}) + w(${current},${neighborId})`,
            `g(${neighborId}) = ${gCost[current]} + ${weight} = ${newG}`,
          ],
          metrics: { nodesExpanded, pathLength: 0, totalCost: 0, frontierSize: pq.size },
          stepIndex: steps.length,
          isInitial: false,
          isFinal:   false,
          pathFound: false,
        }))
      } else {
        steps.push(createAlgorithmStep({
          currentNode:     current,
          visitedNodes:    [...visited],
          frontierNodes:   pq.toArray().map(e => e.id),
          unexploredNodes: Object.keys(graph.nodes).filter(
            id => !visited.has(id) && !pq.toArray().find(e => e.id === id)
          ),
          activeEdge:      edgeId,
          traversedEdges:  [...traversedEdges],
          gCost:           { ...gCost },
          parentMap:       { ...parentMap },
          frontierDetail:  pq.toArray().map(e => ({ nodeId: e.id, priority: e.priority, g: e.priority })),
          reason:          `Edge ${current} → ${neighborId} skipped: existing path g(${neighborId}) = ${oldG} ≤ new path ${newG}.`,
          calculations:    [`${newG} ≥ ${oldG} — no update`],
          metrics: { nodesExpanded, pathLength: 0, totalCost: 0, frontierSize: pq.size },
          stepIndex: steps.length,
          isInitial: false,
          isFinal:   false,
          pathFound: false,
        }))
      }
    }
  }

  // No path
  steps.push(createAlgorithmStep({
    currentNode:     null,
    visitedNodes:    [...visited],
    frontierNodes:   [],
    unexploredNodes: Object.keys(graph.nodes).filter(id => !visited.has(id)),
    traversedEdges:  [...traversedEdges],
    gCost:           { ...gCost },
    parentMap:       { ...parentMap },
    reason:          `Priority queue empty. No path from ${startId} to ${goalId}.`,
    calculations:    [],
    metrics:         { nodesExpanded, pathLength: 0, totalCost: 0, frontierSize: 0 },
    stepIndex:       steps.length,
    isInitial:       false,
    isFinal:         true,
    pathFound:       false,
  }))

  return steps
}
