/**
 * dfsMicroEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Micro-step DFS engine.
 *
 * Sequence per node:
 *   SELECT_NODE (pop from LIFO stack)
 *   → EVALUATE_NEIGHBOR (×N, one per neighbor)
 *       → DISCOVER_NODE / SKIP_ALREADY_DISCOVERED / ALREADY_VISITED per neighbor
 *
 * Neighbors pushed in REVERSE order so the first neighbor is on top.
 */

import { ACTION_TYPE, NEIGHBOR_DECISION } from '../types/graphTypes.js'
import { buildAdjacency, getNeighbors, reconstructPath, pathToEdges } from '../utils/graphUtils.js'

function ms(params) {
  const actionType = params.actionType ?? ACTION_TYPE.SELECT_NODE
  return {
    stepIndex:          params.stepIndex ?? 0,
    actionType,
    action:             actionType,
    currentNode:        params.currentNode        ?? null,
    parentNode:         params.parentNode         ?? null,
    neighborNode:       params.neighborNode       ?? null,
    edgeBeingExplored:  params.edgeBeingExplored  ?? null,
    visitedNodes:       params.visitedNodes       ?? [],
    frontierNodes:      params.frontierNodes      ?? [],
    discoveredNodes:    params.discoveredNodes     ?? [],
    unexploredNodes:    params.unexploredNodes     ?? [],
    currentPath:        params.currentPath        ?? [],
    parentMap:          params.parentMap          ?? {},
    traversedEdges:     params.traversedEdges     ?? [],
    pathNodes:          params.pathNodes          ?? [],
    pathEdges:          params.pathEdges          ?? [],
    frontierBefore:     params.frontierBefore     ?? [],
    frontierAfter:      params.frontierAfter      ?? [],
    decision:           params.decision           ?? null,
    neighborsConsidered: params.neighborsConsidered ?? [],
    algorithmSpecificState: params.algorithmSpecificState ?? {},
    gCost: {}, hCost: {}, fCost: {}, frontierDetail: [],
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

export function runDFS(graph) {
  const steps = []
  const { startId, goalId, nodes } = graph

  if (!startId || !goalId || !nodes[startId] || !nodes[goalId]) return steps

  const allNodeIds = Object.keys(nodes)
  const adj = buildAdjacency(graph, false)

  const visited    = new Set()
  const stack      = [startId]
  const parentMap  = { [startId]: null }
  const traversedEdges = []
  let nodesExpanded = 0

  const getUnexplored = () => allNodeIds.filter(id => !visited.has(id) && !stack.includes(id))
  const getDiscovered = () => Array.from(new Set([...visited, ...stack]))

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
      algorithmSpecificState: { stackBefore: [], stackAfter: [] },
      reason: `Start and Goal are the same node (${startId}).`,
      calculations: [`Stack: []`],
      metrics: { nodesExpanded: 1, pathLength: 0, totalCost: 0, frontierSize: 0 },
      isInitial: true, isFinal: true, pathFound: true, goalReached: true,
    }))
    return steps
  }

  steps.push(ms({
    stepIndex: 0, actionType: ACTION_TYPE.INITIALIZE,
    currentNode: startId, visitedNodes: [], frontierNodes: [...stack],
    discoveredNodes: getDiscovered(), unexploredNodes: getUnexplored(),
    parentMap: { ...parentMap }, currentPath: [startId],
    frontierBefore: [], frontierAfter: [...stack],
    algorithmSpecificState: { stackBefore: [], stackAfter: [...stack] },
    reason: `DFS starts! Node ${startId} is pushed onto the LIFO stack. Stack (top first): [${[...stack].reverse().join(', ')}].`,
    calculations: [`Stack initialized: [${stack.join(', ')}]`],
    metrics: { nodesExpanded: 0, pathLength: 0, totalCost: 0, frontierSize: 1 },
    isInitial: true, isFinal: false, pathFound: false, goalReached: false,
  }))

  // ── DFS Loop ──────────────────────────────────────────────────────────────
  while (stack.length > 0) {
    const stackBeforePop = [...stack]
    const current = stack.pop()
    const stackAfterPop = [...stack]

    // Skip already visited (stale stack entries)
    if (visited.has(current)) {
      steps.push(ms({
        stepIndex: steps.length, actionType: ACTION_TYPE.SKIP_VISITED,
        currentNode: current, visitedNodes: Array.from(visited),
        frontierNodes: [...stack], discoveredNodes: getDiscovered(),
        unexploredNodes: getUnexplored(), parentMap: { ...parentMap },
        currentPath: reconstructPath(parentMap, current),
        traversedEdges: [...traversedEdges],
        frontierBefore: stackBeforePop, frontierAfter: stackAfterPop,
        algorithmSpecificState: { stackBefore: stackBeforePop, stackAfter: stackAfterPop },
        reason: `Node ${current} was popped from the LIFO stack but is already VISITED. This is a stale duplicate pushed earlier. DFS skips it.`,
        calculations: [`${current} already visited — skip`],
        metrics: { nodesExpanded, pathLength: 0, totalCost: 0, frontierSize: stack.length },
        isInitial: false, isFinal: false, pathFound: false, goalReached: false,
      }))
      continue
    }

    visited.add(current)
    nodesExpanded++
    const currentPath = reconstructPath(parentMap, current)

    // Goal check
    if (current === goalId) {
      const pathNodes = reconstructPath(parentMap, goalId)
      const pathEdges = pathToEdges(pathNodes, graph)
      steps.push(ms({
        stepIndex: steps.length, actionType: ACTION_TYPE.GOAL_REACHED,
        currentNode: goalId, visitedNodes: Array.from(visited),
        frontierNodes: [...stack], discoveredNodes: getDiscovered(),
        unexploredNodes: getUnexplored(), parentMap: { ...parentMap },
        currentPath: pathNodes, pathNodes, pathEdges,
        traversedEdges: [...traversedEdges],
        frontierBefore: stackBeforePop, frontierAfter: stackAfterPop,
        algorithmSpecificState: { stackBefore: stackBeforePop, stackAfter: stackAfterPop },
        reason: `Goal node ${goalId} popped from the TOP of the LIFO stack! DFS found it by diving deep. Path: ${pathNodes.join(' → ')}. Note: DFS does NOT guarantee the shortest path.`,
        calculations: [`Solution: ${pathNodes.join(' → ')} (${pathNodes.length - 1} hops)`],
        metrics: { nodesExpanded, pathLength: pathNodes.length - 1, totalCost: pathNodes.length - 1, frontierSize: stack.length },
        isInitial: false, isFinal: true, pathFound: true, goalReached: true,
      }))
      return steps
    }

    // SELECT_NODE step
    steps.push(ms({
      stepIndex: steps.length, actionType: ACTION_TYPE.SELECT_NODE,
      currentNode: current, visitedNodes: Array.from(visited),
      frontierNodes: stackAfterPop, discoveredNodes: getDiscovered(),
      unexploredNodes: getUnexplored(), parentMap: { ...parentMap },
      currentPath,
      traversedEdges: [...traversedEdges],
      frontierBefore: stackBeforePop, frontierAfter: stackAfterPop,
      algorithmSpecificState: { stackBefore: stackBeforePop, stackAfter: stackAfterPop },
      reason: `Node ${current} is popped from the TOP of the LIFO stack. Stack was [${[...stackBeforePop].reverse().join(', ')}] (top first) → now [${[...stackAfterPop].reverse().join(', ')}]. DFS will now explore ${current}'s neighbors.`,
      calculations: [`Stack before: [${stackBeforePop.slice().reverse().join(', ')}]`, `Popped: ${current}`, `Stack after: [${stackAfterPop.slice().reverse().join(', ')}]`],
      metrics: { nodesExpanded, pathLength: currentPath.length - 1, totalCost: currentPath.length - 1, frontierSize: stack.length },
      isInitial: false, isFinal: false, pathFound: false, goalReached: false,
    }))

    // Collect unvisited neighbors then push in REVERSE order (so first neighbor is on top)
    const rawNeighbors = getNeighbors(current, adj)
    const toPush = []

    for (const { neighborId, edgeId, weight } of rawNeighbors) {
      const stackSnapshot = [...stack, ...toPush.slice().reverse()]
      let actionType, decision, reason, calculations

      if (visited.has(neighborId)) {
        actionType = ACTION_TYPE.EVALUATE_NEIGHBOR
        decision   = NEIGHBOR_DECISION.ALREADY_VISITED
        reason = `Evaluating edge ${current} → ${neighborId} (weight ${weight}). Node ${neighborId} is already VISITED/EXPLORED. DFS skips it.`
        calculations = [`${neighborId} already visited — skip`]

        steps.push(ms({
          stepIndex: steps.length, actionType,
          currentNode: current, parentNode: current, neighborNode: neighborId,
          edgeBeingExplored: edgeId,
          visitedNodes: Array.from(visited), frontierNodes: [...stack],
          discoveredNodes: getDiscovered(), unexploredNodes: getUnexplored(),
          parentMap: { ...parentMap }, currentPath,
          traversedEdges: [...traversedEdges],
          frontierBefore: stackSnapshot, frontierAfter: [...stack],
          algorithmSpecificState: { stackBefore: stackSnapshot, stackAfter: [...stack] },
          decision, reason, calculations,
          metrics: { nodesExpanded, pathLength: currentPath.length - 1, totalCost: currentPath.length - 1, frontierSize: stack.length },
          isInitial: false, isFinal: false, pathFound: false, goalReached: false,
        }))

      } else if (stack.includes(neighborId)) {
        actionType = ACTION_TYPE.SKIP_ALREADY_DISCOVERED
        decision   = NEIGHBOR_DECISION.ALREADY_DISCOVERED
        reason = `Evaluating edge ${current} → ${neighborId} (weight ${weight}). Node ${neighborId} is already on the LIFO stack. DFS will NOT push it again — it will be reached when the stack unwinds.`
        calculations = [`${neighborId} already on stack — skip`]

        steps.push(ms({
          stepIndex: steps.length, actionType,
          currentNode: current, parentNode: current, neighborNode: neighborId,
          edgeBeingExplored: edgeId,
          visitedNodes: Array.from(visited), frontierNodes: [...stack],
          discoveredNodes: getDiscovered(), unexploredNodes: getUnexplored(),
          parentMap: { ...parentMap }, currentPath,
          traversedEdges: [...traversedEdges],
          frontierBefore: stackSnapshot, frontierAfter: [...stack],
          algorithmSpecificState: { stackBefore: stackSnapshot, stackAfter: [...stack] },
          decision, reason, calculations,
          metrics: { nodesExpanded, pathLength: currentPath.length - 1, totalCost: currentPath.length - 1, frontierSize: stack.length },
          isInitial: false, isFinal: false, pathFound: false, goalReached: false,
        }))

      } else {
        // New neighbor — will be pushed to stack after all neighbors evaluated
        if (!(neighborId in parentMap)) parentMap[neighborId] = current
        if (!traversedEdges.includes(edgeId)) traversedEdges.push(edgeId)
        toPush.push({ neighborId, edgeId, weight })

        // Push now (so stack state reflects the new node being added)
        stack.push(neighborId)
        const stackAfterPush = [...stack]

        actionType = ACTION_TYPE.DISCOVER_NODE
        decision   = neighborId === goalId ? NEIGHBOR_DECISION.GOAL : NEIGHBOR_DECISION.DISCOVERED
        reason = `Evaluating edge ${current} → ${neighborId} (weight ${weight}). ${neighborId} is newly discovered! Pushed onto the TOP of the LIFO stack. Stack (top first): [${stackAfterPush.slice().reverse().join(', ')}].`
        calculations = [
          `${neighborId} is new → push to stack`,
          `Stack (top→bottom): [${stackAfterPush.slice().reverse().join(', ')}]`,
        ]

        steps.push(ms({
          stepIndex: steps.length, actionType,
          currentNode: current, parentNode: current, neighborNode: neighborId,
          edgeBeingExplored: edgeId,
          visitedNodes: Array.from(visited), frontierNodes: [...stack],
          discoveredNodes: getDiscovered(), unexploredNodes: getUnexplored(),
          parentMap: { ...parentMap }, currentPath,
          traversedEdges: [...traversedEdges],
          frontierBefore: stackSnapshot, frontierAfter: stackAfterPush,
          algorithmSpecificState: { stackBefore: stackSnapshot, stackAfter: stackAfterPush },
          decision, reason, calculations,
          metrics: { nodesExpanded, pathLength: currentPath.length - 1, totalCost: currentPath.length - 1, frontierSize: stack.length },
          isInitial: false, isFinal: false, pathFound: false, goalReached: false,
        }))
      }
    }
  }

  // ── NO_PATH ───────────────────────────────────────────────────────────────
  steps.push(ms({
    stepIndex: steps.length, actionType: ACTION_TYPE.NO_PATH,
    currentNode: null, visitedNodes: Array.from(visited),
    frontierNodes: [], discoveredNodes: getDiscovered(),
    unexploredNodes: getUnexplored(), parentMap: { ...parentMap }, currentPath: [],
    frontierBefore: [], frontierAfter: [],
    algorithmSpecificState: { stackBefore: [], stackAfter: [] },
    reason: `The LIFO stack is empty. All reachable nodes from ${startId} have been explored. No path exists to ${goalId}.`,
    calculations: [`Stack empty — no path found`],
    metrics: { nodesExpanded, pathLength: 0, totalCost: 0, frontierSize: 0 },
    isInitial: false, isFinal: true, pathFound: false, goalReached: false,
  }))

  return steps
}
