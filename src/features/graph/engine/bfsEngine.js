/**
 * bfsEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Breadth-First Search step generator.
 *
 * IMPORTANT: This is pure logic — zero React, zero DOM, zero side effects.
 * The UI calls runBFS(graph) and gets back an AlgorithmStep[].
 */

import { createAlgorithmStep } from '../types/graphStructures.js'
import {
  buildAdjacency,
  getNeighbors,
  reconstructPath,
  pathToEdges,
} from '../utils/graphUtils.js'

/**
 * Run BFS on the given graph and return a complete array of step snapshots.
 *
 * @param {import('../types/graphStructures.js').Graph} graph
 * @returns {import('../types/graphStructures.js').AlgorithmStep[]}
 */
export function runBFS(graph) {
  const steps = []
  const adj   = buildAdjacency(graph, false)

  const { startId, goalId } = graph
  if (!startId || !goalId) return steps

  // ── Initial state ─────────────────────────────────────────────────────────
  const visited     = new Set()
  const queue       = [startId]
  const parentMap   = { [startId]: null }
  const traversedEdges = []
  visited.add(startId)

  let nodesExpanded = 0

  // Push the "initial" step
  steps.push(createAlgorithmStep({
    currentNode:     startId,
    visitedNodes:    [...visited],
    frontierNodes:   [...queue],
    unexploredNodes: Object.keys(graph.nodes).filter(id => !visited.has(id) && !queue.includes(id)),
    parentMap:       { ...parentMap },
    traversedEdges:  [],
    reason:          `Start at node ${startId}. Add it to the queue.`,
    calculations:    [],
    metrics:         { nodesExpanded: 0, pathLength: 0, totalCost: 0, frontierSize: 1 },
    stepIndex:       0,
    isInitial:       true,
    isFinal:         false,
    pathFound:       false,
  }))

  // ── BFS loop ──────────────────────────────────────────────────────────────
  while (queue.length > 0) {
    const current = queue.shift()
    nodesExpanded++

    const neighbors = getNeighbors(current, adj)

    for (const { neighborId, edgeId } of neighbors) {
      const isGoal = neighborId === goalId

      if (!visited.has(neighborId)) {
        visited.add(neighborId)
        parentMap[neighborId] = current
        queue.push(neighborId)
        traversedEdges.push(edgeId)

        steps.push(createAlgorithmStep({
          currentNode:     current,
          visitedNodes:    [...visited],
          frontierNodes:   [...queue],
          unexploredNodes: Object.keys(graph.nodes).filter(
            id => !visited.has(id) && !queue.includes(id)
          ),
          activeEdge:      edgeId,
          traversedEdges:  [...traversedEdges],
          parentMap:       { ...parentMap },
          reason:          `Exploring edge ${current} → ${neighborId}. Node ${neighborId} is unvisited — enqueue it.`,
          calculations:    [`Queue after enqueue: [${[...queue].join(', ')}]`],
          metrics:         { nodesExpanded, pathLength: 0, totalCost: 0, frontierSize: queue.length },
          stepIndex:       steps.length,
          isInitial:       false,
          isFinal:         false,
          pathFound:       false,
        }))

        if (isGoal) {
          // Found the goal — reconstruct path and push final step
          const pathNodes = reconstructPath(parentMap, goalId)
          const pathEdges = pathToEdges(pathNodes, graph)

          steps.push(createAlgorithmStep({
            currentNode:     goalId,
            visitedNodes:    [...visited],
            frontierNodes:   [],
            unexploredNodes: [],
            pathNodes,
            pathEdges,
            activeEdge:      null,
            traversedEdges:  [...traversedEdges],
            parentMap:       { ...parentMap },
            reason:          `Goal ${goalId} reached! Path: ${pathNodes.join(' → ')}`,
            calculations:    [`Path length: ${pathNodes.length - 1} edges`],
            metrics: {
              nodesExpanded,
              pathLength: pathNodes.length - 1,
              totalCost:  pathNodes.length - 1, // BFS: cost = hops
              frontierSize: 0,
            },
            stepIndex:       steps.length,
            isInitial:       false,
            isFinal:         true,
            pathFound:       true,
          }))
          return steps
        }
      } else {
        // Neighbor already visited — note it but don't enqueue
        steps.push(createAlgorithmStep({
          currentNode:     current,
          visitedNodes:    [...visited],
          frontierNodes:   [...queue],
          unexploredNodes: Object.keys(graph.nodes).filter(
            id => !visited.has(id) && !queue.includes(id)
          ),
          activeEdge:      edgeId,
          traversedEdges:  [...traversedEdges],
          parentMap:       { ...parentMap },
          reason:          `Edge ${current} → ${neighborId} skipped — ${neighborId} is already visited.`,
          calculations:    [],
          metrics:         { nodesExpanded, pathLength: 0, totalCost: 0, frontierSize: queue.length },
          stepIndex:       steps.length,
          isInitial:       false,
          isFinal:         false,
          pathFound:       false,
        }))
      }
    }
  }

  // ── No path found ─────────────────────────────────────────────────────────
  steps.push(createAlgorithmStep({
    currentNode:     null,
    visitedNodes:    [...visited],
    frontierNodes:   [],
    unexploredNodes: Object.keys(graph.nodes).filter(id => !visited.has(id)),
    traversedEdges:  [...traversedEdges],
    parentMap:       { ...parentMap },
    reason:          `Queue is empty. No path found from ${startId} to ${goalId}.`,
    calculations:    [],
    metrics:         { nodesExpanded, pathLength: 0, totalCost: 0, frontierSize: 0 },
    stepIndex:       steps.length,
    isInitial:       false,
    isFinal:         true,
    pathFound:       false,
  }))

  return steps
}
