/**
 * bfsEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Independent, pure Breadth-First Search (BFS) simulation engine.
 * Generates an ordered array of AlgorithmStep snapshots detailing queue state,
 * node sets, parent map ancestry, current path, and pedagogical reasoning.
 */

import { createAlgorithmStep } from '../types/graphStructures.js'
import {
  buildAdjacency,
  getNeighbors,
  reconstructPath,
  pathToEdges,
} from '../utils/graphUtils.js'

/**
 * Run BFS on the given graph topology.
 *
 * @param {import('../types/graphStructures.js').Graph} graph
 * @returns {import('../types/graphStructures.js').AlgorithmStep[]}
 */
export function runBFS(graph) {
  const steps = []
  const { startId, goalId, nodes, edges } = graph

  // 1. Validation guards
  if (!startId || !goalId || !nodes[startId] || !nodes[goalId]) {
    return steps
  }

  const allNodeIds = Object.keys(nodes)
  const adj = buildAdjacency(graph, false)

  // 2. Data structures
  const visited = new Set()
  const discovered = new Set([startId])
  const queue = [startId]
  const parentMap = { [startId]: null }
  const traversedEdges = []
  let nodesExpanded = 0

  // Helper: compute unexplored nodes
  const getUnexplored = () => allNodeIds.filter(id => !discovered.has(id))

  // ── Step 0: Initialization ────────────────────────────────────────────────
  const initQueueBefore = []
  const initQueueAfter = [...queue]

  // Check if start === goal initially
  if (startId === goalId) {
    visited.add(startId)
    steps.push(createAlgorithmStep({
      stepIndex: 0,
      action: 'INITIALIZE_GOAL',
      currentNode: startId,
      selectedNode: startId,
      newlyVisitedNode: startId,
      visitedNodes: [startId],
      frontierNodes: [],
      unexploredNodes: allNodeIds.filter(id => id !== startId),
      discoveredNodes: [startId],
      parentMap: { [startId]: null },
      currentPath: [startId],
      pathNodes: [startId],
      pathEdges: [],
      neighborsConsidered: [],
      reason: `Start node ${startId} is identical to Goal node ${goalId}. Goal reached immediately at step 0!`,
      algorithmSpecificState: { queueBefore: [], queueAfter: [] },
      calculations: [`Start is Goal: ${startId} = ${goalId}`],
      metrics: { nodesExpanded: 1, pathLength: 0, totalCost: 0, frontierSize: 0 },
      isInitial: true,
      isFinal: true,
      pathFound: true,
      goalReached: true,
    }))
    return steps
  }

  steps.push(createAlgorithmStep({
    stepIndex: 0,
    action: 'INITIALIZE',
    currentNode: startId,
    selectedNode: startId,
    newlyVisitedNode: null,
    visitedNodes: [],
    frontierNodes: [...queue],
    unexploredNodes: getUnexplored(),
    discoveredNodes: [...discovered],
    parentMap: { ...parentMap },
    currentPath: [startId],
    neighborsConsidered: [],
    reason: `Initialize BFS: Add start node ${startId} to the FIFO queue. BFS will explore nodes level-by-level.`,
    algorithmSpecificState: { queueBefore: initQueueBefore, queueAfter: initQueueAfter },
    calculations: [`FIFO Queue initialized: [${queue.join(', ')}]`],
    metrics: { nodesExpanded: 0, pathLength: 0, totalCost: 0, frontierSize: 1 },
    isInitial: true,
    isFinal: false,
    pathFound: false,
    goalReached: false,
  }))

  // ── BFS Expansion Loop ─────────────────────────────────────────────────────
  while (queue.length > 0) {
    const queueBefore = [...queue]
    const current = queue.shift()
    const queueAfterPop = [...queue]

    visited.add(current)
    nodesExpanded++

    const currentPath = reconstructPath(parentMap, current)
    const rawNeighbors = getNeighbors(current, adj)
    const neighborsConsidered = []

    let goalFoundInStep = false

    for (const { neighborId, edgeId, weight } of rawNeighbors) {
      if (visited.has(neighborId)) {
        neighborsConsidered.push({
          neighborId,
          edgeId,
          weight,
          status: 'already_visited',
        })
      } else if (discovered.has(neighborId)) {
        neighborsConsidered.push({
          neighborId,
          edgeId,
          weight,
          status: 'already_in_frontier',
        })
      } else {
        // Newly discovered neighbor
        discovered.add(neighborId)
        parentMap[neighborId] = current
        queue.push(neighborId)
        if (!traversedEdges.includes(edgeId)) traversedEdges.push(edgeId)

        const isGoal = neighborId === goalId
        if (isGoal) goalFoundInStep = true

        neighborsConsidered.push({
          neighborId,
          edgeId,
          weight,
          status: isGoal ? 'goal' : 'pushed_to_frontier',
        })
      }
    }

    const queueAfterExpansion = [...queue]
    const reasoning = current === startId
      ? `Node ${current} is expanded as the start node. Discovered unvisited neighbors: [${neighborsConsidered.filter(n => n.status.includes('frontier') || n.status === 'goal').map(n => n.neighborId).join(', ')}].`
      : `Node ${current} is explored because BFS processes nodes in FIFO order. ${current} was the earliest discovered unvisited node in the queue.`

    // Standard expansion step
    steps.push(createAlgorithmStep({
      stepIndex: steps.length,
      action: 'EXPAND_NODE',
      currentNode: current,
      selectedNode: current,
      newlyVisitedNode: current,
      visitedNodes: Array.from(visited),
      frontierNodes: [...queue],
      unexploredNodes: getUnexplored(),
      discoveredNodes: Array.from(discovered),
      parentMap: { ...parentMap },
      currentPath,
      neighborsConsidered,
      traversedEdges: [...traversedEdges],
      reason: reasoning,
      algorithmSpecificState: { queueBefore, queueAfter: queueAfterExpansion },
      calculations: [`FIFO Queue: [${queue.join(', ')}]`],
      metrics: {
        nodesExpanded,
        pathLength: currentPath.length - 1,
        totalCost: currentPath.length - 1,
        frontierSize: queue.length,
      },
      isInitial: false,
      isFinal: false,
      pathFound: false,
      goalReached: false,
    }))

    // If goal was discovered during this node's expansion
    if (goalFoundInStep) {
      const pathNodes = reconstructPath(parentMap, goalId)
      const pathEdges = pathToEdges(pathNodes, graph)

      steps.push(createAlgorithmStep({
        stepIndex: steps.length,
        action: 'GOAL_REACHED',
        currentNode: goalId,
        selectedNode: goalId,
        newlyVisitedNode: null,
        visitedNodes: Array.from(visited),
        frontierNodes: [...queue],
        unexploredNodes: getUnexplored(),
        discoveredNodes: Array.from(discovered),
        parentMap: { ...parentMap },
        currentPath: pathNodes,
        pathNodes,
        pathEdges,
        traversedEdges: [...traversedEdges],
        neighborsConsidered: [],
        reason: `Goal node ${goalId} reached! BFS guarantees the shortest path in terms of edge hops. Path: ${pathNodes.join(' → ')}.`,
        algorithmSpecificState: { queueBefore: queueAfterExpansion, queueAfter: queueAfterExpansion },
        calculations: [`Solution path: ${pathNodes.join(' → ')} (${pathNodes.length - 1} hops)`],
        metrics: {
          nodesExpanded,
          pathLength: pathNodes.length - 1,
          totalCost: pathNodes.length - 1,
          frontierSize: queue.length,
        },
        isInitial: false,
        isFinal: true,
        pathFound: true,
        goalReached: true,
      }))
      return steps
    }
  }

  // ── No Path Found ─────────────────────────────────────────────────────────
  steps.push(createAlgorithmStep({
    stepIndex: steps.length,
    action: 'NO_PATH',
    currentNode: null,
    selectedNode: null,
    newlyVisitedNode: null,
    visitedNodes: Array.from(visited),
    frontierNodes: [],
    unexploredNodes: getUnexplored(),
    discoveredNodes: Array.from(discovered),
    parentMap: { ...parentMap },
    currentPath: [],
    neighborsConsidered: [],
    traversedEdges: [...traversedEdges],
    reason: `Queue is empty. No path exists from ${startId} to ${goalId} (graph may be disconnected or goal unreachable).`,
    algorithmSpecificState: { queueBefore: [], queueAfter: [] },
    calculations: [`Unreachable goal: ${goalId}`],
    metrics: { nodesExpanded, pathLength: 0, totalCost: 0, frontierSize: 0 },
    isInitial: false,
    isFinal: true,
    pathFound: false,
    goalReached: false,
  }))

  return steps
}
