/**
 * compareRunner.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs several search algorithms on the same graph and scores them on the four
 * evaluation criteria: execution time, solution quality, efficiency and
 * convergence. Pure logic — zero React, zero DOM.
 */

import { getNodeHeuristic } from '../../graph/utils/graphUtils.js'
import { ALGORITHM } from '../../graph/types/graphTypes.js'
import { ALGO_BY_ID, ALGO_ORDER, formatTime } from '../constants.js'
import { runCompareAlgorithm, isLocalSearch, LOCAL_SEARCH } from './runAny.js'
import { pathCost, costToGoal, findInadmissibleNodes, buildSeries, measureAverageMs } from './metrics.js'

/** Seeded re-runs used to measure how reliably a randomized search succeeds. */
export const ROBUSTNESS_TRIALS = 100

// Weights favor solution quality: on small graphs execution time differs by
// microseconds and should not let a non-optimal search win overall.
export const CRITERIA = [
  { id: 'time',        label: 'Execution Time',   weight: 0.10, hint: 'Average wall-clock time of the search engine' },
  { id: 'quality',     label: 'Solution Quality', weight: 0.45, hint: 'Path cost compared with the true optimal cost' },
  { id: 'efficiency',  label: 'Efficiency',       weight: 0.25, hint: 'Nodes expanded (70%) and peak frontier memory (30%)' },
  { id: 'convergence', label: 'Convergence',      weight: 0.20, hint: 'Steps needed before the search settles on the goal' },
]

/**
 * @param {import('../../graph/types/graphStructures.js').Graph} graph
 * @param {string[]} algoIds
 * @param {{ seed?: number, t0?: number, alpha?: number, sideways?: number }} [localOptions]
 *        settings for the local-search algorithms
 */
export function runComparison(graph, algoIds, localOptions = {}) {
  const ids = ALGO_ORDER.filter(id => algoIds.includes(id))
  const trueCost = costToGoal(graph)
  const optimalCost = graph.startId ? trueCost[graph.startId] : Infinity
  const reachable = optimalCost !== Infinity

  const results = {}
  for (const id of ids) {
    results[id] = summarize(id, graph, optimalCost, trueCost, localOptions)
  }

  // Race finishing order: fewer steps to reach the goal = earlier finish
  const finishers = ids
    .filter(id => results[id].pathFound)
    .sort((a, b) => results[a].stepsToGoal - results[b].stepsToGoal)
  let rank = 0
  let prevSteps = null
  finishers.forEach((id, i) => {
    if (results[id].stepsToGoal !== prevSteps) rank = i + 1
    prevSteps = results[id].stepsToGoal
    results[id].finishRank = rank
  })

  const inadmissible = findInadmissibleNodes(graph, trueCost)
  const baseline = { optimalCost: reachable ? optimalCost : null, reachable, inadmissible }
  const verdict = buildVerdict(ids, results, graph, baseline)

  return { ids, results, baseline, verdict }
}

// ─────────────────────────────────────────────────────────────────────────────

function summarize(id, graph, optimalCost, trueCost, localOptions) {
  const run = (opts = localOptions) => runCompareAlgorithm(id, graph, opts)
  const steps = run()
  const final = steps[steps.length - 1] ?? null
  const pathFound = !!final?.pathFound
  const pathNodes = pathFound ? (final.pathNodes ?? []) : []
  const realCost = pathFound ? pathCost(pathNodes, graph) : null
  const timing = measureAverageMs(() => run())
  const local = isLocalSearch(id)

  const nodesExpanded = final?.metrics?.nodesExpanded ?? 0
  const maxFrontier = steps.reduce((m, s) => Math.max(m, s.metrics?.frontierSize ?? 0), 0)

  let optimalityRatio = null
  if (pathFound && realCost != null && optimalCost !== Infinity) {
    optimalityRatio = optimalCost === 0 ? (realCost === 0 ? 1 : Infinity) : realCost / optimalCost
  }

  return {
    id,
    steps,
    series: buildSeries(steps, graph, trueCost),
    pathFound,
    pathNodes,
    hops: pathFound ? pathNodes.length - 1 : null,
    realCost,
    optimalityRatio,
    isOptimal: optimalityRatio != null && Math.abs(optimalityRatio - 1) < 1e-9,
    nodesExpanded,
    maxFrontier,
    wastedExpansions: pathFound ? Math.max(0, nodesExpanded - pathNodes.length) : nodesExpanded,
    totalSteps: steps.length,
    stepsToGoal: pathFound ? steps.length - 1 : null,
    timeMs: timing.avgMs,
    timingRuns: timing.runs,
    finishRank: null,

    // Local search only (null for systematic algorithms)
    isLocal: local,
    walkedCost: local ? (final?.algorithmSpecificState?.walkedCost ?? null) : null,
    stuckAt: local && !pathFound ? (final?.algorithmSpecificState?.stuckAt ?? final?.currentNode ?? null) : null,
    endReason: local ? final?.action ?? null : null,
    uphillAccepted: id === LOCAL_SEARCH.ANNEALING ? (final?.algorithmSpecificState?.uphillAccepted ?? 0) : null,
    robustness: local ? measureRobustness(id, graph, localOptions, run, pathFound, realCost) : null,
  }
}

/**
 * Success rate and cost spread over seeded re-runs. Hill Climbing is
 * deterministic, so one run decides it; Annealing is re-run with seeds
 * seed … seed + ROBUSTNESS_TRIALS − 1.
 */
function measureRobustness(id, graph, localOptions, run, pathFound, realCost) {
  if (id !== LOCAL_SEARCH.ANNEALING) {
    return { trials: 1, successes: pathFound ? 1 : 0, successRate: pathFound ? 1 : 0, avgCost: realCost, bestCost: realCost }
  }
  const base = localOptions.seed ?? 4
  const costs = []
  for (let i = 0; i < ROBUSTNESS_TRIALS; i++) {
    const final = run({ ...localOptions, seed: base + i }).at(-1)
    if (final?.pathFound) {
      const c = pathCost(final.pathNodes ?? [], graph)
      if (c != null) costs.push(c)
    }
  }
  return {
    trials: ROBUSTNESS_TRIALS,
    successes: costs.length,
    successRate: costs.length / ROBUSTNESS_TRIALS,
    avgCost: costs.length ? costs.reduce((a, b) => a + b, 0) / costs.length : null,
    bestCost: costs.length ? Math.min(...costs) : null,
  }
}

/** 100 for the best value, proportionally less for worse (lower is better). */
function ratioScore(best, value) {
  if (value == null || !isFinite(value)) return 0
  if (value === best || value <= 0) return 100
  if (best <= 0) return 0
  return (100 * best) / value
}

function buildVerdict(ids, results, graph, baseline) {
  const list = ids.map(id => results[id])
  const minOf = (vals) => Math.min(...vals.filter(v => v != null && isFinite(v)))

  const bestTime = minOf(list.map(r => r.timeMs))
  const bestExpanded = minOf(list.map(r => r.nodesExpanded))
  const bestFrontier = minOf(list.map(r => r.maxFrontier))
  const bestSteps = minOf(list.map(r => r.stepsToGoal))

  const scores = {}
  for (const r of list) {
    // Optimal = 100. Any non-optimal path is capped at 70, then falls with the
    // square of the cost ratio, so a cheap-but-wrong search cannot outrank an
    // optimal one on efficiency alone.
    let quality = 0
    if (r.pathFound && r.optimalityRatio != null && r.optimalityRatio !== Infinity) {
      quality = r.isOptimal ? 100 : Math.min(70, 100 / r.optimalityRatio ** 2)
    }
    const s = {
      time: ratioScore(bestTime, r.timeMs),
      quality,
      // +1 keeps memory proportional when local search has a frontier of 0
      efficiency: 0.7 * ratioScore(bestExpanded, r.nodesExpanded) + 0.3 * ratioScore(bestFrontier + 1, r.maxFrontier + 1),
      convergence: r.pathFound ? ratioScore(bestSteps, r.stepsToGoal) : 0,
    }
    // Being fast or frugal is worth less if the search never reached the goal
    if (!r.pathFound) {
      s.time *= 0.5
      s.efficiency *= 0.5
    }
    s.overall = CRITERIA.reduce((sum, c) => sum + c.weight * s[c.id], 0)
    scores[r.id] = s
  }

  // Only searches that reached the goal can win a criterion (unless none did)
  const eligible = list.some(r => r.pathFound) ? ids.filter(id => results[id].pathFound) : ids
  const winners = {}
  for (const { id: c } of CRITERIA) {
    const top = Math.max(...eligible.map(id => scores[id][c]))
    winners[c] = top > 0 ? eligible.filter(id => scores[id][c] >= top - 0.5) : []
  }

  const ranking = [...ids].sort((a, b) =>
    (scores[b].overall - scores[a].overall) || (scores[b].quality - scores[a].quality))

  return { scores, winners, ranking, insights: buildInsights(ids, results, graph, baseline) }
}

// ─────────────────────────────────────────────────────────────────────────────
// Plain-English insights
// ─────────────────────────────────────────────────────────────────────────────

// Local-search short names ("Hill", "SA") read badly in sentences
const nameOf = (id) => (isLocalSearch(id) ? ALGO_BY_ID[id].name : ALGO_BY_ID[id].shortName)
const joinNames = (ids) => {
  const names = ids.map(nameOf)
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

function buildInsights(ids, results, graph, baseline) {
  const out = []
  const list = ids.map(id => results[id])
  const has = (id) => ids.includes(id)

  if (!baseline.reachable) {
    out.push({ kind: 'danger', text: 'The goal is unreachable from the start node, so no algorithm can find a path. Connect the goal and run again.' })
    return out
  }

  // Quality
  const optimal = list.filter(r => r.isOptimal).map(r => r.id)
  if (optimal.length === ids.length) {
    out.push({ kind: 'success', text: `Every selected algorithm found an optimal path (cost ${baseline.optimalCost}). Try "Weighted Shortcut" or "Misleading Heuristic" to see them disagree.` })
  } else if (optimal.length > 0) {
    out.push({ kind: 'success', text: `${joinNames(optimal)} found the optimal path (cost ${baseline.optimalCost}).` })
  }
  for (const r of list) {
    if (!r.pathFound) {
      // Local-search failures get a specific explanation below
      if (!r.isLocal) out.push({ kind: 'danger', algoId: r.id, text: `${nameOf(r.id)} finished without reaching the goal.` })
    } else if (!r.isOptimal && r.realCost != null) {
      const pct = Math.round((r.optimalityRatio - 1) * 100)
      let text = `${nameOf(r.id)} found a path costing ${r.realCost}: ${pct}% more than optimal (${baseline.optimalCost}).`
      if (r.id === ALGORITHM.BFS) text += ` BFS minimizes hops (${r.hops}), not weighted cost.`
      if (r.id === ALGORITHM.GREEDY) text += ' Greedy trusts h(n) alone and ignores the cost already paid.'
      out.push({ kind: 'warning', algoId: r.id, text })
    }
  }

  // Efficiency
  // "Fewest" only counts searches that actually reached the goal
  const found = list.filter(r => r.pathFound)
  if (ids.length >= 2 && found.length > 0) {
    const least = [...found].sort((a, b) => a.nodesExpanded - b.nodesExpanded)[0]
    const most = [...list].sort((a, b) => b.nodesExpanded - a.nodesExpanded)[0]
    if (least.nodesExpanded !== most.nodesExpanded) {
      out.push({ kind: 'info', algoId: least.id, text: `${nameOf(least.id)} expanded the fewest nodes (${least.nodesExpanded}); ${nameOf(most.id)} expanded the most (${most.nodesExpanded}), ${most.wastedExpansions} of them off the final path.` })
    }
  }

  // A* vs UCS: the value of the heuristic
  if (has(ALGORITHM.ASTAR) && has(ALGORITHM.UCS)) {
    const a = results[ALGORITHM.ASTAR]
    const u = results[ALGORITHM.UCS]
    if (a.isOptimal && u.isOptimal) {
      const diff = u.nodesExpanded - a.nodesExpanded
      out.push(diff > 0
        ? { kind: 'success', algoId: ALGORITHM.ASTAR, text: `A* matched UCS's optimal cost while expanding ${diff} fewer node${diff === 1 ? '' : 's'}: the heuristic pruned the search.` }
        : { kind: 'info', algoId: ALGORITHM.ASTAR, text: 'A* expanded as many nodes as UCS here, so the heuristic gave no pruning advantage on this graph.' })
    }
  }

  // Greedy: fast but risky
  if (has(ALGORITHM.GREEDY)) {
    const g = results[ALGORITHM.GREEDY]
    const fastest = Math.min(...list.filter(r => r.pathFound).map(r => r.stepsToGoal))
    if (g.pathFound && g.stepsToGoal === fastest && !g.isOptimal) {
      out.push({ kind: 'warning', algoId: ALGORITHM.GREEDY, text: 'Greedy converged the fastest but paid for it with a non-optimal path: the classic speed-vs-quality trade-off.' })
    }
  }

  // Local search: stuck points, luck, memory
  out.push(...localSearchInsights(ids, results, graph))

  // Heuristic health
  const usesLocal = has(LOCAL_SEARCH.HILL) || has(LOCAL_SEARCH.ANNEALING)
  const usesHeuristic = has(ALGORITHM.ASTAR) || has(ALGORITHM.GREEDY) || usesLocal
  if (usesHeuristic) {
    const allZero = Object.keys(graph.nodes).every(id => getNodeHeuristic(id, graph) === 0)
    if (allZero) {
      out.push({ kind: 'warning', text: `Every h(n) is 0, so A* behaves exactly like UCS and Greedy has no guidance${usesLocal ? ', and the local searches see a flat landscape with nowhere downhill to go' : ''}. Set heuristic values in Edit Graph.` })
    } else if (baseline.inadmissible.length > 0) {
      const { nodeId, h, trueCost } = baseline.inadmissible[0]
      const more = baseline.inadmissible.length - 1
      let text = `h(${nodeId}) = ${h} overestimates the true remaining cost ${trueCost}${more > 0 ? ` (and ${more} more node${more === 1 ? '' : 's'})` : ''}, so the heuristic is inadmissible and A*'s optimality guarantee does not hold.`
      if (has(ALGORITHM.ASTAR) && results[ALGORITHM.ASTAR].isOptimal) text += ' A* still happened to find the optimal path.'
      out.push({ kind: 'warning', algoId: ALGORITHM.ASTAR, text })
    }
  }

  // Execution time
  if (found.length >= 2) {
    const byTime = [...found].sort((a, b) => a.timeMs - b.timeMs)
    const fastest = byTime[0]
    const slowest = byTime[byTime.length - 1]
    const spread = slowest.timeMs / fastest.timeMs
    out.push({
      kind: 'info',
      algoId: fastest.id,
      text: `${nameOf(fastest.id)} had the fastest execution (${formatTime(fastest.timeMs)} avg over ${fastest.timingRuns} runs).${spread < 1.25 ? ' Differences under ~25% are within measurement noise on a graph this small.' : ''}`,
    })
  }

  return out
}

function localSearchInsights(ids, results, graph) {
  const out = []
  const hOf = (id) => getNodeHeuristic(id, graph)

  if (ids.includes(LOCAL_SEARCH.HILL)) {
    const r = results[LOCAL_SEARCH.HILL]
    if (!r.pathFound && r.stuckAt) {
      out.push({ kind: 'danger', algoId: r.id, text: `Hill Climbing got stuck at local minimum ${r.stuckAt} (h = ${hOf(r.stuckAt)}): no neighbor had a lower h(n), and it never accepts a worse move.` })
    } else if (r.pathFound) {
      out.push({ kind: 'info', algoId: r.id, text: `Hill Climbing reached the goal by moving strictly downhill in h(n) ${r.isOptimal ? 'and happened to find the optimal path' : `but its path costs ${r.realCost}, since h(n) ignores edge weights`}.` })
    }
  }

  if (ids.includes(LOCAL_SEARCH.ANNEALING)) {
    const r = results[LOCAL_SEARCH.ANNEALING]
    const { successes, trials, avgCost } = r.robustness
    const thisRun = r.pathFound
      ? `This run reached the goal after accepting ${r.uphillAccepted} uphill move${r.uphillAccepted === 1 ? '' : 's'}${r.walkedCost > r.realCost ? ` (walked ${r.walkedCost}, loop-free path ${r.realCost})` : ''}.`
      : `This run ${r.endReason === 'FROZEN' ? 'froze' : 'stopped'} at ${r.stuckAt} before reaching the goal. Try another seed or a slower cooling rate.`
    out.push({
      kind: successes === trials ? 'success' : successes >= trials / 2 ? 'info' : 'warning',
      algoId: r.id,
      text: `Simulated Annealing reached the goal in ${successes}/${trials} seeded runs${avgCost != null ? ` (avg cost ${formatAvg(avgCost)})` : ''}. ${thisRun}`,
    })

    const hill = results[LOCAL_SEARCH.HILL]
    if (hill && !hill.pathFound && r.pathFound) {
      out.push({ kind: 'success', algoId: r.id, text: 'Simulated Annealing escaped the local minimum that trapped Hill Climbing by occasionally accepting a worse move.' })
    }
  }

  // Memory: local search keeps no frontier at all
  const locals = ids.filter(isLocalSearch)
  const systematic = ids.filter(id => !isLocalSearch(id))
  if (locals.length && systematic.length) {
    const peak = systematic.reduce((best, id) => (results[id].maxFrontier > results[best].maxFrontier ? id : best), systematic[0])
    out.push({ kind: 'info', text: `Local search keeps no frontier, so its memory is O(1). The systematic searches peaked at ${results[peak].maxFrontier} frontier node${results[peak].maxFrontier === 1 ? '' : 's'} (${nameOf(peak)}). That's the trade for their guarantees.` })
  }

  return out
}

const formatAvg = (v) => (Number.isInteger(v) ? v : v.toFixed(1))
