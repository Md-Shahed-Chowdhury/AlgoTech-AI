/**
 * algorithmEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Unified dispatcher for all graph search algorithms.
 *
 * Each algorithm alternates between two conceptual educational phases:
 *  - PHASE A: VISIT_NODE (pops/selects node from frontier, sets active visited node)
 *  - PHASE B: EXPLORE_NEIGHBORS (evaluates ALL outgoing edges of that node as ONE step, updates frontier)
 *
 * Pure logic — zero React, zero DOM, zero side effects.
 */

import { ALGORITHM } from '../types/graphTypes.js'

import { runBFSTwoPhase    } from './bfsTwoPhaseEngine.js'
import { runDFSTwoPhase    } from './dfsTwoPhaseEngine.js'
import { runUCSTwoPhase    } from './ucsTwoPhaseEngine.js'
import { runGreedyTwoPhase } from './greedyTwoPhaseEngine.js'
import { runAStarTwoPhase  } from './astarTwoPhaseEngine.js'

/**
 * Run the selected algorithm on the given graph and return the full
 * array of Two-Phase AlgorithmStep snapshots.
 *
 * @param {string} algorithmId  – one of ALGORITHM.BFS | DFS | UCS | GREEDY | ASTAR
 * @param {import('../types/graphStructures.js').Graph} graph
 * @param {object} [options]
 * @param {function} [options.heuristicFn]  – custom heuristic (for Greedy / A*)
 * @returns {import('../types/graphStructures.js').AlgorithmStep[]}
 */
export function runAlgorithm(algorithmId, graph, options = {}) {
  switch (algorithmId) {
    case ALGORITHM.BFS:
      return runBFSTwoPhase(graph)
    case ALGORITHM.DFS:
      return runDFSTwoPhase(graph)
    case ALGORITHM.UCS:
      return runUCSTwoPhase(graph)
    case ALGORITHM.GREEDY:
      return runGreedyTwoPhase(graph, options)
    case ALGORITHM.ASTAR:
      return runAStarTwoPhase(graph, options)
    default:
      console.warn(`[algorithmEngine] Unknown algorithm: "${algorithmId}"`)
      return []
  }
}
