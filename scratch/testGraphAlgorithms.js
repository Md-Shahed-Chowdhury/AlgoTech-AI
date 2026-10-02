import { runHillClimbingTwoPhase } from '../src/features/graph/engine/hillClimbingTwoPhaseEngine.js'
import { runBFSTwoPhase } from '../src/features/graph/engine/bfsTwoPhaseEngine.js'
import { runDFSTwoPhase } from '../src/features/graph/engine/dfsTwoPhaseEngine.js'
import { runUCSTwoPhase } from '../src/features/graph/engine/ucsTwoPhaseEngine.js'
import { runGreedyTwoPhase } from '../src/features/graph/engine/greedyTwoPhaseEngine.js'
import { runAStarTwoPhase } from '../src/features/graph/engine/astarTwoPhaseEngine.js'
import { explainAllSteps } from '../src/features/graph/engine/explanationGenerator.js'

function makeGraph(startId, goalId, nodeDefs, edgeDefs) {
  const nodes = {}
  nodeDefs.forEach(n => {
    nodes[n.id] = {
      id: n.id,
      label: n.label || n.id,
      hValue: n.heuristic ?? 0,
      x: 0,
      y: 0,
      isStart: n.id === startId,
      isGoal: n.id === goalId,
    }
  })

  const edges = {}
  edgeDefs.forEach((e, idx) => {
    const id = e.id || `e${idx}`
    edges[id] = {
      id,
      sourceId: e.sourceId,
      targetId: e.targetId,
      weight: e.weight ?? 1,
      directed: true,
    }
  })

  return {
    startId,
    goalId,
    nodes,
    edges,
    isDirected: true,
  }
}

// Graph from user prompt example:
// Start A (h=8), B (h=6), C (h=4), D (h=7), Goal G (h=0)
// A -> B, C, D
// C -> G
const exampleGraph = makeGraph(
  'A',
  'G',
  [
    { id: 'A', heuristic: 8 },
    { id: 'B', heuristic: 6 },
    { id: 'C', heuristic: 4 },
    { id: 'D', heuristic: 7 },
    { id: 'G', heuristic: 0 },
  ],
  [
    { sourceId: 'A', targetId: 'B' },
    { sourceId: 'A', targetId: 'C' },
    { sourceId: 'A', targetId: 'D' },
    { sourceId: 'C', targetId: 'G' },
  ]
)

console.log('====================================================')
console.log('TESTING HILL CLIMBING EXPLANATION GENERATOR')
console.log('====================================================')

const hcSteps = runHillClimbingTwoPhase(exampleGraph)
const hcExplanations = explainAllSteps(hcSteps, 'hillclimbing', exampleGraph, 'beginner')

hcExplanations.forEach((exp, idx) => {
  console.log(`\n--- STEP ${idx} (${hcSteps[idx].action}) ---`)
  console.log('Short Explanation:', exp.shortExplanation)
  console.log('Detailed Explanation:\n' + exp.detailedExplanation)
  console.log('Decision Reason:', exp.decisionReason)
  console.log('Why Not Others:\n' + exp.whyNotOthers.formattedText)
})

console.log('\n====================================================')
console.log('TESTING HILL CLIMBING LOCAL OPTIMUM EXPLANATION')
console.log('====================================================')

const localOptGraph = makeGraph(
  'A',
  'G',
  [
    { id: 'A', heuristic: 4 },
    { id: 'B', heuristic: 5 },
    { id: 'C', heuristic: 6 },
    { id: 'G', heuristic: 0 },
  ],
  [
    { sourceId: 'A', targetId: 'B' },
    { sourceId: 'A', targetId: 'C' },
  ]
)
const loSteps = runHillClimbingTwoPhase(localOptGraph)
const loExplanations = explainAllSteps(loSteps, 'hillclimbing', localOptGraph, 'beginner')

loExplanations.forEach((exp, idx) => {
  console.log(`\n--- STEP ${idx} (${loSteps[idx].action}) ---`)
  console.log('Short Explanation:', exp.shortExplanation)
  console.log('Detailed Explanation:\n' + exp.detailedExplanation)
  console.log('Decision Reason:', exp.decisionReason)
})

console.log('\n====================================================')
console.log('VERIFYING EXISTING ALGORITHMS UNCHANGED')
console.log('====================================================')

const bfsSteps = runBFSTwoPhase(exampleGraph)
const bfsExp = explainAllSteps(bfsSteps, 'bfs', exampleGraph)
console.log('BFS Step 0 explanation:', bfsExp[0].shortExplanation)

const dfsSteps = runDFSTwoPhase(exampleGraph)
const dfsExp = explainAllSteps(dfsSteps, 'dfs', exampleGraph)
console.log('DFS Step 0 explanation:', dfsExp[0].shortExplanation)

const ucsSteps = runUCSTwoPhase(exampleGraph)
const ucsExp = explainAllSteps(ucsSteps, 'ucs', exampleGraph)
console.log('UCS Step 0 explanation:', ucsExp[0].shortExplanation)

const greedySteps = runGreedyTwoPhase(exampleGraph)
const greedyExp = explainAllSteps(greedySteps, 'greedy', exampleGraph)
console.log('Greedy Step 0 explanation:', greedyExp[0].shortExplanation)

const astarSteps = runAStarTwoPhase(exampleGraph)
const astarExp = explainAllSteps(astarSteps, 'astar', exampleGraph)
console.log('A* Step 0 explanation:', astarExp[0].shortExplanation)
