/**
 * annealingExplanation.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Pedagogical explanations for Simulated Annealing steps, returning the same
 * StepExplanation shape as explanationGenerator.explainStep so the AI Teacher
 * panel, voice narration and "Why not the others?" section work unchanged.
 *
 * Reads the step fields produced by simulatedAnnealingTwoPhaseEngine.js:
 *  algorithmSpecificState = { temperature, nextTemperature, currentH, proposedNeighbor,
 *                             proposedH, deltaE, acceptProb, roll, accepted, isUphill,
 *                             nextNode, uphillAccepted, iteration, saStatus, ... }
 */

const fmt = (n) => {
  if (n === undefined || n === null) return '0'
  if (typeof n !== 'number') return String(n)
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

const speak = (n) => fmt(n).replace('.', ' point ').replace('-', 'minus ')

/**
 * @param {object} step
 * @param {object} graph
 * @param {'beginner'|'detailed'} level
 * @param {object} meta – ALGORITHM_META entry
 */
export function explainAnnealingStep(step, graph, level, meta) {
  const s = step.algorithmSpecificState ?? {}
  const act = step.stepType || step.action
  const node = step.currentNode ?? step.selectedNode
  const startId = graph?.startId ?? 'Start'
  const goalId = graph?.goalId ?? 'Goal'
  const curH = s.currentH ?? step.hCost?.[node] ?? 0
  const T = s.temperature

  let short, beginner, advanced, decision, voice, concept
  let calc = step.calculations ?? []
  let whyNot = emptyWhyNot(node, `h(${node}) = ${fmt(curH)}`, 'No competing choice at this step.')

  if (act === 'INITIALIZE' || act === 'INITIALIZE_GOAL') {
    concept = 'Initialization'
    short = `Start Simulated Annealing at node ${startId} with temperature T = ${fmt(T)}.`
    beginner = `We begin Simulated Annealing at node ${startId} (heuristic ${fmt(curH)}). Think of forging metal: while it is hot, the walker sometimes accepts a WORSE neighbor on purpose so it doesn't get trapped like Hill Climbing. As the temperature cools, it becomes pickier and settles down.`
    advanced = `Initialize Simulated Annealing at start node ${startId}:\n\n` +
      `• Current State: Node ${startId}, objective h(${startId}) = ${fmt(curH)}\n` +
      `• Initial Temperature: T₀ = ${fmt(s.initialTemperature)}\n` +
      `• Cooling Schedule: T ← T × α with α = ${fmt(s.coolingRate)}\n` +
      `• Freezing Point: stop when T < ${fmt(s.minTemperature)}\n` +
      `• Acceptance Rule: ΔE ≤ 0 → always accept; ΔE > 0 → accept with p = e^(−ΔE/T)\n\n` +
      `Unlike Hill Climbing, which only takes strictly better moves, annealing can climb out of local optima early on, when T is high.`
    decision = `Start at node ${startId}. Its heuristic value is ${fmt(curH)} and the temperature starts at ${fmt(T)}.`
    voice = `Start at node ${startId} with temperature ${speak(T)}. Simulated Annealing may accept worse moves while it is hot.`
    whyNot = emptyWhyNot(node, `h(${node}) = ${fmt(curH)}`, 'Initial state of the annealing walk.')
  } else if (act === 'GOAL_REACHED' || (step.isFinal && step.goalReached)) {
    concept = 'Goal Reached'
    const walk = (s.trajectory ?? step.currentPath ?? []).join(' → ')
    const path = (step.pathNodes ?? []).join(' → ')
    short = `Goal node ${node} reached! Simulated Annealing found the target.`
    beginner = `Goal node ${node} reached after ${s.iteration ?? 0} iteration(s)!\n\nThe walker took this route: ${walk}.\nRemoving the loops gives the solution path: ${path} (cost ${fmt(s.pathCost ?? step.metrics?.totalCost)}).` +
      (s.uphillAccepted > 0 ? `\n\nIt accepted ${s.uphillAccepted} uphill move(s) along the way. Those "bad" moves are what let annealing explore beyond the first downhill choice.` : '')
    advanced = `Goal Node ${node} Reached Successfully!\n\n` +
      `• Iterations: ${s.iteration ?? 0}\n` +
      `• Uphill moves accepted: ${s.uphillAccepted ?? 0}\n` +
      `• Final temperature: T = ${fmt(T)}\n` +
      `• Walk (with revisits): ${walk}\n` +
      `• Loop-erased solution path: ${path}\n` +
      `• Path cost: ${fmt(s.pathCost ?? step.metrics?.totalCost)} (distance walked: ${fmt(s.walkedCost)})`
    decision = `The current node is the goal, so Simulated Annealing has reached the target.`
    voice = `Goal node ${node} reached. Simulated Annealing found the target after ${speak(s.iteration ?? 0)} iterations.`
    whyNot = emptyWhyNot(node, 'Goal reached', 'Search ended.')
  } else if (act === 'FROZEN' || (step.isFinal && !step.goalReached)) {
    concept = 'Frozen'
    const status = s.saStatus ?? 'Frozen'
    short = status === 'No Neighbors'
      ? `Node ${node} has no neighbors, so Simulated Annealing cannot move.`
      : `The system has cooled down (${status}). Simulated Annealing stops at node ${node} without reaching the goal.`
    beginner = status === 'No Neighbors'
      ? `Node ${node} has no outgoing neighbors, so the walker has nowhere to go and the search ends.`
      : `The metal has cooled and hardened. At temperature ${fmt(T)} the walker stops at node ${node} (heuristic ${fmt(curH)}) before reaching goal ${goalId}.\n\nWith a slower cooling rate (α closer to 1) or a higher starting temperature, annealing gets more time to explore and is more likely to reach the goal.`
    advanced = `Simulated Annealing Terminated: ${status} at Node ${node}.\n\n` +
      `• Current State: Node ${node}, h(${node}) = ${fmt(curH)}\n` +
      `• Final Temperature: T = ${fmt(T)} (freezing point ${fmt(s.minTemperature)})\n` +
      `• Iterations: ${s.iteration ?? 0}, uphill moves accepted: ${s.uphillAccepted ?? 0}\n` +
      `• Completeness: annealing is only guaranteed to find the goal with an extremely slow cooling schedule; a practical schedule can freeze early.`
    decision = `Simulated Annealing stopped at node ${node} (${status}).`
    voice = `The system has cooled down. Simulated Annealing stops at node ${node}.`
    whyNot = emptyWhyNot(node, `h(${node}) = ${fmt(curH)}`, 'Search ended.')
  } else if (act === 'VISIT_NODE') {
    concept = 'Visit Node'
    const neighbors = step.neighbors ?? []
    short = `Standing on node ${node} (h = ${fmt(curH)}) at temperature T = ${fmt(T)}.`
    beginner = `The walker is on node ${node} with heuristic ${fmt(curH)}. The temperature is ${fmt(T)}.\n\nNext, it will pick ONE of its neighbors [${neighbors.join(', ')}] completely at random. It does not compare them all like Hill Climbing does.`
    advanced = `Iteration ${s.iteration ?? '?'}: Active state node ${node}.\n\n` +
      `• Objective: h(${node}) = ${fmt(curH)}\n` +
      `• Temperature: T = ${fmt(T)}\n` +
      `• Neighborhood N(${node}) = {${neighbors.join(', ')}}\n` +
      `• Move proposal: one neighbor sampled uniformly at random\n\n` +
      `In the next step the engine computes ΔE for the proposed neighbor and applies the Metropolis acceptance rule.`
    decision = `The walker is on node ${node}. It will propose one random neighbor next.`
    voice = `Standing on node ${node} with heuristic ${speak(curH)}. Temperature is ${speak(T)}.`
    whyNot = {
      selected: { node, valueStr: `h(${node}) = ${fmt(curH)}` },
      alternatives: [],
      summary: 'Simulated Annealing keeps only the current node. There is no frontier to choose from.',
      formattedText: `Simulated Annealing keeps a single current state (${node}). There are no other waiting candidates; the next move is a random proposal.`,
    }
  } else if (act === 'EXPLORE_NEIGHBORS') {
    concept = s.accepted ? (s.isUphill ? 'Uphill Move Accepted' : 'Move Accepted') : 'Move Rejected'
    const n = s.proposedNeighbor
    const dE = s.deltaE
    const p = s.acceptProb
    const r = s.roll
    const result = s.accepted
      ? `ACCEPT → the walker moves to ${n} in the next step`
      : `REJECT → the walker stays on ${node}`

    short = s.accepted
      ? `Proposed ${n} (ΔE = ${fmt(dE)}). ${s.isUphill ? `Uphill move accepted (r ${fmt(r)} < p ${fmt(p)}).` : 'Downhill move accepted.'}`
      : `Proposed ${n} (ΔE = ${fmt(dE)}). Rejected (r ${fmt(r)} ≥ p ${fmt(p)}), stays on ${node}.`

    const ruleLine = s.isUphill
      ? `Since ΔE = ${fmt(dE)} > 0 (worse), the acceptance probability is p = e^(−ΔE/T) = e^(−${fmt(dE)}/${fmt(T)}) = ${fmt(p)}.`
      : `Since ΔE = ${fmt(dE)} ≤ 0 (better or equal), the move is always accepted (p = 1).`

    beginner = `From node ${node} (heuristic ${fmt(curH)}), the walker randomly proposes neighbor ${n} (heuristic ${fmt(s.proposedH)}).\n\n` +
      `${ruleLine}\n` +
      `A random number r = ${fmt(r)} is drawn. ${s.accepted ? `Because r < p, the move is accepted.` : `Because r ≥ p, the move is rejected.`}\n\n` +
      `Result: ${result}. Then the temperature cools from ${fmt(T)} to ${fmt(s.nextTemperature)}.` +
      (s.accepted && s.isUphill ? `\n\nThis is the key idea: annealing sometimes takes a worse step on purpose so it can escape local optima.` : '')

    advanced = `Metropolis acceptance test at node ${node}:\n\n` +
      `• Proposed neighbor: ${n} (sampled uniformly from ${(step.neighbors ?? []).length} neighbor(s))\n` +
      `• Energy change: ΔE = h(${n}) − h(${node}) = ${fmt(s.proposedH)} − ${fmt(curH)} = ${fmt(dE)}\n` +
      `• Acceptance probability: ${s.isUphill ? `p = e^(−ΔE/T) = ${fmt(p)}` : 'p = 1 (non-worsening move)'}\n` +
      `• Random draw: r = ${fmt(r)} → ${s.accepted ? 'r < p' : 'r ≥ p'}\n` +
      `• Decision: ${result}\n` +
      `• Cooling: T = ${fmt(T)} × ${fmt(s.coolingRate)} = ${fmt(s.nextTemperature)}\n\n` +
      `As T decreases, e^(−ΔE/T) shrinks for every uphill move, so the search gradually turns into pure descent.`

    decision = s.accepted
      ? `${n} was accepted${s.isUphill ? ` even though it is worse, because r = ${fmt(r)} < p = ${fmt(p)}` : ' because it does not increase the heuristic'}.`
      : `${n} was rejected because r = ${fmt(r)} ≥ p = ${fmt(p)}; the walker stays on ${node}.`

    voice = s.accepted
      ? `Proposing neighbor ${n}. ${s.isUphill ? `It is worse, but the random draw is below the acceptance probability, so the move is accepted.` : 'It is not worse, so the move is accepted.'}`
      : `Proposing neighbor ${n}. It is worse and the random draw is too high, so the move is rejected. The walker stays on ${node}.`

    const otherNeighbors = (step.frontierDetail ?? []).filter(d => d.nodeId !== n)
    whyNot = {
      selected: { node: n, valueStr: `ΔE = ${fmt(dE)}, p = ${fmt(p)}` },
      alternatives: otherNeighbors.map(d => ({
        node: d.nodeId,
        valueStr: `h(${d.nodeId}) = ${fmt(d.h)}`,
        comparison: `Not proposed this iteration`,
        reason: `Simulated Annealing samples only ONE random neighbor per iteration; ${d.nodeId} simply wasn't picked this time.`,
      })),
      summary: `Annealing does not compare all neighbors. ${n} was proposed at random and tested with the acceptance rule.`,
      formattedText: [`Proposed: ${n} (ΔE = ${fmt(dE)}, p = ${fmt(p)}, r = ${fmt(r)})`, '',
        ...otherNeighbors.map(d => `Why not ${d.nodeId}? It wasn't randomly picked this iteration (h = ${fmt(d.h)}).`),
        `Annealing tests one random neighbor per iteration.`].join('\n'),
    }
  } else {
    concept = 'Step'
    short = step.reason ?? `Step ${act}`
    beginner = advanced = decision = voice = short
  }

  const detail = level === 'beginner' ? beginner : advanced
  return {
    shortExplanation: short,
    detailedExplanation: detail,
    beginnerExplanation: beginner,
    advancedExplanation: advanced,
    calculationBlock: calc,
    decisionReason: decision,
    whyNotOthers: whyNot,
    voiceText: voice,
    concept,
    algorithmMeta: meta,
    level,

    // Legacy fields for backward compatibility with existing components
    summary: short,
    detail,
    keyPoints: [decision, whyNot.summary],
    formula: calc,
  }
}

function emptyWhyNot(node, valueStr, summary) {
  return {
    selected: { node: node ?? 'N/A', valueStr },
    alternatives: [],
    summary,
    formattedText: summary,
  }
}
