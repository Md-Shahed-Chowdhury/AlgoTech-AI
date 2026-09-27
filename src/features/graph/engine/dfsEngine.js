/**
 * dfsEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Depth-First Search step generator.
 *
 * Pure logic — zero React, zero DOM, zero side effects.
 */

import { createAlgorithmStep } from '../types/graphStructures.js'
import {
  buildAdjacency,
  getNeighbors,
  reconstructPath,
  pathToEdges,
} from '../utils/graphUtils.js'

/**
 * Run DFS (iterative, using an explicit stack) on the given graph.
 *
 * @param {import('../types/graphStructures.js').Graph} graph
 * @returns {import('../types/graphStructures.js').AlgorithmStep[]}
 */
export function runDFS(graph) {
  const steps = []
  const adj   = buildAdjacency(graph, false)

  const { startId, goalId } = graph
  if (!startId || !goalId) return steps

  // ── Data structures ───────────────────────────────────────────────────────
  const visited        = new Set()
  const stack          = [startId]          // DFS uses a stack
  const parentMap      = { [startId]: null }
  const traversedEdges = []
  let   nodesExpanded  = 0

  // Initial step
  steps.push(createAlgorithmStep({
    currentNode:     startId,
    visitedNodes:    [],
    frontierNodes:   [...stack],
    unexploredNodes: Object.keys(graph.nodes).filter(id => id !== startId),
    parentMap:       { ...parentMap },
    reason:          `Start at node ${startId}. Push it onto the stack.`,
    calculations:    [`Stack: [${stack.join(', ')}]`],
    metrics:         { nodesExpanded: 0, pathLength: 0, totalCost: 0, frontierSize: 1 },
    stepIndex:       0,
    isInitial:       true,
    isFinal:         false,
    pathFound:       false,
  }))

  // ── DFS loop ──────────────────────────────────────────────────────────────
  while (stack.length > 0) {
    const current = stack.pop()

    if (visited.has(current)) continue
    visited.add(current)
    nodesExpanded++

    if (current === goalId) {
      const pathNodes = reconstructPath(parentMap, goalId)
      const pathEdges = pathToEdges(pathNodes, graph)

      steps.push(createAlgorithmStep({
        currentNode:     goalId,
        visitedNodes:    [...visited],
        frontierNodes:   [...stack],
        unexploredNodes: Object.keys(graph.nodes).filter(
          id => !visited.has(id) && !stack.includes(id)
        ),
        pathNodes,
        pathEdges,
        traversedEdges:  [...traversedEdges],
        parentMap:       { ...parentMap },
        reason:          `Goal ${goalId} reached! Path: ${pathNodes.join(' → ')}`,
        calculations:    [`Path length: ${pathNodes.length - 1} edges`],
        metrics:         {
          nodesExpanded,
          pathLength: pathNodes.length - 1,
          totalCost:  pathNodes.length - 1,
          frontierSize: 0,
        },
        stepIndex:  steps.length,
        isInitial:  false,
        isFinal:    true,
        pathFound:  true,
      }))
      return steps
    }

    const neighbors = getNeighbors(current, adj)

    for (const { neighborId, edgeId } of neighbors) {
      if (!visited.has(neighborId)) {
        // Only update parentMap if we haven't seen it at all
        if (!(neighborId in parentMap)) {
          parentMap[neighborId] = current
        }
        stack.push(neighborId)
        traversedEdges.push(edgeId)

        steps.push(createAlgorithmStep({
          currentNode:     current,
          visitedNodes:    [...visited],
          frontierNodes:   [...stack],
          unexploredNodes: Object.keys(graph.nodes).filter(
            id => !visited.has(id) && !stack.includes(id)
          ),
          activeEdge:      edgeId,
          traversedEdges:  [...traversedEdges],
          parentMap:       { ...parentMap },
          reason:          `Pushing neighbor ${neighborId} onto the stack from ${current}.`,
          calculations:    [`Stack: [${[...stack].join(', ')}]`],
          metrics:         { nodesExpanded, pathLength: 0, totalCost: 0, frontierSize: stack.length },
          stepIndex:       steps.length,
          isInitial:       false,
          isFinal:         false,
          pathFound:       false,
        }))
      }
    }
  }

  // No path found
  steps.push(createAlgorithmStep({
    currentNode:     null,
    visitedNodes:    [...visited],
    frontierNodes:   [],
    unexploredNodes: Object.keys(graph.nodes).filter(id => !visited.has(id)),
    traversedEdges:  [...traversedEdges],
    parentMap:       { ...parentMap },
    reason:          `Stack is empty. No path found from ${startId} to ${goalId}.`,
    calculations:    [],
    metrics:         { nodesExpanded, pathLength: 0, totalCost: 0, frontierSize: 0 },
    stepIndex:       steps.length,
    isInitial:       false,
    isFinal:         true,
    pathFound:       false,
  }))

  return steps
}
