/**
 * ExamModePage.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * The Graph Search "Give Exam" Mode page.
 *
 * Flow:
 *  1. User selects algorithm and builds custom graph (BUILD stage).
 *  2. User clicks "Start Exam" -> algorithm runs internally (single source of truth).
 *  3. User predicts which node algorithm explores next by clicking nodes on canvas.
 *  4. Evaluates correct/wrong answer with subtle visual glow, sound, and explanations.
 *  5. "Show Why" eye toggle button shows/hides detailed breakdown.
 *  6. Real-time ExamStatePanel tracks step progress, queue/stack/PQ, sets.
 *  7. Final ExamResultDashboard metrics & mistake analysis.
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardList,
  Play,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  ChevronRight,
  RotateCcw,
  Edit3,
  BookOpen,
  HelpCircle,
  Zap,
} from 'lucide-react'

import { useExamStore, EXAM_STAGE } from '../../store/useExamStore.js'
import { useGraphStore } from '../../store/useGraphStore.js'
import { ALGORITHM, ALGORITHM_META } from '../../types/graphTypes.js'

import GraphBuilder from '../GraphBuilder/GraphBuilder.jsx'
import GraphCanvas from '../GraphCanvas/GraphCanvas.jsx'
import ExamStatePanel from './ExamStatePanel.jsx'
import ExamResultDashboard from './ExamResultDashboard.jsx'
import styles from './ExamModePage.module.css'

export default function ExamModePage() {
  const { algorithmId: routeAlgoId } = useParams()
  const navigate = useNavigate()

  // Store state
  const stage = useExamStore(s => s.stage)
  const algorithmId = useExamStore(s => s.algorithmId)
  const setAlgorithmId = useExamStore(s => s.setAlgorithmId)
  const examGraph = useExamStore(s => s.examGraph)
  const setExamGraph = useExamStore(s => s.setExamGraph)
  const audioEnabled = useExamStore(s => s.audioEnabled)
  const toggleAudio = useExamStore(s => s.toggleAudio)
  const showWhy = useExamStore(s => s.showWhy)
  const toggleShowWhy = useExamStore(s => s.toggleShowWhy)

  const startExam = useExamStore(s => s.startExam)
  const submitNodeAnswer = useExamStore(s => s.submitNodeAnswer)
  const revealAnswer = useExamStore(s => s.revealAnswer)
  const nextQuestion = useExamStore(s => s.nextQuestion)
  const editGraphAgain = useExamStore(s => s.editGraphAgain)
  const retakeExam = useExamStore(s => s.retakeExam)

  const expansionSteps = useExamStore(s => s.expansionSteps)
  const currentQuestionIndex = useExamStore(s => s.currentQuestionIndex)
  const questionRecords = useExamStore(s => s.questionRecords)
  const feedback = useExamStore(s => s.feedback)
  const results = useExamStore(s => s.results)

  // Sync graph store into exam store on mount or builder edit
  const mainGraph = useGraphStore(s => s.graph)

  useEffect(() => {
    if (routeAlgoId && Object.values(ALGORITHM).includes(routeAlgoId)) {
      setAlgorithmId(routeAlgoId)
    }
  }, [routeAlgoId, setAlgorithmId])

  useEffect(() => {
    if (stage === EXAM_STAGE.BUILD) {
      setExamGraph(mainGraph)
    }
  }, [mainGraph, stage, setExamGraph])

  const meta = ALGORITHM_META[algorithmId] ?? { name: algorithmId, shortName: algorithmId, color: '#8b5cf6' }

  // Current active step snapshot for canvas display
  const currentRecord = questionRecords[currentQuestionIndex] ?? null
  const activeStepForCanvas = currentRecord ? currentRecord.stepSnapshotBefore : null

  // Node click handler during exam
  const handleCanvasNodeClick = (nodeId) => {
    if (stage === EXAM_STAGE.EXAM) {
      submitNodeAnswer(nodeId)
    }
  }

  return (
    <div className={styles.page}>
      {/* Header & Top Bar */}
      <div className={styles.header}>
        <div className={styles.topBar}>
          <div className={styles.titleArea}>
            <div className={styles.badgePill}>
              <ClipboardList size={14} /> Exam Mode
            </div>
            <h1 className={styles.title}>
              Graph Search Exam: <span style={{ color: meta.color }}>{meta.shortName}</span>
            </h1>
          </div>

          {/* Algorithm Selector Row */}
          <div className={styles.algoSelectRow}>
            {Object.values(ALGORITHM).map(algo => (
              <button
                key={algo}
                className={`${styles.algoBtn} ${algorithmId === algo ? styles.algoBtnActive : ''}`}
                onClick={() => {
                  setAlgorithmId(algo)
                  navigate(`/graph/exam/${algo}`, { replace: true })
                }}
              >
                {ALGORITHM_META[algo]?.shortName}
              </button>
            ))}

            <button
              className={styles.eyeToggleBtn}
              onClick={toggleAudio}
              title={audioEnabled ? 'Mute Sound' : 'Enable Sound'}
            >
              {audioEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>
          </div>
        </div>

        {/* Stepper indicator */}
        <div className={styles.stageStepper}>
          <span className={`${styles.stepPill} ${stage === EXAM_STAGE.BUILD ? styles.stepPillActive : ''}`}>
            1. Build / Edit Graph
          </span>
          <ChevronRight size={14} color="var(--text-muted)" />
          <span className={`${styles.stepPill} ${stage === EXAM_STAGE.EXAM ? styles.stepPillActive : ''}`}>
            2. Predict Node Expansion
          </span>
          <ChevronRight size={14} color="var(--text-muted)" />
          <span className={`${styles.stepPill} ${stage === EXAM_STAGE.RESULTS ? styles.stepPillActive : ''}`}>
            3. Results Dashboard
          </span>
        </div>
      </div>

      {/* ── STAGE 1: BUILD GRAPH ────────────────────────────────────────────── */}
      {stage === EXAM_STAGE.BUILD && (
        <div className={styles.buildContainer}>
          <GraphBuilder showStatsPanel={false} />

          <div className={styles.buildInstructions}>
            <div className={styles.instructionText}>
              💡 <strong>Build your graph below</strong> (add nodes, set names, add weighted edges, assign start/goal node). For <strong>Greedy & A*</strong>, double-click nodes to set custom <strong>H(n)</strong> heuristic values!
            </div>
            <button className={`btn btn-primary ${styles.startExamBtn}`} onClick={startExam}>
              <Play size={16} /> Start Exam
            </button>
          </div>

          <div className={styles.canvasCard}>
            <GraphCanvas width={1100} height={520} />
          </div>
        </div>
      )}

      {/* ── STAGE 2: INTERACTIVE EXAM SESSION ───────────────────────────────── */}
      {stage === EXAM_STAGE.EXAM && (
        <div className={styles.examLayout}>
          {/* Left Column: Interactive Canvas */}
          <div className={styles.canvasColumn}>
            <div className={styles.canvasInstructionBanner}>
              <span>🎯 Click the node on the canvas that <strong>{meta.shortName}</strong> will explore next.</span>
              <button
                className="btn btn-secondary"
                onClick={editGraphAgain}
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
              >
                <Edit3 size={13} /> Edit Graph
              </button>
            </div>

            <div className={styles.canvasCard}>
              <GraphCanvas
                width={780}
                height={520}
                readOnly
                onNodeClick={handleCanvasNodeClick}
                activeStep={activeStepForCanvas}
                feedbackNodeId={feedback?.clickedNodeId}
                feedbackType={feedback?.type}
              />
            </div>
          </div>

          {/* Right Column: Question Prompt & Exam State Tracker */}
          <div className={styles.sideColumn}>
            {/* Question Prompt Card */}
            <div className={styles.promptCard}>
              <div className={styles.promptHeader}>
                <span className={styles.questionBadge}>
                  Question {currentQuestionIndex + 1} of {expansionSteps.length}
                </span>

                {/* Eye "Show Why" toggle button */}
                <button
                  className={`${styles.eyeToggleBtn} ${showWhy ? styles.eyeToggleActive : ''}`}
                  onClick={toggleShowWhy}
                  title="Toggle Detailed Explanation & State Calculations"
                >
                  {showWhy ? <Eye size={14} /> : <EyeOff size={14} />}
                  <span>{showWhy ? 'Hide Why' : 'Show Why'}</span>
                </button>
              </div>

              <h3 className={styles.promptText}>
                Which node should {meta.shortName} explore next?
              </h3>

              {/* Feedback Banner (Correct / Wrong) */}
              <AnimatePresence mode="wait">
                {feedback && (
                  <motion.div
                    key={`${currentQuestionIndex}-${feedback.clickedNodeId}-${feedback.type}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className={`${styles.feedbackBanner} ${
                      feedback.type === 'correct' ? styles.feedbackCorrect : styles.feedbackWrong
                    }`}
                  >
                    <div className={styles.feedbackTitleRow}>
                      {feedback.type === 'correct' ? (
                        <>
                          <CheckCircle2 size={16} />
                          <span>Correct Answer!</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={16} />
                          <span>Not Quite</span>
                        </>
                      )}
                    </div>

                    <p className={styles.feedbackMessage}>{feedback.concise}</p>

                    {/* Detailed "Show Why" explanation box */}
                    {showWhy && (
                      <div className={styles.detailedReasonBox}>
                        {feedback.detailed}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Prompt Action Buttons */}
              <div className={styles.promptActions}>
                {feedback?.type === 'correct' || currentRecord?.completed ? (
                  <button
                    className="btn btn-primary"
                    onClick={nextQuestion}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    {currentQuestionIndex < expansionSteps.length - 1 ? 'Next Question →' : 'View Exam Results Dashboard →'}
                  </button>
                ) : (
                  <>
                    <button
                      className="btn btn-secondary"
                      onClick={revealAnswer}
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                      title="Reveal answer (marks hint used)"
                    >
                      <HelpCircle size={14} /> Reveal Answer
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Real-time Exam State Tracker Panel */}
            <ExamStatePanel
              step={activeStepForCanvas}
              algorithmId={algorithmId}
              currentQuestionIndex={currentQuestionIndex}
              totalQuestions={expansionSteps.length}
              graph={examGraph}
            />
          </div>
        </div>
      )}

      {/* ── STAGE 3: RESULTS DASHBOARD ────────────────────────────────────── */}
      {stage === EXAM_STAGE.RESULTS && (
        <ExamResultDashboard
          results={results}
          algorithmId={algorithmId}
          onRetake={retakeExam}
          onEditGraph={editGraphAgain}
          onBackToLearn={() => navigate(`/graph/learn/${algorithmId}`)}
        />
      )}
    </div>
  )
}
