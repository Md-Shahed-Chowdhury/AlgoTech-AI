/**
 * bfsTwoPhaseEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Two-Phase Breadth-First Search (BFS) Simulation Engine.
 *
 * Alternates between:
 *  - PHASE A: VISIT_NODE (pops node from FIFO queue, sets current node, updates visited set)
 *  - PHASE B: EXPLORE_NEIGHBORS (evaluates ALL outgoing edges of current node as ONE step, pushes new neighbors to FIFO queue)
 */

import { ACTION_TYPE } from '../types/graphTypes.js'
import {
  buildAdjacency,
  getNeighbors,
  reconstructPath,
  pathToEdges,
} from '../utils/graphUtils.js'

export function runBFSTwoPhase(graph) {
  const steps = []
  const { startId, goalId, nodes } = graph
  if (!startId || !goalId || !nodes[startId] || !nodes[goalId]) return steps

  const allNodeIds = Object.keys(nodes)
  const adj = buildAdjacency(graph, false)

  const visited = new Set()
  const discovered = new Set([startId])
  const queue = [startId]
  const parentMap = { [startId]: null }
  const traversedEdges = []
  let nodesExpanded = 0

  const getUnexplored = () => allNodeIds.filter(id => !discovered.has(id))

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
      algorithmSpecificState: { queueBefore: [], queueAfter: [] },
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
    frontierNodes: [...queue],
    discoveredNodes: [...discovered],
    unexploredNodes: getUnexplored(),
    parentMap: { ...parentMap },
    currentPath: [startId],
    neighbors: [],
    neighborsConsidered: [],
    algorithmSpecificState: { queueBefore: [], queueAfter: [...queue] },
    reason: `Initialize BFS: Add start node ${startId} to the FIFO queue. BFS will explore level-by-level using alternating VISIT and EXPLORE phases.`,
    metrics: { nodesExpanded: 0, pathLength: 0, totalCost: 0, frontierSize: 1 },
    isInitial: true,
    isFinal: false,
    pathFound: false,
    goalReached: false,
  })

  // ── Two-Phase Alternating Loop ─────────────────────────────────────────────
  while (queue.length > 0) {
    // ── PHASE A: VISIT / POP NODE ──────────────────────────────────────────
    const queueBeforePop = [...queue]
    const current = queue.shift()
    const queueAfterPop = [...queue]

    visited.add(current)
    nodesExpanded++
    const currentPath = reconstructPath(parentMap, current)

    // Check if goal reached on pop (BFS goal test)
    if (current === goalId) {
      const pathNodes = reconstructPath(parentMap, goalId)
      const pathEdges = pathToEdges(pathNodes, graph)
      steps.push({
        stepIndex: steps.length,
        stepType: ACTION_TYPE.GOAL_REACHED,
        action: ACTION_TYPE.GOAL_REACHED,
        currentNode: goalId,
        selectedNode: goalId,
        visitedNodes: Array.from(visited),
        frontierNodes: queueAfterPop,
        discoveredNodes: Array.from(discovered),
        unexploredNodes: getUnexplored(),
        parentMap: { ...parentMap },
        currentPath: pathNodes,
        pathNodes,
        pathEdges,
        traversedEdges: [...traversedEdges],
        neighbors: [],
        neighborsConsidered: [],
        algorithmSpecificState: { queueBefore: queueBeforePop, queueAfter: queueAfterPop },
        reason: `Goal node ${goalId} popped from FIFO queue! Solution path: ${pathNodes.join(' → ')}. BFS guarantees shortest path in unweighted graphs.`,
        metrics: { nodesExpanded, pathLength: pathNodes.length - 1, totalCost: pathNodes.length - 1, frontierSize: queueAfterPop.length },
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
      frontierNodes: queueAfterPop,
      discoveredNodes: Array.from(discovered),
      unexploredNodes: getUnexplored(),
      parentMap: { ...parentMap },
      currentPath,
      traversedEdges: [...traversedEdges],
      neighbors: [],
      neighborsConsidered: [],
      algorithmSpecificState: { queueBefore: queueBeforePop, queueAfter: queueAfterPop },
      reason: `BFS pops node ${current} from the front of the FIFO queue. Node ${current} is now the active visited node.`,
      metrics: { nodesExpanded, pathLength: currentPath.length - 1, totalCost: currentPath.length - 1, frontierSize: queueAfterPop.length },
      isInitial: false,
      isFinal: false,
      pathFound: false,
      goalReached: false,
    })

    // ── PHASE B: EXPLORE ALL NEIGHBORS ──────────────────────────────────────
    const rawNeighbors = getNeighbors(current, adj)
    const neighbors = []
    const neighborsConsidered = []
    const queueBeforeExplore = [...queueAfterPop]

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
      } else if (discovered.has(neighborId)) {
        neighborsConsidered.push({
          neighborId,
          edgeId,
          weight,
          status: 'already_in_frontier',
        })
      } else {
        discovered.add(neighborId)
        parentMap[neighborId] = current
        queue.push(neighborId)
        neighborsConsidered.push({
          neighborId,
          edgeId,
          weight,
          status: neighborId === goalId ? 'goal' : 'pushed_to_frontier',
        })
      }
    }

    const queueAfterExplore = [...queue]
    const pushedIds = neighborsConsidered
      .filter(n => n.status === 'pushed_to_frontier' || n.status === 'goal')
      .map(n => n.neighborId)

    steps.push({
      stepIndex: steps.length,
      stepType: ACTION_TYPE.EXPLORE_NEIGHBORS,
      action: ACTION_TYPE.EXPLORE_NEIGHBORS,
      currentNode: current,
      parentNode: current,
      neighbors,
      neighborsConsidered,
      visitedNodes: Array.from(visited),
      frontierNodes: queueAfterExplore,
      discoveredNodes: Array.from(discovered),
      unexploredNodes: getUnexplored(),
      parentMap: { ...parentMap },
      currentPath,
      traversedEdges: [...traversedEdges],
      algorithmSpecificState: { queueBefore: queueBeforeExplore, queueAfter: queueAfterExplore },
      reason: neighbors.length > 0
        ? `Node ${current} explored all ${neighbors.length} outgoing edge(s) [${neighbors.join(', ')}]. ${pushedIds.length > 0 ? `Pushed new neighbor(s) [${pushedIds.join(', ')}] to the FIFO queue.` : 'No new unvisited neighbors.'}`
        : `Node ${current} has no outgoing edges.`,
      metrics: { nodesExpanded, pathLength: currentPath.length - 1, totalCost: currentPath.length - 1, frontierSize: queueAfterExplore.length },
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
    discoveredNodes: Array.from(discovered),
    unexploredNodes: getUnexplored(),
    parentMap: { ...parentMap },
    currentPath: [],
    neighbors: [],
    neighborsConsidered: [],
    algorithmSpecificState: { queueBefore: [], queueAfter: [] },
    reason: `FIFO queue is empty. Goal node ${goalId} is unreachable from start node ${startId}.`,
    metrics: { nodesExpanded, pathLength: 0, totalCost: 0, frontierSize: 0 },
    isInitial: false,
    isFinal: true,
    pathFound: false,
    goalReached: false,
  })

  return steps
}
