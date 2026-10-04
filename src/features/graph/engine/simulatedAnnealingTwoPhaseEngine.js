/**
 * simulatedAnnealingTwoPhaseEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Two-Phase Simulated Annealing (Stochastic Local Search) Simulation Engine.
 *
 * Minimizes the heuristic h(n) like Hill Climbing, but can escape local optima:
 *  - Maintains a SINGLE active current state (no frontier / open set).
 *  - PHASE A (VISIT_NODE):        the walker stands on the current node at temperature T.
 *  - PHASE B (EXPLORE_NEIGHBORS): propose ONE random neighbor, compute
 *        ΔE = h(neighbor) − h(current)
 *        p  = 1                 if ΔE ≤ 0   (downhill or flat: always accept)
 *        p  = e^(−ΔE / T)       if ΔE > 0   (uphill: accept with probability p)
 *    draw r ∈ [0, 1); accept iff r < p. The move takes effect in the NEXT
 *    VISIT_NODE step, so a learner (or exam taker) can predict it from r and p.
 *    Then cool: T ← T × α.
 *  - Terminates on:
 *      1. Goal Reached (current === goalId)
 *      2. Frozen (T < tMin): the system has cooled and stops moving
 *      3. Iteration limit reached
 *      4. No Neighbors (current node has 0 outgoing edges)
 *
 * Randomness uses a seeded PRNG with alphabetical neighbor ordering, so the
 * same graph always replays identically in Learn Mode and Exam Mode.
 */

import { ACTION_TYPE } from '../types/graphTypes.js'
import {
  buildAdjacency,
  getNeighbors,
  getNodeHeuristic,
  pathToEdges,
  calculatePathCost,
} from '../utils/graphUtils.js'
import { mulberry32 } from '../utils/seededRandom.js'
import { eraseLoops } from './hillClimbingEngine.js'

export const SA_LEARN_DEFAULTS = {
  seed:     6,     // fixed so Learn and Exam replay the same walk (shows 1 uphill accept + 1 reject on the preset)
  t0:       10,    // initial temperature
  alpha:    0.85,  // cooling rate: T ← T × α
  tMin:     0.1,   // frozen below this temperature
  maxIter:  40,    // safety cap
}

const round = (v) => Math.round(v * 100) / 100
const fmt = (n) => (typeof n === 'number' ? (Number.isInteger(n) ? String(n) : n.toFixed(2)) : String(n ?? 0))

export function runSimulatedAnnealingTwoPhase(graph, options = {}) {
  const given = Object.fromEntries(Object.entries(options).filter(([, v]) => v != null))
  const { seed, t0, alpha, tMin, maxIter } = { ...SA_LEARN_DEFAULTS, ...given }

  const steps = []
  const { startId, goalId, nodes } = graph
  if (!startId || !goalId || !nodes[startId] || !nodes[goalId]) return steps

  const allNodeIds = Object.keys(nodes)
  const adj = buildAdjacency(graph, false)
  const rand = mulberry32(seed)
  const computeH = (nodeId) => getNodeHeuristic(nodeId, graph)

  let current = startId
  let T = t0
  let iteration = 0
  let uphillAccepted = 0
  let lastDecision = null                 // previous proposal outcome (shown on the following steps)
  const trajectory = [startId]            // full walk, may revisit nodes
  const visited = new Set([startId])
  const hCost = { [startId]: computeH(startId) }
  const traversedEdges = []

  const sortedNeighbors = (nodeId) =>
    [...getNeighbors(nodeId, adj)].sort((a, b) => a.neighborId.localeCompare(b.neighborId))

  const neighborDetail = (nodeId, raw) => {
    const curH = hCost[nodeId] ?? computeH(nodeId)
    return raw.map(({ neighborId }) => {
      const h = computeH(neighborId)
      hCost[neighborId] = h
      return { nodeId: neighborId, priority: h, h, deltaE: h - curH }
    })
  }

  const baseState = (extra = {}) => ({
    temperature: round(T),
    initialTemperature: t0,
    coolingRate: alpha,
    minTemperature: tMin,
    iteration,
    uphillAccepted,
    seed,
    trajectory: [...trajectory],
    lastDecision,
    ...extra,
  })

  const snapshot = (fields) => ({
    stepIndex: steps.length,
    visitedNodes: Array.from(visited),
    discoveredNodes: Array.from(visited),
    unexploredNodes: allNodeIds.filter(id => !visited.has(id)),
    parentMap: {},
    currentPath: [...trajectory],
    hCost: { ...hCost },
    traversedEdges: [...traversedEdges],
    isInitial: false,
    isFinal: false,
    pathFound: false,
    goalReached: false,
    ...fields,
  })

  const walkedCost = () => calculatePathCost(trajectory, graph)

  // ── Step 0: INITIALIZE ──────────────────────────────────────────────────
  const initRaw = sortedNeighbors(startId)
  const initDetail = neighborDetail(startId, initRaw)

  if (startId === goalId) {
    steps.push(snapshot({
      stepType: ACTION_TYPE.INITIALIZE_GOAL,
      action: ACTION_TYPE.INITIALIZE_GOAL,
      currentNode: startId,
      selectedNode: startId,
      frontierNodes: [],
      frontierDetail: [],
      pathNodes: [startId],
      pathEdges: [],
      neighbors: [],
      neighborsConsidered: [],
      algorithmSpecificState: baseState({ currentH: 0, saStatus: 'Goal Reached' }),
      reason: `Start node ${startId} is identical to Goal node ${goalId}. Goal reached immediately!`,
      metrics: { nodesExpanded: 0, pathLength: 0, totalCost: 0, frontierSize: 0 },
      isInitial: true,
      isFinal: true,
      pathFound: true,
      goalReached: true,
    }))
    return steps
  }

  steps.push(snapshot({
    stepType: ACTION_TYPE.INITIALIZE,
    action: ACTION_TYPE.INITIALIZE,
    currentNode: startId,
    selectedNode: startId,
    frontierNodes: initRaw.map(n => n.neighborId),
    frontierDetail: initDetail,
    neighbors: initRaw.map(n => n.neighborId),
    neighborsConsidered: [],
    algorithmSpecificState: baseState({ currentH: hCost[startId], saStatus: 'Heating Up' }),
    reason: `Initialize Simulated Annealing at node ${startId} with h(${startId}) = ${fmt(hCost[startId])} and temperature T = ${t0}. Each step proposes ONE random neighbor; worse moves are accepted with probability e^(−ΔE/T), which shrinks as T cools by α = ${alpha}.`,
    calculations: [`T₀ = ${t0}`, `Cooling: T ← T × ${alpha}`, `Frozen when T < ${tMin}`],
    metrics: { nodesExpanded: 0, pathLength: 0, totalCost: 0, frontierSize: initRaw.length },
    isInitial: true,
  }))

  // ── Annealing loop ──────────────────────────────────────────────────────
  while (true) {
    const currentH = hCost[current] ?? computeH(current)

    // 1. Goal reached
    if (current === goalId) {
      const pathNodes = eraseLoops(trajectory)
      const pathEdges = pathToEdges(pathNodes, graph)
      const cost = calculatePathCost(pathNodes, graph)
      steps.push(snapshot({
        stepType: ACTION_TYPE.GOAL_REACHED,
        action: ACTION_TYPE.GOAL_REACHED,
        currentNode: goalId,
        selectedNode: goalId,
        frontierNodes: [],
        frontierDetail: [],
        pathNodes,
        pathEdges,
        neighbors: [],
        neighborsConsidered: [],
        algorithmSpecificState: baseState({ currentH: 0, saStatus: 'Goal Reached', walkedCost: walkedCost(), pathCost: cost }),
        reason: `Goal node ${goalId} reached after ${iteration} iteration(s) and ${uphillAccepted} accepted uphill move(s). Walk: ${trajectory.join(' → ')}. Loop-free solution path: ${pathNodes.join(' → ')} (cost ${cost}).`,
        calculations: [`Walk: ${trajectory.join(' → ')}`, `Solution path: ${pathNodes.join(' → ')}`, `Path cost: ${cost}`],
        metrics: { nodesExpanded: iteration, pathLength: pathNodes.length - 1, totalCost: cost, frontierSize: 0 },
        isFinal: true,
        pathFound: true,
        goalReached: true,
      }))
      return steps
    }

    // 2. Frozen / iteration limit
    if (T < tMin || iteration >= maxIter) {
      const why = T < tMin
        ? `the temperature T = ${fmt(round(T))} fell below the freezing point ${tMin}`
        : `the iteration limit (${maxIter}) was reached`
      steps.push(snapshot({
        stepType: 'FROZEN',
        action: 'FROZEN',
        currentNode: current,
        selectedNode: current,
        frontierNodes: [],
        frontierDetail: [],
        neighbors: [],
        neighborsConsidered: [],
        algorithmSpecificState: baseState({ currentH, saStatus: T < tMin ? 'Frozen' : 'Iteration Limit', stuckAt: current }),
        reason: `Simulated Annealing stopped at node ${current} (h = ${fmt(currentH)}) because ${why} before reaching goal ${goalId}.`,
        calculations: [`T = ${fmt(round(T))} < T_min = ${tMin}`, `Final node: ${current}`],
        metrics: { nodesExpanded: iteration, pathLength: trajectory.length - 1, totalCost: walkedCost(), frontierSize: 0 },
        isFinal: true,
      }))
      return steps
    }

    const raw = sortedNeighbors(current)
    const detail = neighborDetail(current, raw)
    const neighborIds = raw.map(n => n.neighborId)

    // 3. No neighbors
    if (raw.length === 0) {
      steps.push(snapshot({
        stepType: 'FROZEN',
        action: 'FROZEN',
        currentNode: current,
        selectedNode: current,
        frontierNodes: [],
        frontierDetail: [],
        neighbors: [],
        neighborsConsidered: [],
        algorithmSpecificState: baseState({ currentH, saStatus: 'No Neighbors', stuckAt: current }),
        reason: `Node ${current} has no outgoing neighbors. Simulated Annealing cannot move and stops.`,
        metrics: { nodesExpanded: iteration, pathLength: trajectory.length - 1, totalCost: walkedCost(), frontierSize: 0 },
        isFinal: true,
      }))
      return steps
    }

    iteration++

    // ── PHASE A: VISIT_NODE ──────────────────────────────────────────────
    steps.push(snapshot({
      stepType: ACTION_TYPE.VISIT_NODE,
      action: ACTION_TYPE.VISIT_NODE,
      currentNode: current,
      selectedNode: current,
      frontierNodes: neighborIds,
      frontierDetail: detail,
      neighbors: neighborIds,
      neighborsConsidered: [],
      algorithmSpecificState: baseState({ currentH, candidateCount: raw.length, saStatus: 'Choosing Random Neighbor' }),
      reason: `Iteration ${iteration}: Simulated Annealing stands on node ${current} (h = ${fmt(currentH)}) at temperature T = ${fmt(round(T))}. Next it will pick ONE of its ${raw.length} neighbor(s) [${neighborIds.join(', ')}] at random.`,
      calculations: [`Iteration ${iteration}`, `T = ${fmt(round(T))}`, `h(${current}) = ${fmt(currentH)}`],
      metrics: { nodesExpanded: iteration, pathLength: trajectory.length - 1, totalCost: walkedCost(), frontierSize: raw.length },
    }))

    // ── PHASE B: propose, decide, cool ───────────────────────────────────
    const pick = raw[Math.floor(rand() * raw.length)]
    const proposedH = computeH(pick.neighborId)
    const deltaE = proposedH - currentH
    const acceptProb = deltaE <= 0 ? 1 : Math.exp(-deltaE / T)
    const roll = rand()
    const accepted = roll < acceptProb
    const isUphill = deltaE > 0
    const tBefore = T
    const tAfter = T * alpha

    const decisionText = accepted
      ? (isUphill
          ? `Uphill move ACCEPTED because r = ${fmt(round(roll))} < p = ${fmt(round(acceptProb))}. The walker will move to ${pick.neighborId} even though it is worse. This is how annealing escapes local optima.`
          : `Move ACCEPTED: ΔE = ${fmt(deltaE)} ≤ 0, so a downhill or flat move is always taken. The walker will move to ${pick.neighborId}.`)
      : `Move REJECTED because r = ${fmt(round(roll))} ≥ p = ${fmt(round(acceptProb))}. The walker stays on ${current}.`

    steps.push(snapshot({
      stepType: ACTION_TYPE.EXPLORE_NEIGHBORS,
      action: ACTION_TYPE.EXPLORE_NEIGHBORS,
      currentNode: current,
      parentNode: current,
      selectedNode: pick.neighborId,
      activeEdge: pick.edgeId,
      frontierNodes: neighborIds,
      frontierDetail: detail,
      neighbors: neighborIds,
      // Only the proposed neighbor is evaluated, so only it animates on the canvas
      neighborsConsidered: [{
        neighborId: pick.neighborId,
        edgeId: pick.edgeId,
        weight: pick.weight,
        hValue: proposedH,
        currentH,
        delta: deltaE,
        status: accepted ? 'accepted' : 'rejected',
      }],
      algorithmSpecificState: baseState({
        temperature: round(tBefore),
        nextTemperature: round(tAfter),
        currentH,
        proposedNeighbor: pick.neighborId,
        proposedH,
        deltaE,
        acceptProb: round(acceptProb),
        roll: round(roll),
        accepted,
        isUphill,
        nextNode: accepted ? pick.neighborId : current,
        uphillAccepted: uphillAccepted + (accepted && isUphill ? 1 : 0),
        saStatus: accepted ? (isUphill ? 'Uphill Move Accepted' : 'Move Accepted') : 'Move Rejected',
      }),
      reason: `T = ${fmt(round(tBefore))}. Randomly proposed neighbor ${pick.neighborId}: ΔE = h(${pick.neighborId}) − h(${current}) = ${fmt(proposedH)} − ${fmt(currentH)} = ${fmt(deltaE)}. ${decisionText} Then the system cools: T = ${fmt(round(tBefore))} × ${alpha} = ${fmt(round(tAfter))}.`,
      calculations: [
        `Proposed neighbor: ${pick.neighborId}`,
        `ΔE = ${fmt(proposedH)} − ${fmt(currentH)} = ${fmt(deltaE)}`,
        isUphill
          ? `p = e^(−ΔE/T) = e^(−${fmt(deltaE)}/${fmt(round(tBefore))}) = ${fmt(round(acceptProb))}`
          : `p = 1 (ΔE ≤ 0, always accept)`,
        `Random draw r = ${fmt(round(roll))}`,
        `Decision: ${accepted ? `ACCEPT → move to ${pick.neighborId}` : `REJECT → stay at ${current}`}`,
        `Cooling: T = ${fmt(round(tBefore))} × ${alpha} = ${fmt(round(tAfter))}`,
      ],
      metrics: { nodesExpanded: iteration, pathLength: trajectory.length - 1, totalCost: walkedCost(), frontierSize: raw.length },
    }))

    // Apply the decision (visible from the next VISIT_NODE step)
    lastDecision = {
      fromNode: current,
      proposedNeighbor: pick.neighborId,
      proposedH,
      currentH,
      deltaE,
      temperature: round(tBefore),
      acceptProb: round(acceptProb),
      roll: round(roll),
      accepted,
    }
    if (accepted) {
      if (isUphill) uphillAccepted++
      current = pick.neighborId
      trajectory.push(current)
      visited.add(current)
      if (!traversedEdges.includes(pick.edgeId)) traversedEdges.push(pick.edgeId)
    }
    T = tAfter
  }
}
