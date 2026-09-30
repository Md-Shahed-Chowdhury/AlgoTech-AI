/**
 * ExamResultDashboard.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Comprehensive Exam Results Dashboard rendering rich learning metrics:
 *  - Accuracy % and First-Attempt Accuracy %
 *  - Total Steps Completed, Total Attempts, Incorrect Attempts
 *  - Hint / Reveal Usage count
 *  - Algorithm-Specific Mistake Analysis
 *  - Retake & Edit Graph call-to-actions
 */

import { motion } from 'framer-motion'
import {
  Trophy,
  Target,
  AlertTriangle,
  RotateCcw,
  Edit3,
  BookOpen,
  HelpCircle,
  BarChart2,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from 'lucide-react'
import { ALGORITHM_META } from '../../types/graphTypes.js'
import styles from './ExamModePage.module.css'

export default function ExamResultDashboard({
  results,
  algorithmId,
  onRetake,
  onEditGraph,
  onBackToLearn,
}) {
  const meta = ALGORITHM_META[algorithmId] ?? { shortName: algorithmId, color: '#8b5cf6' }

  if (!results) return null

  const {
    totalQuestions,
    firstAttemptCorrect,
    incorrectAttempts,
    totalAttempts,
    hintsUsed,
    overallAccuracy,
    firstAttemptAccuracy,
    mistakeCounts = {},
  } = results

  const isMastery = overallAccuracy >= 85
  const isGood = overallAccuracy >= 70 && overallAccuracy < 85

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={styles.dashboardContainer}
    >
      {/* Banner */}
      <div className={styles.dashboardBanner} style={{
        borderColor: isMastery ? '#10b981' : isGood ? '#6366f1' : '#f59e0b',
        background: isMastery
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(15, 23, 42, 0.6))'
          : 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(15, 23, 42, 0.6))'
      }}>
        <div className={styles.bannerHeader}>
          <div className={styles.trophyCircle} style={{
            background: isMastery ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)',
            color: isMastery ? '#10b981' : '#6366f1'
          }}>
            <Trophy size={28} />
          </div>
          <div>
            <h2 className={styles.bannerTitle}>
              {meta.shortName} Exam Completed!
            </h2>
            <p className={styles.bannerSub}>
              {isMastery
                ? 'Outstanding performance! You have mastered node exploration for this algorithm.'
                : isGood
                ? 'Great job! Review the mistakes breakdown below to polish your knowledge.'
                : 'Keep practicing! Check the algorithm-specific mistakes below to improve.'}
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className={styles.metricsGrid}>
        {/* Overall Accuracy */}
        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
            <Target size={20} />
          </div>
          <div>
            <span className={styles.metricLabel}>Overall Accuracy</span>
            <div className={styles.metricValue}>{overallAccuracy}%</div>
            <span className={styles.metricDesc}>
              {totalQuestions - hintsUsed} correct out of {totalAttempts} attempts
            </span>
          </div>
        </div>

        {/* First-Attempt Accuracy */}
        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className={styles.metricLabel}>First-Attempt Accuracy</span>
            <div className={styles.metricValue}>{firstAttemptAccuracy}%</div>
            <span className={styles.metricDesc}>
              {firstAttemptCorrect} of {totalQuestions} steps correct on 1st click
            </span>
          </div>
        </div>

        {/* Total Steps & Attempts */}
        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            <BarChart2 size={20} />
          </div>
          <div>
            <span className={styles.metricLabel}>Steps Completed</span>
            <div className={styles.metricValue}>{totalQuestions}</div>
            <span className={styles.metricDesc}>
              Total attempts: {totalAttempts} ({incorrectAttempts} retries)
            </span>
          </div>
        </div>

        {/* Hints Used */}
        <div className={styles.metricCard}>
          <div className={styles.metricIcon} style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <HelpCircle size={20} />
          </div>
          <div>
            <span className={styles.metricLabel}>Hints / Reveals Used</span>
            <div className={styles.metricValue}>{hintsUsed}</div>
            <span className={styles.metricDesc}>
              {hintsUsed === 0 ? 'No hints requested! Pure prediction!' : `${hintsUsed} steps revealed`}
            </span>
          </div>
        </div>
      </div>

      {/* Algorithm-Specific Mistakes Breakdown */}
      <div className={styles.mistakesSection}>
        <h3 className={styles.mistakesTitle}>
          <AlertTriangle size={16} /> Algorithm-Specific Mistakes Analysis
        </h3>
        {Object.keys(mistakeCounts).length === 0 ? (
          <div className={styles.noMistakesCard}>
            <CheckCircle2 size={22} color="#10b981" />
            <span>Perfect Run! Zero rule violations recorded during this exam session.</span>
          </div>
        ) : (
          <div className={styles.mistakesList}>
            {Object.entries(mistakeCounts).map(([type, count]) => (
              <div key={type} className={styles.mistakeRow}>
                <div className={styles.mistakeBadge}>
                  <XCircle size={14} color="#f43f5e" />
                  <span className={styles.mistakeTypeName}>{type}</span>
                </div>
                <span className={styles.mistakeCount}>{count} {count === 1 ? 'time' : 'times'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className={styles.dashboardActions}>
        <button className="btn btn-primary" onClick={onRetake}>
          <RotateCcw size={16} /> Retake Exam (Same Graph)
        </button>
        <button className="btn btn-secondary" onClick={onEditGraph}>
          <Edit3 size={16} /> Edit Graph & Retake
        </button>
        <button className="btn btn-secondary" onClick={onBackToLearn}>
          <BookOpen size={16} /> Return to Learn Mode
        </button>
      </div>
    </motion.div>
  )
}
