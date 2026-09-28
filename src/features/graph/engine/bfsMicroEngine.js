/**
 * bfsMicroEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Micro-step BFS engine.
 *
 * Produces one MicroStep per educational action:
 *   INITIALIZE → SELECT_NODE → EVALUATE_NEIGHBOR (×N) → SELECT_NODE → …
 *
 * Each "NEXT" press in the UI advances exactly one micro-step, making the
 * learner able to pause between:
 *   • Popping a node from the queue
 *   • Evaluating each individual neighbor
 *   • Seeing the queue update after each discovery
 */

import { ACTION_TYPE, NEIGHBOR_DECISION } from '../types/graphTypes.js'
import { buildAdjacency, getNeighbors, reconstructPath, pathToEdges } from '../utils/graphUtils.js'

// ─────────────────────────────────────────────────────────────────────────────
// Helper: create a canonical MicroStep snapshot
// ─────────────────────────────────────────────────────────────────────────────

function ms(params) {
  const actionType = params.actionType ?? params.action ?? ACTION_TYPE.SELECT_NODE
  return {
    stepIndex:          params.stepIndex ?? 0,
    actionType,
    action:             actionType,          // legacy compat

    // Node roles
    currentNode:        params.currentNode   ?? null,
    parentNode:         params.parentNode    ?? null,
    neighborNode:       params.neighborNode  ?? null,
    edgeBeingExplored:  params.edgeBeingExplored ?? null,

    // Sets
    visitedNodes:       params.visitedNodes    ?? [],
    frontierNodes:      params.frontierNodes   ?? [],
    discoveredNodes:    params.discoveredNodes ?? [],
    unexploredNodes:    params.unexploredNodes ?? [],
    currentPath:        params.currentPath     ?? [],
    parentMap:          params.parentMap       ?? {},
    traversedEdges:     params.traversedEdges  ?? [],
    pathNodes:          params.pathNodes       ?? [],
    pathEdges:          params.pathEdges       ?? [],

    // Frontier before/after snapshot (for queue panel animation)
    frontierBefore:     params.frontierBefore ?? [],
    frontierAfter:      params.frontierAfter  ?? [],

    // Neighbor decision
    decision:           params.decision ?? null,
    neighborsConsidered: params.neighborsConsidered ?? [],

    // BFS-specific
    algorithmSpecificState: params.algorithmSpecificState ?? {},

    // Costs (empty for BFS but kept for API consistency)
    gCost: params.gCost ?? {},
    hCost: params.hCost ?? {},
    fCost: params.fCost ?? {},
    frontierDetail: [],

    reason:       params.reason       ?? '',
    calculations: params.calculations ?? [],
    metrics: {
      nodesExpanded: params.metrics?.nodesExpanded ?? 0,
      pathLength:    params.metrics?.pathLength    ?? 0,
      totalCost:     params.metrics?.totalCost     ?? 0,
      frontierSize:  params.metrics?.frontierSize  ?? 0,
    },

    isInitial:   params.isInitial   ?? false,
    isFinal:     params.isFinal     ?? false,
    pathFound:   params.pathFound   ?? false,
    goalReached: params.goalReached ?? false,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public: runBFS
// ─────────────────────────────────────────────────────────────────────────────

export function runBFS(graph) {
  const steps = []
  const { startId, goalId, nodes } = graph

  if (!startId || !goalId || !nodes[startId] || !nodes[goalId]) return steps

  const allNodeIds = Object.keys(nodes)
  const adj = buildAdjacency(graph, false)

  // Algorithm state
  const visited    = new Set()
  const discovered = new Set([startId])
  const queue      = [startId]
  const parentMap  = { [startId]: null }
  const traversedEdges = []
  let nodesExpanded = 0

  const getUnexplored = () => allNodeIds.filter(id => !discovered.has(id))

  // ── INITIALIZE ────────────────────────────────────────────────────────────
  if (startId === goalId) {
    visited.add(startId)
    steps.push(ms({
      stepIndex: 0, actionType: ACTION_TYPE.INITIALIZE_GOAL,
      currentNode: startId, visitedNodes: [startId], frontierNodes: [],
      discoveredNodes: [startId], unexploredNodes: allNodeIds.filter(id => id !== startId),
      parentMap: { [startId]: null }, currentPath: [startId],
      pathNodes: [startId], pathEdges: [],
      frontierBefore: [], frontierAfter: [],
      algorithmSpecificState: { queueBefore: [], queueAfter: [] },
      reason: `Start and Goal are the same node (${startId}). No search needed.`,
      calculations: [`Queue: []`],
      metrics: { nodesExpanded: 1, pathLength: 0, totalCost: 0, frontierSize: 0 },
      isInitial: true, isFinal: true, pathFound: true, goalReached: true,
    }))
    return steps
  }

  steps.push(ms({
    stepIndex: 0, actionType: ACTION_TYPE.INITIALIZE,
    currentNode: startId, visitedNodes: [], frontierNodes: [...queue],
    discoveredNodes: [...discovered], unexploredNodes: getUnexplored(),
    parentMap: { ...parentMap }, currentPath: [startId],
    frontierBefore: [], frontierAfter: [...queue],
    algorithmSpecificState: { queueBefore: [], queueAfter: [...queue] },
    reason: `BFS starts! Node ${startId} is placed at the back of the FIFO queue. The queue now contains [${queue.join(', ')}].`,
    calculations: [`Queue initialized: [${queue.join(', ')}]`],
    metrics: { nodesExpanded: 0, pathLength: 0, totalCost: 0, frontierSize: 1 },
    isInitial: true, isFinal: false, pathFound: false, goalReached: false,
  }))

  // ── BFS Loop ──────────────────────────────────────────────────────────────
  while (queue.length > 0) {
    const queueBeforePop = [...queue]
    const current = queue.shift()
    const queueAfterPop = [...queue]

    // Mark visited
    visited.add(current)
    nodesExpanded++
    const currentPath = reconstructPath(parentMap, current)

    // ── SELECT_NODE micro-step ──
    const isGoalNode = current === goalId

    if (isGoalNode) {
      const pathNodes = reconstructPath(parentMap, goalId)
      const pathEdges = pathToEdges(pathNodes, graph)
      steps.push(ms({
        stepIndex: steps.length, actionType: ACTION_TYPE.GOAL_REACHED,
        currentNode: goalId, visitedNodes: Array.from(visited),
        frontierNodes: [...queue], discoveredNodes: Array.from(discovered),
        unexploredNodes: getUnexplored(), parentMap: { ...parentMap },
        currentPath: pathNodes, pathNodes, pathEdges,
        traversedEdges: [...traversedEdges],
        frontierBefore: queueBeforePop, frontierAfter: queueAfterPop,
        algorithmSpecificState: { queueBefore: queueBeforePop, queueAfter: queueAfterPop },
        reason: `Goal node ${goalId} popped from the front of the FIFO queue! BFS guarantees the shortest path by hops. Path: ${pathNodes.join(' → ')}.`,
        calculations: [`Solution path: ${pathNodes.join(' → ')} (${pathNodes.length - 1} hops)`],
        metrics: { nodesExpanded, pathLength: pathNodes.length - 1, totalCost: pathNodes.length - 1, frontierSize: queue.length },
        isInitial: false, isFinal: true, pathFound: true, goalReached: true,
      }))
      return steps
    }

    steps.push(ms({
      stepIndex: steps.length, actionType: ACTION_TYPE.SELECT_NODE,
      currentNode: current, visitedNodes: Array.from(visited),
      frontierNodes: queueAfterPop, discoveredNodes: Array.from(discovered),
      unexploredNodes: getUnexplored(), parentMap: { ...parentMap },
      currentPath,
      traversedEdges: [...traversedEdges],
      frontierBefore: queueBeforePop, frontierAfter: queueAfterPop,
      algorithmSpecificState: { queueBefore: queueBeforePop, queueAfter: queueAfterPop },
      reason: `Node ${current} is popped from the FRONT of the FIFO queue. Queue was [${queueBeforePop.join(', ')}] → now [${queueAfterPop.join(', ')}]. Node ${current} is now being explored. Its neighbors will be evaluated next.`,
      calculations: [`Queue before: [${queueBeforePop.join(', ')}]`, `Popped: ${current}`, `Queue after: [${queueAfterPop.join(', ')}]`],
      metrics: { nodesExpanded, pathLength: currentPath.length - 1, totalCost: currentPath.length - 1, frontierSize: queue.length },
      isInitial: false, isFinal: false, pathFound: false, goalReached: false,
    }))

    // ── EVALUATE_NEIGHBOR micro-steps ──
    const rawNeighbors = getNeighbors(current, adj)

    for (const { neighborId, edgeId, weight } of rawNeighbors) {
      const queueSnapshot = [...queue]

      let actionType, decision, reason, calculations
      const isGoal = neighborId === goalId

      if (visited.has(neighborId)) {
        // Already fully explored
        actionType = ACTION_TYPE.EVALUATE_NEIGHBOR
        decision   = NEIGHBOR_DECISION.ALREADY_VISITED
        reason = `Evaluating edge ${current} → ${neighborId} (weight ${weight}). Node ${neighborId} is already in the VISITED/EXPLORED set. It will NOT be added again.`
        calculations = [`${neighborId} already visited — skip`]

      } else if (discovered.has(neighborId)) {
        // Already in frontier
        actionType = ACTION_TYPE.SKIP_ALREADY_DISCOVERED
        decision   = NEIGHBOR_DECISION.ALREADY_DISCOVERED
        reason = `Evaluating edge ${current} → ${neighborId} (weight ${weight}). Node ${neighborId} is already in the FIFO queue (was discovered earlier). BFS will NOT add it again to avoid revisiting.`
        calculations = [`${neighborId} already in queue — skip`]

      } else {
        // New discovery!
        discovered.add(neighborId)
        parentMap[neighborId] = current
        queue.push(neighborId)
        if (!traversedEdges.includes(edgeId)) traversedEdges.push(edgeId)

        if (isGoal) {
          actionType = ACTION_TYPE.DISCOVER_NODE
          decision   = NEIGHBOR_DECISION.GOAL
          reason = `Evaluating edge ${current} → ${neighborId} (weight ${weight}). Node ${neighborId} is the GOAL! It is added to the back of the queue. BFS will process it when it reaches the front.`
        } else {
          actionType = ACTION_TYPE.DISCOVER_NODE
          decision   = NEIGHBOR_DECISION.DISCOVERED
          reason = `Evaluating edge ${current} → ${neighborId} (weight ${weight}). Node ${neighborId} is newly discovered! It is added to the BACK of the FIFO queue. Queue: [${queue.join(', ')}].`
        }
        calculations = [
          `${neighborId} is new → add to queue`,
          `Queue: [${queue.join(', ')}]`,
        ]
      }

      const queueNow = [...queue]
      steps.push(ms({
        stepIndex: steps.length, actionType,
        currentNode: current, parentNode: current, neighborNode: neighborId,
        edgeBeingExplored: edgeId,
        visitedNodes: Array.from(visited),
        frontierNodes: queueNow,
        discoveredNodes: Array.from(discovered),
        unexploredNodes: getUnexplored(),
        parentMap: { ...parentMap },
        currentPath,
        traversedEdges: [...traversedEdges],
        frontierBefore: queueSnapshot,
        frontierAfter:  queueNow,
        algorithmSpecificState: { queueBefore: queueSnapshot, queueAfter: queueNow },
        decision, reason, calculations,
        metrics: { nodesExpanded, pathLength: currentPath.length - 1, totalCost: currentPath.length - 1, frontierSize: queue.length },
        isInitial: false, isFinal: false, pathFound: false, goalReached: false,
      }))
    }
  }

  // ── NO_PATH ───────────────────────────────────────────────────────────────
  steps.push(ms({
    stepIndex: steps.length, actionType: ACTION_TYPE.NO_PATH,
    currentNode: null, visitedNodes: Array.from(visited),
    frontierNodes: [], discoveredNodes: Array.from(discovered),
    unexploredNodes: getUnexplored(), parentMap: { ...parentMap },
    currentPath: [],
    frontierBefore: [], frontierAfter: [],
    algorithmSpecificState: { queueBefore: [], queueAfter: [] },
    reason: `The FIFO queue is empty. All reachable nodes have been explored. No path exists from ${startId} to ${goalId}.`,
    calculations: [`Queue empty — no path found`],
    metrics: { nodesExpanded, pathLength: 0, totalCost: 0, frontierSize: 0 },
    isInitial: false, isFinal: true, pathFound: false, goalReached: false,
  }))

  return steps
}
