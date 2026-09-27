/**
 * algorithmEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Unified dispatcher for all graph search algorithms.
 *
 * The UI (and Zustand store) only ever calls this file — it never imports
 * individual engine modules directly. This makes adding future algorithms
 * (Bidirectional BFS, IDA*, etc.) a one-line change here.
 *
 * Pure logic — zero React, zero DOM, zero side effects.
 */

import { ALGORITHM } from '../types/graphTypes.js'
import { runBFS    } from './bfsEngine.js'
import { runDFS    } from './dfsEngine.js'
import { runUCS    } from './ucsEngine.js'
import { runGreedy } from './greedyEngine.js'
import { runAStar  } from './astarEngine.js'

/**
 * Run the selected algorithm on the given graph and return the full
 * array of AlgorithmStep snapshots.
 *
 * @param {string} algorithmId  – one of ALGORITHM.BFS | DFS | UCS | GREEDY | ASTAR
 * @param {import('../types/graphStructures.js').Graph} graph
 * @param {object} [options]
 * @param {function} [options.heuristicFn]  – custom heuristic (for Greedy / A*)
 * @returns {import('../types/graphStructures.js').AlgorithmStep[]}
 */
export function runAlgorithm(algorithmId, graph, options = {}) {
  const { heuristicFn } = options

  switch (algorithmId) {
    case ALGORITHM.BFS:
      return runBFS(graph)
    case ALGORITHM.DFS:
      return runDFS(graph)
    case ALGORITHM.UCS:
      return runUCS(graph)
    case ALGORITHM.GREEDY:
      return runGreedy(graph, heuristicFn)
    case ALGORITHM.ASTAR:
      return runAStar(graph, heuristicFn)
    default:
      console.warn(`[algorithmEngine] Unknown algorithm: "${algorithmId}"`)
      return []
  }
}
