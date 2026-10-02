import { createPresetGraph } from '../src/features/graph/utils/graphUtils.js'
import { runAlgorithm } from '../src/features/graph/engine/algorithmEngine.js'
import { explainAllSteps } from '../src/features/graph/engine/explanationGenerator.js'
import { ALGORITHM } from '../src/features/graph/types/graphTypes.js'

const algos = [
  ALGORITHM.BFS,
  ALGORITHM.DFS,
  ALGORITHM.UCS,
  ALGORITHM.GREEDY,
  ALGORITHM.ASTAR,
  ALGORITHM.HILL_CLIMBING,
]

console.log('=== STARTING ALGORITHM ENGINE & VOICE TEXT AUDIT ===\n')

let allPassed = true

for (const algo of algos) {
  try {
    const graph = createPresetGraph()
    const steps = runAlgorithm(algo, graph, {})
    const explanations = explainAllSteps(steps, algo, graph)

    if (!steps || steps.length === 0) {
      console.error(`❌ [FAIL] ${algo}: No steps generated!`)
      allPassed = false
      continue
    }

    if (!explanations || explanations.length !== steps.length) {
      console.error(`❌ [FAIL] ${algo}: Explanations count (${explanations?.length}) mismatch with steps (${steps.length})!`)
      allPassed = false
      continue
    }

    let hasEmptyVoiceText = false
    steps.forEach((step, idx) => {
      const exp = explanations[idx]
      if (!exp.voiceText || typeof exp.voiceText !== 'string' || exp.voiceText.trim() === '') {
        console.error(`❌ [FAIL] ${algo} step ${idx}: Empty or invalid voiceText!`)
        hasEmptyVoiceText = true
      }
    })

    if (hasEmptyVoiceText) {
      allPassed = false
    } else {
      const firstVoice = explanations[0].voiceText.substring(0, 60)
      const lastVoice = explanations[explanations.length - 1].voiceText.substring(0, 60)
      console.log(`✅ [PASS] ${algo}: ${steps.length} steps generated cleanly.`)
      console.log(`   └─ Step 1 Voice: "${firstVoice}..."`)
      console.log(`   └─ Step ${steps.length} Voice: "${lastVoice}..."`)
    }
  } catch (err) {
    console.error(`❌ [CRASH] ${algo}:`, err)
    allPassed = false
  }
}

console.log('\n=== AUDIT SUMMARY ===')
if (allPassed) {
  console.log('🎉 ALL ALGORITHMS PASSED VOICE & STEP AUDIT SUCCESSFULLY!')
} else {
  console.error('⚠️ SOME ALGORITHMS FAILED AUDIT!')
  process.exit(1)
}
