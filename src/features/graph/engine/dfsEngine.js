/**
 * dfsEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Independent, pure Depth-First Search (DFS) simulation engine.
 * Generates an ordered array of AlgorithmStep snapshots detailing stack state,
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
 * Run DFS on the given graph topology using an explicit LIFO stack.
 *
 * @param {import('../types/graphStructures.js').Graph} graph
 * @returns {import('../types/graphStructures.js').AlgorithmStep[]}
 */
export function runDFS(graph) {
  const steps = []
  const { startId, goalId, nodes } = graph

  // 1. Validation guards
  if (!startId || !goalId || !nodes[startId] || !nodes[goalId]) {
    return steps
  }

  const allNodeIds = Object.keys(nodes)
  const adj = buildAdjacency(graph, false)

  // 2. Data structures
  const visited = new Set()
  const stack = [startId]
  const parentMap = { [startId]: null }
  const traversedEdges = []
  let nodesExpanded = 0

  const getUnexplored = () => allNodeIds.filter(id => !visited.has(id) && !stack.includes(id))
  const getDiscovered = () => Array.from(new Set([...visited, ...stack]))

  // ── Step 0: Initialization ────────────────────────────────────────────────
  const initStackBefore = []
  const initStackAfter = [...stack]

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
      algorithmSpecificState: { stackBefore: [], stackAfter: [] },
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
    frontierNodes: [...stack],
    unexploredNodes: getUnexplored(),
    discoveredNodes: getDiscovered(),
    parentMap: { ...parentMap },
    currentPath: [startId],
    neighborsConsidered: [],
    reason: `Initialize DFS: Push start node ${startId} onto the LIFO stack. DFS explores as deep as possible before backtracking.`,
    algorithmSpecificState: { stackBefore: initStackBefore, stackAfter: initStackAfter },
    calculations: [`LIFO Stack initialized: [${stack.join(', ')}]`],
    metrics: { nodesExpanded: 0, pathLength: 0, totalCost: 0, frontierSize: 1 },
    isInitial: true,
    isFinal: false,
    pathFound: false,
    goalReached: false,
  }))

  // ── DFS Expansion Loop ─────────────────────────────────────────────────────
  while (stack.length > 0) {
    const stackBefore = [...stack]
    const current = stack.pop()

    // Handle duplicate nodes on stack (if already visited, log backtrack/skip step)
    if (visited.has(current)) {
      steps.push(createAlgorithmStep({
        stepIndex: steps.length,
        action: 'SKIP_VISITED',
        currentNode: current,
        selectedNode: current,
        newlyVisitedNode: null,
        visitedNodes: Array.from(visited),
        frontierNodes: [...stack],
        unexploredNodes: getUnexplored(),
        discoveredNodes: getDiscovered(),
        parentMap: { ...parentMap },
        currentPath: reconstructPath(parentMap, current),
        neighborsConsidered: [],
        reason: `Node ${current} popped from stack was skipped because it was already expanded via a deeper path.`,
        algorithmSpecificState: { stackBefore, stackAfter: [...stack] },
        calculations: [`Skipped visited node: ${current}`],
        metrics: { nodesExpanded, pathLength: 0, totalCost: 0, frontierSize: stack.length },
        isInitial: false,
        isFinal: false,
        pathFound: false,
        goalReached: false,
      }))
      continue
    }

    visited.add(current)
    nodesExpanded++

    const currentPath = reconstructPath(parentMap, current)

    // Check Goal
    if (current === goalId) {
      const pathNodes = reconstructPath(parentMap, goalId)
      const pathEdges = pathToEdges(pathNodes, graph)

      steps.push(createAlgorithmStep({
        stepIndex: steps.length,
        action: 'GOAL_REACHED',
        currentNode: goalId,
        selectedNode: goalId,
        newlyVisitedNode: goalId,
        visitedNodes: Array.from(visited),
        frontierNodes: [...stack],
        unexploredNodes: getUnexplored(),
        discoveredNodes: getDiscovered(),
        parentMap: { ...parentMap },
        currentPath: pathNodes,
        pathNodes,
        pathEdges,
        traversedEdges: [...traversedEdges],
        neighborsConsidered: [],
        reason: `Node ${current} is explored because DFS follows the most recently discovered path (LIFO order). Goal node ${goalId} reached!`,
        algorithmSpecificState: { stackBefore, stackAfter: [...stack] },
        calculations: [`Solution path: ${pathNodes.join(' → ')} (${pathNodes.length - 1} hops)`],
        metrics: {
          nodesExpanded,
          pathLength: pathNodes.length - 1,
          totalCost: pathNodes.length - 1,
          frontierSize: stack.length,
        },
        isInitial: false,
        isFinal: true,
        pathFound: true,
        goalReached: true,
      }))
      return steps
    }

    const rawNeighbors = getNeighbors(current, adj)
    const neighborsConsidered = []

    // Process neighbors in reverse to push onto stack (so first neighbor is popped first)
    const unvisitedNeighbors = []

    for (const { neighborId, edgeId, weight } of rawNeighbors) {
      if (visited.has(neighborId)) {
        neighborsConsidered.push({
          neighborId,
          edgeId,
          weight,
          status: 'already_visited',
        })
      } else {
        if (!(neighborId in parentMap)) {
          parentMap[neighborId] = current
        }
        if (!traversedEdges.includes(edgeId)) traversedEdges.push(edgeId)
        unvisitedNeighbors.push(neighborId)

        neighborsConsidered.push({
          neighborId,
          edgeId,
          weight,
          status: 'pushed_to_stack',
        })
      }
    }

    // Push to LIFO stack in reverse order
    for (let i = unvisitedNeighbors.length - 1; i >= 0; i--) {
      stack.push(unvisitedNeighbors[i])
    }

    const reasoning = current === startId
      ? `Node ${current} is expanded as the start node. Unvisited neighbors pushed onto stack: [${unvisitedNeighbors.join(', ')}].`
      : `Node ${current} is explored because DFS follows the most recently discovered path before backtracking. Pushed unvisited neighbors onto stack.`

    steps.push(createAlgorithmStep({
      stepIndex: steps.length,
      action: 'EXPAND_NODE',
      currentNode: current,
      selectedNode: current,
      newlyVisitedNode: current,
      visitedNodes: Array.from(visited),
      frontierNodes: [...stack],
      unexploredNodes: getUnexplored(),
      discoveredNodes: getDiscovered(),
      parentMap: { ...parentMap },
      currentPath,
      neighborsConsidered,
      traversedEdges: [...traversedEdges],
      reason: reasoning,
      algorithmSpecificState: { stackBefore, stackAfter: [...stack] },
      calculations: [`LIFO Stack: [${stack.join(', ')}]`],
      metrics: {
        nodesExpanded,
        pathLength: currentPath.length - 1,
        totalCost: currentPath.length - 1,
        frontierSize: stack.length,
      },
      isInitial: false,
      isFinal: false,
      pathFound: false,
      goalReached: false,
    }))
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
    discoveredNodes: getDiscovered(),
    parentMap: { ...parentMap },
    currentPath: [],
    neighborsConsidered: [],
    traversedEdges: [...traversedEdges],
    reason: `Stack is empty. No path exists from ${startId} to ${goalId} (graph may be disconnected or goal unreachable).`,
    algorithmSpecificState: { stackBefore: [], stackAfter: [] },
    calculations: [`Unreachable goal: ${goalId}`],
    metrics: { nodesExpanded, pathLength: 0, totalCost: 0, frontierSize: 0 },
    isInitial: false,
    isFinal: true,
    pathFound: false,
    goalReached: false,
  }))

  return steps
}
