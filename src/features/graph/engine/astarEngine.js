/**
 * astarEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * A* Search step generator.
 *
 * Expands the node with the lowest f(n) = g(n) + h(n).
 * Optimal and complete when heuristic is admissible (never overestimates).
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
 * Run A* on the given graph.
 *
 * @param {import('../types/graphStructures.js').Graph} graph
 * @param {function} [heuristicFn] – heuristic(nodeA, nodeB) → number
 * @returns {import('../types/graphStructures.js').AlgorithmStep[]}
 */
export function runAStar(graph, heuristicFn = euclideanHeuristic) {
  const steps = []
  const adj   = buildAdjacency(graph, false)

  const { startId, goalId } = graph
  if (!startId || !goalId) return steps

  const goalNode = graph.nodes[goalId]

  const h = (nodeId) => {
    const node = graph.nodes[nodeId]
    return node && goalNode ? heuristicFn(node, goalNode) : 0
  }

  // ── Data structures ───────────────────────────────────────────────────────
  const pq             = new MinHeap()
  const gCost          = { [startId]: 0 }
  const hCost          = { [startId]: h(startId) }
  const fCost          = { [startId]: gCost[startId] + hCost[startId] }
  const parentMap      = { [startId]: null }
  const visited        = new Set()
  const traversedEdges = []
  let   nodesExpanded  = 0

  pq.push({ id: startId, priority: fCost[startId] })

  steps.push(createAlgorithmStep({
    currentNode:     startId,
    visitedNodes:    [],
    frontierNodes:   [startId],
    unexploredNodes: Object.keys(graph.nodes).filter(id => id !== startId),
    gCost:           { ...gCost },
    hCost:           { ...hCost },
    fCost:           { ...fCost },
    parentMap:       { ...parentMap },
    frontierDetail:  [{
      nodeId: startId,
      priority: fCost[startId],
      g: gCost[startId],
      h: hCost[startId],
    }],
    reason: `Start at ${startId}. g=${gCost[startId]}, h=${hCost[startId].toFixed(2)}, f=${fCost[startId].toFixed(2)}.`,
    calculations: [
      `h(${startId}) = ${hCost[startId].toFixed(2)}`,
      `g(${startId}) = 0`,
      `f(${startId}) = g + h = 0 + ${hCost[startId].toFixed(2)} = ${fCost[startId].toFixed(2)}`,
    ],
    metrics:  { nodesExpanded: 0, pathLength: 0, totalCost: 0, frontierSize: 1 },
    stepIndex: 0,
    isInitial: true,
    isFinal:   false,
    pathFound: false,
  }))

  // ── A* loop ───────────────────────────────────────────────────────────────
  while (!pq.isEmpty()) {
    const { id: current, priority: currentF } = pq.pop()

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
        gCost:           { ...gCost },
        hCost:           { ...hCost },
        fCost:           { ...fCost },
        parentMap:       { ...parentMap },
        frontierDetail:  pq.toArray().map(e => ({
          nodeId: e.id, priority: e.priority,
          g: gCost[e.id], h: hCost[e.id],
        })),
        reason:       `Goal ${goalId} dequeued (f = ${currentF.toFixed(2)}). Path: ${pathNodes.join(' → ')}`,
        calculations: [`Total cost g(${goalId}) = ${gCost[goalId]}`],
        metrics:      {
          nodesExpanded,
          pathLength:  pathNodes.length - 1,
          totalCost:   gCost[goalId] ?? 0,
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

    for (const { neighborId, edgeId, weight } of neighbors) {
      if (visited.has(neighborId)) continue

      const newG = (gCost[current] ?? Infinity) + weight
      const oldG = gCost[neighborId] ?? Infinity

      traversedEdges.push(edgeId)

      if (newG < oldG) {
        gCost[neighborId]     = newG
        hCost[neighborId]     = h(neighborId)
        fCost[neighborId]     = newG + hCost[neighborId]
        parentMap[neighborId] = current

        pq.push({ id: neighborId, priority: fCost[neighborId] })

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
          hCost:           { ...hCost },
          fCost:           { ...fCost },
          parentMap:       { ...parentMap },
          frontierDetail:  pq.toArray().map(e => ({
            nodeId: e.id, priority: e.priority,
            g: gCost[e.id], h: hCost[e.id],
          })),
          reason: `Relaxing ${current} → ${neighborId}. f(${neighborId}) updated to ${fCost[neighborId].toFixed(2)}.`,
          calculations: [
            `g(${neighborId}) = g(${current}) + w(${current},${neighborId}) = ${gCost[current]} + ${weight} = ${newG}`,
            `h(${neighborId}) = ${hCost[neighborId].toFixed(2)}`,
            `f(${neighborId}) = g + h = ${newG} + ${hCost[neighborId].toFixed(2)} = ${fCost[neighborId].toFixed(2)}`,
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
          hCost:           { ...hCost },
          fCost:           { ...fCost },
          parentMap:       { ...parentMap },
          frontierDetail:  pq.toArray().map(e => ({
            nodeId: e.id, priority: e.priority,
            g: gCost[e.id], h: hCost[e.id],
          })),
          reason:       `Edge ${current} → ${neighborId} skipped: new g=${newG} ≥ existing g=${oldG}.`,
          calculations: [`${newG} ≥ ${oldG} — no update to f(${neighborId})`],
          metrics:      { nodesExpanded, pathLength: 0, totalCost: 0, frontierSize: pq.size },
          stepIndex:    steps.length,
          isInitial:    false,
          isFinal:      false,
          pathFound:    false,
        }))
      }
    }
  }

  // No path
  steps.push(createAlgorithmStep({
    currentNode:     null,
    visitedNodes:    [...visited],
    frontierNodes:   [],
    traversedEdges:  [...traversedEdges],
    gCost:           { ...gCost },
    hCost:           { ...hCost },
    fCost:           { ...fCost },
    parentMap:       { ...parentMap },
    reason:          `Open set empty. No path from ${startId} to ${goalId}.`,
    calculations:    [],
    metrics:         { nodesExpanded, pathLength: 0, totalCost: 0, frontierSize: 0 },
    stepIndex:       steps.length,
    isInitial:       false,
    isFinal:         true,
    pathFound:       false,
  }))

  return steps
}
