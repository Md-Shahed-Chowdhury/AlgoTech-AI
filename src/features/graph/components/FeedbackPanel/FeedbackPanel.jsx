/**
 * FeedbackPanel.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Exam Mode only: renders per-question results after submission.
 *
 * STUB — full implementation in next phase.
 */

import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { useExamStore } from '../../store/useExamStore.js'
import styles from './FeedbackPanel.module.css'

export default function FeedbackPanel() {
  const questions  = useExamStore(s => s.questions)
  const userAnswers = useExamStore(s => s.userAnswers)
  const submitted  = useExamStore(s => s.submitted)
  const score      = useExamStore(s => s.score)
  const retryExam  = useExamStore(s => s.retryExam)

  if (!submitted) return null

  const total   = questions.length
  const pct     = total > 0 ? Math.round((score / total) * 100) : 0
  const isPerfect = score === total
  const isPass    = pct >= 60

  return (
    <div className={`card ${styles.panel}`}>
      {/* Score summary */}
      <div className={styles.scoreRow}>
        <span className={styles.score} style={{ color: isPerfect ? 'var(--emerald)' : isPass ? 'var(--accent-light)' : '#f87171' }}>
          {score} / {total}
        </span>
        <span className={styles.pct}>{pct}%</span>
        <p className={styles.verdict}>
          {isPerfect ? '🎉 Perfect!' : isPass ? '👍 Good job!' : '📚 Keep studying!'}
        </p>
      </div>

      {/* Per-question breakdown */}
      <div className={styles.breakdown}>
        {questions.map((q) => {
          const chosen  = userAnswers[q.id]
          const correct = q.correctIndex
          const isRight = chosen === correct

          return (
            <div key={q.id} className={`${styles.qResult} ${isRight ? styles.correct : styles.wrong}`}>
              <div className={styles.qResultIcon}>
                {isRight
                  ? <CheckCircle2 size={16} color="var(--emerald)" />
                  : <XCircle      size={16} color="#f87171" />
                }
              </div>
              <div className={styles.qResultBody}>
                <p className={styles.qText}>{q.questionText}</p>
                {!isRight && (
                  <p className={styles.correctAnswer}>
                    <AlertCircle size={12} /> Correct: {q.options[correct]}
                  </p>
                )}
                <p className={styles.explanation}>{q.explanation}</p>
              </div>
            </div>
          )
        })}
      </div>

      <button
        id="feedback-retry"
        className="btn btn-ghost"
        onClick={retryExam}
        style={{ width: '100%', justifyContent: 'center' }}
      >
        Try Again
      </button>
    </div>
  )
}
