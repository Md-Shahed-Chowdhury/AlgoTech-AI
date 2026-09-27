/**
 * ExamModePage.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * The Graph Search Exam Mode page.
 * Composes: GraphCanvas (readOnly) + generated questions + FeedbackPanel
 *
 * Route: /graph/exam/:algorithmId
 *
 * STUB — layout shell only, no full UI yet.
 */

import { ClipboardList, ChevronRight } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { useExamStore }      from '../../store/useExamStore.js'
import { useGraphStore }     from '../../store/useGraphStore.js'
import { ALGORITHM_META }    from '../../types/graphTypes.js'

import GraphCanvas  from '../GraphCanvas/GraphCanvas.jsx'
import FeedbackPanel from '../FeedbackPanel/FeedbackPanel.jsx'
import styles from './ExamModePage.module.css'

export default function ExamModePage() {
  const { algorithmId } = useParams()
  const meta = ALGORITHM_META[algorithmId]

  const graph          = useGraphStore(s => s.graph)
  const setExamAlgorithm = useExamStore(s => s.setExamAlgorithm)
  const setExamGraph   = useExamStore(s => s.setExamGraph)
  const generateExam   = useExamStore(s => s.generateExam)
  const questions      = useExamStore(s => s.questions)
  const userAnswers    = useExamStore(s => s.userAnswers)
  const selectAnswer   = useExamStore(s => s.selectAnswer)
  const submitExam     = useExamStore(s => s.submitExam)
  const submitted      = useExamStore(s => s.submitted)

  // Generate exam once on mount
  useEffect(() => {
    if (algorithmId) setExamAlgorithm(algorithmId)
    setExamGraph(graph)
    generateExam()
  }, [algorithmId]) // eslint-disable-line react-hooks/exhaustive-deps

  const allAnswered = questions.length > 0
    && questions.every(q => userAnswers[q.id] !== undefined)

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.pill}>
          <ClipboardList size={13} /> Exam Mode
        </div>
        <h1 className={styles.title}>
          Test Your Knowledge: <span className="gradient-text">{meta?.shortName ?? 'Graph Search'}</span>
        </h1>
        <p className={styles.sub}>
          Study the graph below, then answer each question. Submit when ready.
        </p>
      </div>

      <div className={styles.layout}>
        {/* Graph (read-only reference) */}
        <div className={styles.canvasArea}>
          <GraphCanvas width={720} height={420} readOnly />
        </div>

        {/* Questions */}
        <div className={styles.questionArea}>
          {questions.map((q, qi) => {
            const chosen = userAnswers[q.id]
            return (
              <div key={q.id} className={`card ${styles.qCard}`}>
                <p className={styles.qNum}>Question {qi + 1}</p>
                <p className={styles.qText}>{q.questionText}</p>
                <div className={styles.options}>
                  {q.options.map((opt, oi) => (
                    <button
                      key={oi}
                      id={`exam-q${qi}-opt${oi}`}
                      className={`${styles.option} ${chosen === oi ? styles.chosen : ''}`}
                      onClick={() => !submitted && selectAnswer(q.id, oi)}
                      disabled={submitted}
                    >
                      <span className={styles.optLetter}>{String.fromCharCode(65 + oi)}</span>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}

          {!submitted && (
            <button
              id="exam-submit"
              className="btn btn-primary"
              onClick={submitExam}
              disabled={!allAnswered}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Submit Exam <ChevronRight size={16} />
            </button>
          )}

          <FeedbackPanel />
        </div>
      </div>
    </div>
  )
}
