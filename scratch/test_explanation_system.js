import { createGraph, createNode, createEdge } from '../src/features/graph/types/graphStructures.js'
import { runBFS } from '../src/features/graph/engine/bfsEngine.js'
import { runDFS } from '../src/features/graph/engine/dfsEngine.js'
import { runUCS } from '../src/features/graph/engine/ucsEngine.js'
import { runGreedy } from '../src/features/graph/engine/greedyEngine.js'
import { runAStar } from '../src/features/graph/engine/astarEngine.js'
import { explainStep } from '../src/features/graph/engine/explanationGenerator.js'

function buildTestGraph() {
  const g = createGraph()
  g.nodes = {
    A: createNode('A', 100, 100, { label: 'A', isStart: true }),
    B: createNode('B', 200, 50, { label: 'B' }),
    C: createNode('C', 200, 150, { label: 'C' }),
    D: createNode('D', 300, 100, { label: 'D', isGoal: true }),
  }
  g.edges = {
    'A-B': createEdge('A-B', 'A', 'B', { weight: 4 }),
    'A-C': createEdge('A-C', 'A', 'C', { weight: 2 }),
    'B-D': createEdge('B-D', 'B', 'D', { weight: 5 }),
    'C-D': createEdge('C-D', 'C', 'D', { weight: 1 }),
  }
  g.startId = 'A'
  g.goalId = 'D'
  return g
}

const graph = buildTestGraph()

console.log('--- TESTING EXPLANATION GENERATOR FOR ALL 5 ALGORITHMS ---')

const testCases = [
  { id: 'BFS', engine: runBFS },
  { id: 'DFS', engine: runDFS },
  { id: 'UCS', engine: runUCS },
  { id: 'GREEDY', engine: runGreedy },
  { id: 'ASTAR', engine: runAStar },
]

for (const tc of testCases) {
  const steps = tc.engine(graph)
  console.log(`\n======================================================`)
  console.log(`=== Algorithm: ${tc.id} (${steps.length} steps) ===`)
  console.log(`======================================================`)
  
  for (const step of steps) {
    const expB = explainStep(step, tc.id, graph, 'beginner')
    const expD = explainStep(step, tc.id, graph, 'detailed')

    console.log(`\n--- Step ${step.stepIndex} (${step.action}) | Node: ${step.currentNode ?? 'N/A'} ---`)
    console.log(`[Short]: ${expB.shortExplanation}`)
    console.log(`[Beginner]: ${expB.beginnerExplanation}`)
    console.log(`[Detailed]: ${expD.detailedExplanation}`)
    console.log(`[Decision Reason]: ${expB.decisionReason}`)
    console.log(`[Calculations]:`, expB.calculationBlock)
    console.log(`[Voice]: "${expB.voiceText}"`)
    console.log(`[Why Not Others]:\n${expB.whyNotOthers.formattedText}`)
  }
}
