import { useState } from 'react'
import { ClipboardList, CheckCircle2, XCircle, ChevronRight } from 'lucide-react'
import styles from './TestPage.module.css'

const QUESTIONS = [
  {
    q: 'What is the worst-case time complexity of Bubble Sort?',
    options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'],
    answer: 2,
  },
  {
    q: 'Which data structure does BFS use?',
    options: ['Stack', 'Queue', 'Heap', 'Tree'],
    answer: 1,
  },
  {
    q: 'Binary Search requires the array to be:',
    options: ['Unsorted', 'Sorted', 'Reversed', 'Empty'],
    answer: 1,
  },
]

export default function TestPage() {
  const [selected, setSelected] = useState({})
  const [submitted, setSubmitted] = useState(false)

  const score = submitted
    ? QUESTIONS.filter((q, i) => selected[i] === q.answer).length
    : 0

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.pill}>
          <ClipboardList size={13} /> Quiz Mode
        </div>
        <h1 className={styles.title}>
          Test Your <span className="gradient-text">Knowledge</span>
        </h1>
        <p className={styles.sub}>Answer the questions below, then submit to see your score.</p>
      </div>

      <div className={styles.questions}>
        {QUESTIONS.map((item, qi) => (
          <div key={qi} className={`card ${styles.qCard}`}>
            <p className={styles.qNum}>Question {qi + 1}</p>
            <p className={styles.qText}>{item.q}</p>
            <div className={styles.options}>
              {item.options.map((opt, oi) => {
                const chosen = selected[qi] === oi
                const correct = submitted && oi === item.answer
                const wrong   = submitted && chosen && oi !== item.answer
                return (
                  <button
                    key={oi}
                    onClick={() => !submitted && setSelected(s => ({ ...s, [qi]: oi }))}
                    className={`${styles.option}
                      ${chosen && !submitted ? styles.chosen : ''}
                      ${correct ? styles.correct : ''}
                      ${wrong ? styles.wrong : ''}`}
                  >
                    <span className={styles.optLetter}>{String.fromCharCode(65 + oi)}</span>
                    {opt}
                    {correct && <CheckCircle2 size={16} className={styles.optIcon} />}
                    {wrong   && <XCircle     size={16} className={styles.optIcon} />}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {!submitted ? (
        <button
          className={`btn btn-primary ${styles.submitBtn}`}
          onClick={() => setSubmitted(true)}
          disabled={Object.keys(selected).length < QUESTIONS.length}
        >
          Submit Quiz <ChevronRight size={16} />
        </button>
      ) : (
        <div className={`card ${styles.result}`}>
          <p className={styles.resultScore}>
            {score} / {QUESTIONS.length}
          </p>
          <p className={styles.resultMsg}>
            {score === QUESTIONS.length ? '🎉 Perfect score!' : score >= 2 ? '👍 Good job!' : '📚 Keep studying!'}
          </p>
          <button
            className={`btn btn-ghost ${styles.retryBtn}`}
            onClick={() => { setSelected({}); setSubmitted(false) }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}
