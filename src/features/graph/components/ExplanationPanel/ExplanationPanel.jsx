/**
 * ExplanationPanel.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * AI Teacher Explanation Panel.
 * Explains every simulation step in clean, pedagogical language:
 *  - Beginner vs Detailed explanation level switcher
 *  - Short explanation & Action overview
 *  - Detailed pedagogical explanation
 *  - Decision reason (Why was this node selected?)
 *  - "Why not the others?" (Dynamic comparative section)
 *  - Calculation & Mathematical Breakdown (f = g + h formulas)
 *  - Voice Explanation Controls (Voice On/Off, Pause, Replay) using Web Speech API
 */

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Volume2,
  VolumeX,
  Pause,
  Play,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  Calculator,
  Compass,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Scale,
  Sparkles,
} from 'lucide-react'
import { useAlgorithmStore } from '../../store/useAlgorithmStore.js'
import { useGraphStore } from '../../store/useGraphStore.js'
import { useVoiceExplanation } from '../../hooks/useVoiceExplanation.js'
import { explainStep } from '../../engine/explanationGenerator.js'
import { ALGORITHM, ALGORITHM_META } from '../../types/graphTypes.js'
import styles from './ExplanationPanel.module.css'

function getActionBadgeInfo(step) {
  if (!step) return null
  const act = step.stepType || step.actionType || step.action
  switch (act) {
    case 'INITIALIZE':
      return { text: 'START SEARCH', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' }
    case 'INITIALIZE_GOAL':
      return { text: 'START = GOAL', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' }
    case 'VISIT_NODE':
      return { text: `VISIT NODE (${step.currentNode})`, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.18)' }
    case 'EXPLORE_NEIGHBORS':
      return { text: `EXPLORE ALL NEIGHBORS (${step.currentNode ?? step.parentNode})`, color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.18)' }
    case 'EXPAND_NODE':
      return { text: `EXPAND NODE (${step.currentNode})`, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' }
    case 'GOAL_REACHED':
      return { text: `GOAL REACHED!`, color: '#10b981', bg: 'rgba(16, 185, 129, 0.2)' }
    case 'NO_PATH':
      return { text: `NO PATH EXISTS`, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.2)' }
    case 'SKIP_VISITED':
      return { text: `SKIP VISITED NODE (${step.currentNode})`, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' }
    default:
      return { text: act, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' }
  }
}

export default function ExplanationPanel() {
  const currentStep = useAlgorithmStore(s => s.steps[s.currentStepIndex] ?? null)
  const rawExplanation = useAlgorithmStore(s => s.explanations[s.currentStepIndex] ?? null)
  const selectedAlgorithm = useAlgorithmStore(s => s.selectedAlgorithm)
  const currentStepIndex = useAlgorithmStore(s => s.currentStepIndex)
  const totalSteps = useAlgorithmStore(s => s.steps.length)
  const graph = useGraphStore(s => s.graph)

  const { speak, stop, pause, resume, isSupported, isSpeaking, isPaused, isEnabled, setEnabled } = useVoiceExplanation()

  const [level, setLevel] = useState('beginner') // 'beginner' | 'detailed'
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Dynamically generate explanation based on current step and active level
  const explanation = currentStep
    ? explainStep(currentStep, selectedAlgorithm, graph, level)
    : rawExplanation

  // Auto-speak explanation when step changes if voice is enabled
  useEffect(() => {
    if (explanation?.voiceText && isEnabled) {
      speak(explanation.voiceText)
    }
  }, [currentStepIndex, isEnabled, speak])

  const meta = ALGORITHM_META[selectedAlgorithm]
  const actionBadge = getActionBadgeInfo(currentStep)

  if (!currentStep) {
    return (
      <div className={`card ${styles.panel}`}>
        <div className={styles.emptyState}>
          <Brain size={24} className={styles.emptyIcon} />
          <p>Click "Run Search Algorithm" to begin step-by-step AI teacher narration.</p>
        </div>
      </div>
    )
  }

  const {
    currentNode,
    neighborsConsidered,
    action,
    reason,
    isInitial,
    isFinal,
    goalReached,
  } = currentStep

  const handleReplayVoice = () => {
    if (explanation?.voiceText) {
      speak(explanation.voiceText)
    }
  }

  const whyNot = explanation?.whyNotOthers
  const calcBlock = explanation?.calculationBlock ?? currentStep.calculations ?? []

  return (
    <div className={`card ${styles.panel}`}>
      {/* Header with AI Teacher Badge & Voice Controls */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <div className={styles.aiBadge}>
            <Brain size={15} />
            <span>AI Teacher</span>
          </div>
          {actionBadge && (
            <span
              className={styles.conceptTag}
              style={{
                color: actionBadge.color,
                background: actionBadge.bg,
                padding: '0.15rem 0.5rem',
                borderRadius: '4px',
                border: `1px solid ${actionBadge.color}40`,
              }}
            >
              {actionBadge.text}
            </span>
          )}
        </div>

        {/* Voice Control Buttons */}
        {isSupported && (
          <div className={styles.voiceControls}>
            <button
              className={`btn btn-ghost ${styles.voiceBtn} ${isEnabled ? styles.voiceBtnActive : ''}`}
              onClick={() => {
                if (isEnabled) {
                  stop()
                  setEnabled(false)
                } else {
                  setEnabled(true)
                  handleReplayVoice()
                }
              }}
              title={isEnabled ? 'Mute voice narration' : 'Enable voice narration'}
            >
              {isEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>

            {isEnabled && isSpeaking && (
              <button
                className={`btn btn-ghost ${styles.voiceBtn}`}
                onClick={isPaused ? resume : pause}
                title={isPaused ? 'Resume voice' : 'Pause voice'}
              >
                {isPaused ? <Play size={14} /> : <Pause size={14} />}
              </button>
            )}

            {isEnabled && (
              <button
                className={`btn btn-ghost ${styles.voiceBtn}`}
                onClick={handleReplayVoice}
                title="Replay explanation voice"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Explanation Level Switcher */}
      <div className={styles.levelToggleContainer}>
        <span className={styles.levelLabel}>Explanation Level</span>
        <div className={styles.levelToggleGroup}>
          <button
            className={`${styles.levelBtn} ${level === 'beginner' ? styles.levelBtnActive : ''}`}
            onClick={() => setLevel('beginner')}
          >
            Beginner
          </button>
          <button
            className={`${styles.levelBtn} ${level === 'detailed' ? styles.levelBtnActive : ''}`}
            onClick={() => setLevel('detailed')}
          >
            Detailed
          </button>
        </div>
      </div>

      {/* 1. What Happened? */}
      <div className={styles.section}>
        <h4 className={styles.sectionHeader}>
          <CheckCircle2 size={14} className={styles.iconHappen} /> What happened?
        </h4>
        <p className={styles.sectionBody}>
          {explanation?.shortExplanation || explanation?.summary || reason}
        </p>
      </div>

      {/* 2. Pedagogical Explanation */}
      <div className={styles.section}>
        <h4 className={styles.sectionHeader}>
          <HelpCircle size={14} className={styles.iconWhy} /> AI Teacher Explanation ({level === 'beginner' ? 'Beginner' : 'Detailed'})
        </h4>
        <p className={styles.sectionBody}>
          {explanation?.detailedExplanation || explanation?.detail || reason}
        </p>
      </div>

      {/* 3. Why was this node selected? (Decision Reason) */}
      {explanation?.decisionReason && (
        <div className={styles.section}>
          <h4 className={styles.sectionHeader}>
            <Sparkles size={14} className={styles.iconWhy} /> Decision Reason
          </h4>
          <p className={styles.sectionBody}>
            {explanation.decisionReason}
          </p>
        </div>
      )}

      {/* 4. "Why not the others?" Comparative Section */}
      {whyNot && !isInitial && !isFinal && (
        <div className={styles.section}>
          <h4 className={styles.sectionHeader}>
            <Scale size={14} className={styles.iconCompare} /> Why not the others?
          </h4>
          <div className={styles.whyNotCard}>
            <div className={styles.whyNotSelectedRow}>
              <span className={styles.whyNotSelectedBadge}>Selected: {whyNot.selected.node}</span>
              <span className={styles.whyNotSelectedVal}>{whyNot.selected.valueStr}</span>
            </div>

            {whyNot.alternatives && whyNot.alternatives.length > 0 ? (
              <div className={styles.whyNotAltList}>
                {whyNot.alternatives.map((alt, idx) => (
                  <div key={idx} className={styles.whyNotAltRow}>
                    <span className={styles.whyNotAltTitle}>Why not {alt.node}?</span>
                    <span className={styles.whyNotAltVal}>{alt.valueStr}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.whyNotAltVal}>No other candidate nodes were waiting in the frontier at this step.</p>
            )}

            <div className={styles.whyNotSummary}>
              {whyNot.summary}
            </div>
          </div>
        </div>
      )}

      {/* 5. Calculations & Mathematical Breakdown */}
      {calcBlock && calcBlock.length > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionHeader}>
            <Calculator size={14} className={styles.iconCalc} /> Calculation & Reasoning
          </h4>
          <div className={styles.calcBlock}>
            {calcBlock.map((calc, idx) => (
              <code key={idx} className={styles.calcLine}>{calc}</code>
            ))}
          </div>
        </div>
      )}

      {/* 6. What candidates were considered? */}
      {neighborsConsidered && neighborsConsidered.length > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionHeader}>
            <Compass size={14} className={styles.iconCandidates} /> Neighbors Evaluated ({neighborsConsidered.length})
          </h4>
          <div className={styles.candidatesList}>
            {neighborsConsidered.map((item, idx) => (
              <div key={idx} className={styles.candidateRow}>
                <span className={styles.candidateNode}>Neighbor {item.neighborId}</span>
                <span className={styles.candidateWeight}>(weight {item.weight})</span>
                <span className={`${styles.candidateStatus} ${styles[`status--${item.status}`]}`}>
                  {item.status.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. What happens next? */}
      <div className={styles.section}>
        <h4 className={styles.sectionHeader}>
          <ArrowRight size={14} className={styles.iconNext} /> What happens next?
        </h4>
        <p className={styles.nextText}>
          {isFinal
            ? (goalReached
              ? 'Algorithm completed! The final solution path is highlighted.'
              : (selectedAlgorithm === ALGORITHM.SIMULATED_ANNEALING ? 'The system has cooled down. Search ended without reaching the goal.' : 'Frontier is empty. Search ended without finding goal.'))
            : (selectedAlgorithm === ALGORITHM.SIMULATED_ANNEALING
              ? annealingNextText(currentStep, currentStepIndex)
              : `Step ${currentStepIndex + 2} will pop the next highest priority node from the frontier.`)
          }
        </p>
      </div>

      {/* Expandable Advanced Details */}
      <div className={styles.advancedSection}>
        <button
          className={styles.advancedToggleBtn}
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <span>Advanced Concept Details</span>
          {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={styles.advancedContent}
            >
              <p><strong>Complexity:</strong> Time {meta?.complexity?.time}, Space {meta?.complexity?.space}</p>
              <p><strong>Optimality:</strong> {meta?.weighted ? 'Guarantees shortest path in weighted graphs.' : 'Guarantees shortest path in unweighted graphs.'}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/** "What happens next?" for Simulated Annealing: a random proposal, or applying the decision. */
function annealingNextText(step, index) {
  const s = step?.algorithmSpecificState ?? {}
  if (step?.action === 'EXPLORE_NEIGHBORS') {
    return s.accepted
      ? `Step ${index + 2}: the walker moves to ${s.proposedNeighbor} at the cooler temperature T = ${s.nextTemperature}.`
      : `Step ${index + 2}: the walker stays on ${step.currentNode} at the cooler temperature T = ${s.nextTemperature}.`
  }
  return `Step ${index + 2} will propose ONE random neighbor and test it with p = e^(−ΔE/T).`
}
