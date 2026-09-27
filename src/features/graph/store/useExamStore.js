/**
 * useExamStore.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Zustand store for Exam Mode state.
 *
 * Consumed by: ExamModePage, FeedbackPanel, QuestionPanel
 */

import { create } from 'zustand'
import { ALGORITHM } from '../types/graphTypes.js'
import { createPresetGraph } from '../utils/graphUtils.js'
import { runAlgorithm } from '../engine/algorithmEngine.js'

// ── Exam question templates ───────────────────────────────────────────────────
// Each question template is a function that receives the steps array and graph
// and returns a question object (or null if not applicable for this run).

const QUESTION_GENERATORS = [
  // Q1: What is the first node expanded?
  (steps, _graph) => {
    const firstExpand = steps.find(s => !s.isInitial && s.currentNode)
    if (!firstExpand) return null
    const correct = firstExpand.currentNode
    // Distractors: other nodes
    const others = Object.keys(_graph.nodes).filter(id => id !== correct).slice(0, 3)
    if (others.length < 3) return null
    const options = [correct, ...others].sort(() => Math.random() - 0.5)
    return {
      id:           'q-first-expanded',
      questionText: 'Which node is expanded first (after the start node)?',
      options,
      correctIndex: options.indexOf(correct),
      explanation:  `The algorithm's data structure determines expansion order. Here, ${correct} was dequeued first.`,
      relatedStep:  steps.indexOf(firstExpand),
    }
  },

  // Q2: Is the found path optimal?
  (steps, _graph) => {
    const finalStep = steps.find(s => s.isFinal && s.pathFound)
    if (!finalStep) return null
    const options = ['Yes, it is always optimal', 'No, it may not be optimal']
    return {
      id:           'q-is-optimal',
      questionText: 'Is the path found by this algorithm guaranteed to be optimal?',
      options,
      correctIndex: 0,  // will be overridden per algorithm
      explanation:  'BFS and UCS are optimal; DFS and Greedy are not; A* is optimal with admissible heuristic.',
      relatedStep:  steps.indexOf(finalStep),
    }
  },

  // Q3: How many nodes were expanded?
  (steps, _graph) => {
    const finalStep = steps.find(s => s.isFinal)
    if (!finalStep) return null
    const correct = String(finalStep.metrics.nodesExpanded)
    const distractors = [
      String(finalStep.metrics.nodesExpanded + 1),
      String(Math.max(0, finalStep.metrics.nodesExpanded - 1)),
      String(finalStep.metrics.nodesExpanded + 2),
    ]
    const options = [correct, ...distractors].sort(() => Math.random() - 0.5)
    return {
      id:           'q-nodes-expanded',
      questionText: 'How many nodes were expanded (dequeued/popped) during this run?',
      options,
      correctIndex: options.indexOf(correct),
      explanation:  `The algorithm expanded ${correct} node(s) before terminating.`,
      relatedStep:  steps.indexOf(finalStep),
    }
  },
]

// ─────────────────────────────────────────────────────────────────────────────

export const useExamStore = create((set, get) => ({
  // ── Exam configuration ─────────────────────────────────────────────────────
  examAlgorithmId: ALGORITHM.BFS,
  examGraph:       createPresetGraph(),
  examSteps:       [],

  // ── Questions ──────────────────────────────────────────────────────────────
  questions:       [],    // ExamQuestion[]
  userAnswers:     {},    // Record<questionId, selectedIndex>
  submitted:       false,
  score:           0,

  // ── Actions ────────────────────────────────────────────────────────────────

  setExamAlgorithm: (algorithmId) => set({ examAlgorithmId: algorithmId }),

  setExamGraph: (graph) => set({ examGraph: graph }),

  /**
   * Generate the exam run: run the algorithm, derive questions.
   */
  generateExam: () => {
    const { examAlgorithmId, examGraph } = get()
    const steps     = runAlgorithm(examAlgorithmId, examGraph)
    const questions = QUESTION_GENERATORS
      .map(gen => gen(steps, examGraph))
      .filter(Boolean)
      .map((q, i) => ({ ...q, algorithmId: examAlgorithmId, id: q.id ?? `q-${i}` }))

    set({
      examSteps:   steps,
      questions,
      userAnswers: {},
      submitted:   false,
      score:       0,
    })
  },

  selectAnswer: (questionId, optionIndex) => {
    set(state => ({
      userAnswers: { ...state.userAnswers, [questionId]: optionIndex },
    }))
  },

  submitExam: () => {
    const { questions, userAnswers } = get()
    const score = questions.filter(
      q => userAnswers[q.id] === q.correctIndex
    ).length
    set({ submitted: true, score })
  },

  retryExam: () => set({ userAnswers: {}, submitted: false, score: 0 }),

  fullReset: () => set({
    examSteps:   [],
    questions:   [],
    userAnswers: {},
    submitted:   false,
    score:       0,
  }),
}))
