/**
 * simulatedAnnealingEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Simulated Annealing over the graph, minimizing the heuristic h(n).
 *
 * Each iteration is two steps:
 *  - PROPOSE:          pick a random neighbor, compute ΔE = h(next) − h(current)
 *  - ACCEPT / REJECT:  downhill always accepted; uphill accepted with
 *                      probability e^(−ΔE / T). Then T ← T × α.
 * Terminates on GOAL_REACHED, FROZEN (T < tMin) or the iteration cap.
 *
 * Randomness comes from a seeded PRNG, so a seed always replays identically.
 * Pure logic — zero React, zero DOM.
 */

import { buildAdjacency, getNeighbors, getNodeHeuristic } from '../utils/graphUtils.js'
import { mulberry32 } from '../utils/seededRandom.js'
import { LOCAL_ACTION, createWalker } from './hillClimbingEngine.js'

export const ANNEALING_DEFAULTS = { seed: 4, t0: 10, alpha: 0.9, tMin: 0.05, maxIter: 60 }

/**
 * @param {import('../types/graphStructures.js').Graph} graph
 * @param {object} [options]
 * @returns {object[]} AlgorithmStep-shaped snapshots
 */
export function runSimulatedAnnealing(graph, options = {}) {
  // Ignore undefined overrides so callers can pass partial option objects
  const given = Object.fromEntries(Object.entries(options).filter(([, v]) => v != null))
  const { seed, t0, alpha, tMin, maxIter } = { ...ANNEALING_DEFAULTS, ...given }
  const steps = []
  const { startId, goalId, nodes } = graph
  if (!startId || !goalId || !nodes[startId] || !nodes[goalId]) return steps

  const adj = buildAdjacency(graph, false)
  const h = (id) => getNodeHeuristic(id, graph)
  const rand = mulberry32(seed)
  const walker = createWalker(graph, startId)
  let T = t0
  let iterations = 0
  let uphillAccepted = 0

  const state = (extra = {}) => ({ temperature: round(T), uphillAccepted, ...extra })

  steps.push(walker.snapshot({
    action: LOCAL_ACTION.INITIALIZE,
    reason: `Initialize Simulated Annealing at ${startId} (h = ${h(startId)}) with temperature T = ${t0}, cooling α = ${alpha}. Uphill moves are allowed with probability e^(−ΔE/T), which shrinks as T cools.`,
    iterations,
    isInitial: true,
    extra: state(),
  }))

  while (iterations < maxIter) {
    const current = walker.current
    if (current === goalId) break
    if (T < tMin) {
      steps.push(walker.snapshot({
        action: LOCAL_ACTION.FROZEN,
        reason: `Frozen: temperature ${round(T)} fell below ${tMin} before reaching ${goalId}. The search stops at ${current} (h = ${h(current)}).`,
        iterations,
        isFinal: true,
        extra: state({ stuckAt: current }),
      }))
      return steps
    }

    const neighbors = getNeighbors(current, adj)
    if (neighbors.length === 0) {
      steps.push(walker.snapshot({
        action: LOCAL_ACTION.FROZEN,
        reason: `${current} has no neighbors; annealing cannot move.`,
        iterations,
        isFinal: true,
        extra: state({ stuckAt: current }),
      }))
      return steps
    }
    iterations++

    // ── Step A: propose a random neighbor ─────────────────────────────────
    const pick = neighbors[Math.floor(rand() * neighbors.length)]
    const hCur = h(current)
    const hNext = h(pick.neighborId)
    const deltaE = hNext - hCur
    const acceptProb = deltaE <= 0 ? 1 : Math.exp(-deltaE / T)
    const roll = rand()
    const accepted = roll < acceptProb

    const proposal = [{ neighborId: pick.neighborId, edgeId: pick.edgeId, weight: pick.weight, h: hNext, status: 'proposed' }]
    steps.push(walker.snapshot({
      action: LOCAL_ACTION.PROPOSE,
      neighborsConsidered: proposal,
      activeEdge: pick.edgeId,
      reason: deltaE <= 0
        ? `T = ${round(T)}. Propose random neighbor ${pick.neighborId}: ΔE = ${hNext} − ${hCur} = ${deltaE} ≤ 0, a downhill (or flat) move, so it is always accepted.`
        : `T = ${round(T)}. Propose random neighbor ${pick.neighborId}: ΔE = ${hNext} − ${hCur} = +${deltaE} (uphill). Accept with p = e^(−${deltaE}/${round(T)}) = ${round(acceptProb)}.`,
      iterations,
      extra: state({ deltaE, acceptProb: round(acceptProb), roll: round(roll) }),
    }))

    // ── Step B: accept or reject, then cool ───────────────────────────────
    if (accepted) {
      if (deltaE > 0) uphillAccepted++
      walker.moveTo(pick.neighborId, pick.edgeId, pick.weight)
    }
    const tBefore = T
    T *= alpha

    if (accepted && pick.neighborId === goalId) {
      steps.push(walker.finish(
        `Moved to goal ${goalId}! Walk: ${walker.trajectory.join(' → ')} (${uphillAccepted} uphill move(s) accepted along the way).`,
        iterations,
        state({ deltaE, acceptProb: round(acceptProb), roll: round(roll), accepted }),
      ))
      return steps
    }

    steps.push(walker.snapshot({
      action: accepted ? LOCAL_ACTION.ACCEPT : LOCAL_ACTION.REJECT,
      neighborsConsidered: [{ ...proposal[0], status: accepted ? 'accepted' : 'rejected' }],
      reason: accepted
        ? `${deltaE > 0 ? `Uphill move accepted (random ${round(roll)} < p ${round(acceptProb)})` : 'Accepted'}: move ${current} → ${pick.neighborId}. Cool T: ${round(tBefore)} → ${round(T)}.`
        : `Rejected (random ${round(roll)} ≥ p ${round(acceptProb)}): stay at ${current}. Cool T: ${round(tBefore)} → ${round(T)}.`,
      iterations,
      extra: state({ deltaE, acceptProb: round(acceptProb), roll: round(roll), accepted }),
    }))
  }

  steps.push(walker.snapshot({
    action: LOCAL_ACTION.FROZEN,
    reason: `Iteration limit (${maxIter}) reached without finding ${goalId}.`,
    iterations,
    isFinal: true,
    extra: state({ stuckAt: walker.current }),
  }))
  return steps
}

const round = (v) => Math.round(v * 100) / 100
