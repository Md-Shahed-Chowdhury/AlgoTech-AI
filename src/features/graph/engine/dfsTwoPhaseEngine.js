/**
 * dfsTwoPhaseEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Two-Phase Depth-First Search (DFS) Simulation Engine.
 *
 * Alternates between:
 *  - PHASE A: VISIT_NODE (pops top node from LIFO stack, sets current node, updates visited set)
 *  - PHASE B: EXPLORE_NEIGHBORS (evaluates ALL outgoing edges of current node as ONE step, pushes new neighbors onto LIFO stack)
 */

import { ACTION_TYPE } from '../types/graphTypes.js'
import {
  buildAdjacency,
  getNeighbors,
  reconstructPath,
  pathToEdges,
  calculatePathCost,
} from '../utils/graphUtils.js'

export function runDFSTwoPhase(graph) {
  const steps = []
  const { startId, goalId, nodes } = graph
  if (!startId || !goalId || !nodes[startId] || !nodes[goalId]) return steps

  const allNodeIds = Object.keys(nodes)
  const adj = buildAdjacency(graph, false)

  const visited = new Set()
  const stack = [startId]
  const parentMap = { [startId]: null }
  const traversedEdges = []
  let nodesExpanded = 0

  const getUnexplored = () => allNodeIds.filter(id => !visited.has(id) && !stack.includes(id))
  const getDiscovered = () => Array.from(new Set([...visited, ...stack]))

  // ── Step 0: INITIALIZE ──────────────────────────────────────────────────
  if (startId === goalId) {
    visited.add(startId)
    steps.push({
      stepIndex: 0,
      stepType: ACTION_TYPE.INITIALIZE_GOAL,
      action: ACTION_TYPE.INITIALIZE_GOAL,
      currentNode: startId,
      selectedNode: startId,
      visitedNodes: [startId],
      frontierNodes: [],
      discoveredNodes: [startId],
      unexploredNodes: allNodeIds.filter(id => id !== startId),
      parentMap: { [startId]: null },
      currentPath: [startId],
      pathNodes: [startId],
      pathEdges: [],
      neighbors: [],
      neighborsConsidered: [],
      algorithmSpecificState: { stackBefore: [], stackAfter: [] },
      reason: `Start node ${startId} is identical to Goal node ${goalId}. Goal reached immediately!`,
      metrics: { nodesExpanded: 1, pathLength: 0, totalCost: 0, frontierSize: 0 },
      isInitial: true,
      isFinal: true,
      pathFound: true,
      goalReached: true,
    })
    return steps
  }

  steps.push({
    stepIndex: 0,
    stepType: ACTION_TYPE.INITIALIZE,
    action: ACTION_TYPE.INITIALIZE,
    currentNode: startId,
    selectedNode: startId,
    visitedNodes: [],
    frontierNodes: [...stack],
    discoveredNodes: getDiscovered(),
    unexploredNodes: getUnexplored(),
    parentMap: { ...parentMap },
    currentPath: [startId],
    neighbors: [],
    neighborsConsidered: [],
    algorithmSpecificState: { stackBefore: [], stackAfter: [...stack] },
    reason: `Initialize DFS: Push start node ${startId} onto LIFO stack. DFS dives deep along each branch before backtracking.`,
    metrics: { nodesExpanded: 0, pathLength: 0, totalCost: 0, frontierSize: 1 },
    isInitial: true,
    isFinal: false,
    pathFound: false,
    goalReached: false,
  })

  // ── Two-Phase Alternating Loop ─────────────────────────────────────────────
  while (stack.length > 0) {
    // ── PHASE A: VISIT / POP NODE ──────────────────────────────────────────
    const stackBeforePop = [...stack]
    const current = stack.pop()
    const stackAfterPop = [...stack]

    // Skip if already visited (duplicate on stack)
    if (visited.has(current)) {
      steps.push({
        stepIndex: steps.length,
        stepType: ACTION_TYPE.SKIP_VISITED,
        action: ACTION_TYPE.SKIP_VISITED,
        currentNode: current,
        selectedNode: current,
        visitedNodes: Array.from(visited),
        frontierNodes: stackAfterPop,
        discoveredNodes: getDiscovered(),
        unexploredNodes: getUnexplored(),
        parentMap: { ...parentMap },
        currentPath: reconstructPath(parentMap, current),
        neighbors: [],
        neighborsConsidered: [],
        algorithmSpecificState: { stackBefore: stackBeforePop, stackAfter: stackAfterPop },
        reason: `Node ${current} popped from LIFO stack was skipped because it was already expanded via a deeper path.`,
        metrics: { nodesExpanded, pathLength: 0, totalCost: 0, frontierSize: stackAfterPop.length },
        isInitial: false,
        isFinal: false,
        pathFound: false,
        goalReached: false,
      })
      continue
    }

    visited.add(current)
    nodesExpanded++
    const currentPath = reconstructPath(parentMap, current)

    // Goal test on pop
    if (current === goalId) {
      const pathNodes = reconstructPath(parentMap, goalId)
      const pathEdges = pathToEdges(pathNodes, graph)
      const cost = calculatePathCost(pathNodes, graph)
      steps.push({
        stepIndex: steps.length,
        stepType: ACTION_TYPE.GOAL_REACHED,
        action: ACTION_TYPE.GOAL_REACHED,
        currentNode: goalId,
        selectedNode: goalId,
        visitedNodes: Array.from(visited),
        frontierNodes: stackAfterPop,
        discoveredNodes: getDiscovered(),
        unexploredNodes: getUnexplored(),
        parentMap: { ...parentMap },
        currentPath: pathNodes,
        pathNodes,
        pathEdges,
        traversedEdges: [...traversedEdges],
        neighbors: [],
        neighborsConsidered: [],
        algorithmSpecificState: { stackBefore: stackBeforePop, stackAfter: stackAfterPop },
        reason: `Goal node ${goalId} popped from LIFO stack! Solution path: ${pathNodes.join(' → ')}.`,
        metrics: { nodesExpanded, pathLength: pathNodes.length - 1, totalCost: cost, frontierSize: stackAfterPop.length },
        isInitial: false,
        isFinal: true,
        pathFound: true,
        goalReached: true,
      })
      return steps
    }

    // Step snapshot for VISIT_NODE
    steps.push({
      stepIndex: steps.length,
      stepType: ACTION_TYPE.VISIT_NODE,
      action: ACTION_TYPE.VISIT_NODE,
      currentNode: current,
      selectedNode: current,
      visitedNodes: Array.from(visited),
      frontierNodes: stackAfterPop,
      discoveredNodes: getDiscovered(),
      unexploredNodes: getUnexplored(),
      parentMap: { ...parentMap },
      currentPath,
      traversedEdges: [...traversedEdges],
      neighbors: [],
      neighborsConsidered: [],
      algorithmSpecificState: { stackBefore: stackBeforePop, stackAfter: stackAfterPop },
      reason: `DFS pops top node ${current} from LIFO stack. Node ${current} is now active.`,
      metrics: { nodesExpanded, pathLength: currentPath.length - 1, totalCost: calculatePathCost(currentPath, graph), frontierSize: stackAfterPop.length },
      isInitial: false,
      isFinal: false,
      pathFound: false,
      goalReached: false,
    })

    // ── PHASE B: EXPLORE ALL NEIGHBORS ──────────────────────────────────────
    const rawNeighbors = getNeighbors(current, adj)
    const neighbors = []
    const neighborsConsidered = []
    const unvisitedNeighbors = []
    const stackBeforeExplore = [...stackAfterPop]

    for (const { neighborId, edgeId, weight } of rawNeighbors) {
      neighbors.push(neighborId)
      if (!traversedEdges.includes(edgeId)) traversedEdges.push(edgeId)

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
        unvisitedNeighbors.push(neighborId)
        neighborsConsidered.push({
          neighborId,
          edgeId,
          weight,
          status: neighborId === goalId ? 'goal' : 'pushed_to_stack',
        })
      }
    }

    // Push unvisited neighbors onto LIFO stack in reverse order so top element matches first neighbor
    for (let i = unvisitedNeighbors.length - 1; i >= 0; i--) {
      stack.push(unvisitedNeighbors[i])
    }

    const stackAfterExplore = [...stack]

    steps.push({
      stepIndex: steps.length,
      stepType: ACTION_TYPE.EXPLORE_NEIGHBORS,
      action: ACTION_TYPE.EXPLORE_NEIGHBORS,
      currentNode: current,
      parentNode: current,
      neighbors,
      neighborsConsidered,
      visitedNodes: Array.from(visited),
      frontierNodes: stackAfterExplore,
      discoveredNodes: getDiscovered(),
      unexploredNodes: getUnexplored(),
      parentMap: { ...parentMap },
      currentPath,
      traversedEdges: [...traversedEdges],
      algorithmSpecificState: { stackBefore: stackBeforeExplore, stackAfter: stackAfterExplore },
      reason: neighbors.length > 0
        ? `Node ${current} evaluated all ${neighbors.length} outgoing edge(s) [${neighbors.join(', ')}]. Pushed ${unvisitedNeighbors.length} unvisited neighbor(s) [${unvisitedNeighbors.join(', ')}] onto LIFO stack.`
        : `Node ${current} has no unvisited outgoing edges. DFS will backtrack on the next step.`,
      metrics: { nodesExpanded, pathLength: currentPath.length - 1, totalCost: calculatePathCost(currentPath, graph), frontierSize: stackAfterExplore.length },
      isInitial: false,
      isFinal: false,
      pathFound: false,
      goalReached: false,
    })
  }

  // ── NO_PATH ─────────────────────────────────────────────────────────────
  steps.push({
    stepIndex: steps.length,
    stepType: ACTION_TYPE.NO_PATH,
    action: ACTION_TYPE.NO_PATH,
    currentNode: null,
    visitedNodes: Array.from(visited),
    frontierNodes: [],
    discoveredNodes: getDiscovered(),
    unexploredNodes: getUnexplored(),
    parentMap: { ...parentMap },
    currentPath: [],
    neighbors: [],
    neighborsConsidered: [],
    algorithmSpecificState: { stackBefore: [], stackAfter: [] },
    reason: `LIFO stack is empty. Goal node ${goalId} is unreachable from start node ${startId}.`,
    metrics: { nodesExpanded, pathLength: 0, totalCost: 0, frontierSize: 0 },
    isInitial: false,
    isFinal: true,
    pathFound: false,
    goalReached: false,
  })

  return steps
}
