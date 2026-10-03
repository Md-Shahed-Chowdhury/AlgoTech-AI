/**
 * runAny.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Compare-side dispatcher. Local-search algorithms live outside the shared
 * ALGORITHM registry (ExamModePage renders a tab per ALGORITHM entry), so they
 * are routed here instead of through runAlgorithm.
 */

import { runAlgorithm } from '../../graph/engine/algorithmEngine.js'
import { runHillClimbing } from '../../graph/engine/hillClimbingEngine.js'
import { runSimulatedAnnealing } from '../../graph/engine/simulatedAnnealingEngine.js'

export const LOCAL_SEARCH = {
  HILL:      'hill',
  ANNEALING: 'annealing',
}

export const isLocalSearch = (id) => id === LOCAL_SEARCH.HILL || id === LOCAL_SEARCH.ANNEALING

/**
 * @param {string} id
 * @param {object} graph
 * @param {{ seed?: number, t0?: number, alpha?: number, sideways?: number }} [localOptions]
 */
export function runCompareAlgorithm(id, graph, localOptions = {}) {
  switch (id) {
    case LOCAL_SEARCH.HILL:
      return withIndex(runHillClimbing(graph, { sideways: localOptions.sideways ?? 0 }))
    case LOCAL_SEARCH.ANNEALING:
      return withIndex(runSimulatedAnnealing(graph, {
        seed: localOptions.seed,
        t0: localOptions.t0,
        alpha: localOptions.alpha,
      }))
    default:
      return runAlgorithm(id, graph)
  }
}

function withIndex(steps) {
  for (let i = 0; i < steps.length; i++) steps[i].stepIndex = i
  return steps
}
