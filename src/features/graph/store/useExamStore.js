/**
 * useExamStore.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Zustand store for Graph Search Exam Mode ("Give Exam").
 *
 * Single Source of Truth: Uses runAlgorithm from algorithmEngine.js to generate
 * exact step sequence, then tests user node exploration choices step by step.
 */

import { create } from 'zustand'
import { ALGORITHM } from '../types/graphTypes.js'
import { createPresetGraph, validateGraph } from '../utils/graphUtils.js'
import { runAlgorithm } from '../engine/algorithmEngine.js'
import {
  generateCorrectExplanation,
  generateWrongExplanation,
  generateAlgorithmBehaviorSummary,
  generateMistakeTimeline,
  generateLearningRecommendations,
} from '../utils/examExplanation.js'
import { playSuccessSound, playErrorSound } from '../utils/soundEffects.js'

export const EXAM_STAGE = {
  BUILD:   'BUILD',   // User builds / edits graph
  EXAM:    'EXAM',    // Interactive node prediction session
  RESULTS: 'RESULTS', // Final performance dashboard
  REPLAY:  'REPLAY',  // Replay complete exam step-by-step with answers revealed
}

export const useExamStore = create((set, get) => ({
  // ── Configuration & Stage ──────────────────────────────────────────────────
  stage: EXAM_STAGE.BUILD,
  algorithmId: ALGORITHM.BFS,
  examGraph: createPresetGraph(),
  audioEnabled: true,
  showWhy: false, // "Show Why" eye toggle button

  // ── Active Exam Simulation Data ───────────────────────────────────────────
  allSteps: [],
  expansionSteps: [],     // Sub-array of algorithm steps representing node choices
  currentQuestionIndex: 0,

  // ── Question Attempts State ────────────────────────────────────────────────
  // Array of { questionIndex, step, correctNodeId, attempts: [], completed: false, firstTryCorrect: false, revealed: false }
  questionRecords: [],

  // Current answer feedback: { type: 'correct'|'wrong'|null, clickedNodeId, concise, detailed, mistakeType }
  feedback: null,

  // ── Final Results Metrics ──────────────────────────────────────────────────
  results: null,

  // ── Actions ────────────────────────────────────────────────────────────────

  setAlgorithmId: (id) => {
    const currentGraph = get().examGraph
    // Reset visual states of nodes and edges on graph
    const resetNodes = {}
    for (const [nodeId, n] of Object.entries(currentGraph?.nodes ?? {})) {
      resetNodes[nodeId] = { ...n, state: 'unexplored' }
    }
    const resetEdges = {}
    for (const [edgeId, e] of Object.entries(currentGraph?.edges ?? {})) {
      resetEdges[edgeId] = { ...e, state: 'default' }
    }

    set({
      algorithmId: id,
      examGraph: { ...currentGraph, nodes: resetNodes, edges: resetEdges },
      stage: EXAM_STAGE.BUILD,
      allSteps: [],
      expansionSteps: [],
      currentQuestionIndex: 0,
      questionRecords: [],
      feedback: null,
      results: null,
      showWhy: false,
    })
  },

  setExamGraph: (graph) => set({ examGraph: graph }),

  setStage: (stage) => set({ stage }),

  toggleAudio: () => set(state => ({ audioEnabled: !state.audioEnabled })),

  toggleShowWhy: () => set(state => ({ showWhy: !state.showWhy })),

  /**
   * Start the Exam: Validate graph, run algorithm engine, extract decision steps.
   */
  startExam: () => {
    const { algorithmId, examGraph } = get()

    // Validate graph topology
    const errors = validateGraph(examGraph)
    if (errors.length > 0) {
      alert(`Cannot start exam: ${errors.join(' ')}`)
      return false
    }

    // Single source of truth: Run exact same engine used by Learn Mode!
    const steps = runAlgorithm(algorithmId, examGraph)

    // Filter steps to find node expansion decisions (VISIT_NODE or node expansion)
    const expansionSteps = steps.filter(s => {
      const act = s.actionType || s.action || s.stepType
      return (act === 'VISIT_NODE' || (s.currentNode && !s.isInitial && act !== 'EXPLORE_NEIGHBORS'))
    })

    // Fallback if no VISIT_NODE steps (e.g. start is goal or tiny graph)
    const finalExpansionSteps = expansionSteps.length > 0 ? expansionSteps : steps.filter(s => s.currentNode)

    if (finalExpansionSteps.length === 0) {
      alert('Graph has no exploration steps to examine. Please add more nodes and edges.')
      return false
    }

    // Initialize question records
    const questionRecords = finalExpansionSteps.map((step, idx) => ({
      questionIndex: idx,
      stepIndexInAll: steps.indexOf(step),
      stepSnapshotBefore: steps[Math.max(0, steps.indexOf(step) - 1)] ?? step,
      correctNodeId: step.currentNode,
      attempts: [],       // clicked nodeIds
      completed: false,
      firstTryCorrect: false,
      revealed: false,
    }))

    set({
      stage: EXAM_STAGE.EXAM,
      allSteps: steps,
      expansionSteps: finalExpansionSteps,
      currentQuestionIndex: 0,
      questionRecords,
      feedback: null,
      results: null,
      showWhy: false,
    })

    return true
  },

  /**
   * Submit node selection answer for current question step.
   */
  submitNodeAnswer: (clickedNodeId) => {
    const {
      algorithmId,
      examGraph,
      currentQuestionIndex,
      expansionSteps,
      questionRecords,
      audioEnabled,
      allSteps,
    } = get()

    const rec = questionRecords[currentQuestionIndex]
    if (!rec || rec.completed) return

    const currentStep = expansionSteps[currentQuestionIndex]
    const stepBefore = rec.stepSnapshotBefore
    const correctNodeId = rec.correctNodeId

    const isCorrect = clickedNodeId === correctNodeId
    const isFirstAttempt = rec.attempts.length === 0

    // Record attempt
    const updatedAttempts = [...rec.attempts, clickedNodeId]

    if (isCorrect) {
      if (audioEnabled) playSuccessSound()

      const concise = generateCorrectExplanation(algorithmId, clickedNodeId, currentStep, examGraph)
      const detailed = `Node ${clickedNodeId} is indeed the next node expanded by ${algorithmId}.`

      const updatedRec = {
        ...rec,
        attempts: updatedAttempts,
        completed: true,
        firstTryCorrect: isFirstAttempt ? true : rec.firstTryCorrect,
      }

      const updatedRecords = [...questionRecords]
      updatedRecords[currentQuestionIndex] = updatedRec

      set({
        questionRecords: updatedRecords,
        feedback: {
          type: 'correct',
          clickedNodeId,
          concise,
          detailed,
        },
      })
    } else {
      if (audioEnabled) playErrorSound()

      const explanation = generateWrongExplanation(algorithmId, clickedNodeId, correctNodeId, stepBefore, examGraph)

      const updatedRec = {
        ...rec,
        attempts: updatedAttempts,
      }

      const updatedRecords = [...questionRecords]
      updatedRecords[currentQuestionIndex] = updatedRec

      set({
        questionRecords: updatedRecords,
        feedback: {
          type: 'wrong',
          clickedNodeId,
          concise: explanation.concise,
          detailed: explanation.detailed,
          mistakeType: explanation.mistakeType,
        },
      })
    }
  },

  /**
   * Reveal correct answer for current question step ("Reveal Answer" / Hint).
   */
  revealAnswer: () => {
    const {
      algorithmId,
      examGraph,
      currentQuestionIndex,
      expansionSteps,
      questionRecords,
    } = get()

    const rec = questionRecords[currentQuestionIndex]
    if (!rec || rec.completed) return

    const currentStep = expansionSteps[currentQuestionIndex]
    const correctNodeId = rec.correctNodeId

    const concise = `The correct node to explore next is ${correctNodeId}.`
    const detailed = generateCorrectExplanation(algorithmId, correctNodeId, currentStep, examGraph)

    const updatedRec = {
      ...rec,
      completed: true,
      revealed: true,
    }

    const updatedRecords = [...questionRecords]
    updatedRecords[currentQuestionIndex] = updatedRec

    set({
      questionRecords: updatedRecords,
      showWhy: true,
      feedback: {
        type: 'correct',
        clickedNodeId: correctNodeId,
        concise,
        detailed,
        isRevealed: true,
      },
    })
  },

  /**
   * Advance to next question step, or finish exam if all steps complete.
   */
  nextQuestion: () => {
    const { currentQuestionIndex, expansionSteps } = get()
    if (currentQuestionIndex < expansionSteps.length - 1) {
      set({
        currentQuestionIndex: currentQuestionIndex + 1,
        feedback: null,
        showWhy: false,
      })
    } else {
      get().finishExam()
    }
  },

  /**
   * Complete exam and calculate detailed results metrics.
   */
  finishExam: () => {
    const { questionRecords, algorithmId } = get()

    const totalQuestions = questionRecords.length
    const firstAttemptCorrect = questionRecords.filter(r => r.firstTryCorrect && !r.revealed).length
    const hintsUsed = questionRecords.filter(r => r.revealed).length
    const totalAttempts = questionRecords.reduce((sum, r) => sum + r.attempts.length, 0)
    const incorrectAttempts = totalAttempts - (totalQuestions - hintsUsed)

    const overallAccuracy = totalAttempts > 0
      ? Math.round(((totalQuestions - hintsUsed) / totalAttempts) * 100)
      : 0

    const firstAttemptAccuracy = totalQuestions > 0
      ? Math.round((firstAttemptCorrect / totalQuestions) * 100)
      : 0

    // Categorize mistakes
    const mistakeCounts = {}
    questionRecords.forEach(r => {
      r.attempts.forEach((clickedId) => {
        if (clickedId !== r.correctNodeId) {
          const exp = generateWrongExplanation(algorithmId, clickedId, r.correctNodeId, r.stepSnapshotBefore, get().examGraph)
          const mType = exp.mistakeType || 'Ordering Error'
          mistakeCounts[mType] = (mistakeCounts[mType] || 0) + 1
        }
      })
    })

    const behaviorSummary = generateAlgorithmBehaviorSummary(algorithmId, overallAccuracy)
    const mistakeTimeline = generateMistakeTimeline(questionRecords, algorithmId, get().examGraph)
    const recommendations = generateLearningRecommendations(mistakeCounts, algorithmId)

    set({
      stage: EXAM_STAGE.RESULTS,
      results: {
        totalQuestions,
        firstAttemptCorrect,
        incorrectAttempts,
        totalAttempts,
        hintsUsed,
        overallAccuracy,
        firstAttemptAccuracy,
        mistakeCounts,
        behaviorSummary,
        mistakeTimeline,
        recommendations,
      },
    })
  },

  /**
   * Start Replay Mode to step through exam decisions with revealed answers.
   */
  startReplay: () => {
    set({
      stage: EXAM_STAGE.REPLAY,
      currentQuestionIndex: 0,
      showWhy: true,
    })
  },

  /**
   * Return to Build stage to edit graph topology.
   */
  editGraphAgain: () => {
    set({
      stage: EXAM_STAGE.BUILD,
      allSteps: [],
      expansionSteps: [],
      currentQuestionIndex: 0,
      questionRecords: [],
      feedback: null,
      results: null,
    })
  },

  /**
   * Reset active exam with same graph to retake test.
   */
  retakeExam: () => {
    get().startExam()
  },
}))
