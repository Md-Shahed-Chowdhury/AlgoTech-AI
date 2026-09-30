/**
 * ExamResultDashboard.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Comprehensive Exam Results and Learning Analysis Dashboard:
 *  1. Overall Performance Cards (Accuracy %, 1st-Attempt Accuracy %, Correct/Wrong counts, Steps)
 *  2. Algorithm Behavior Summary (Explains demonstrated concepts: FIFO queue, LIFO stack, g(n), h(n), f(n))
 *  3. Mistake Timeline (Chronological predictions breakdown with node cost comparisons)
 *  4. Deterministic Learning Recommendations (Personalized feedback based on mistake patterns)
 *  5. Replay Exam call-to-action
 *  6. Retake / Edit Graph action buttons
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
  PlayCircle,
  Lightbulb,
  Clock,
  Compass,
  Calculator,
} from 'lucide-react'
import { ALGORITHM_META } from '../../types/graphTypes.js'
import styles from './ExamModePage.module.css'

export default function ExamResultDashboard({
  results,
  algorithmId,
  onRetake,
  onEditGraph,
  onReplay,
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
    behaviorSummary,
    mistakeTimeline = [],
    recommendations = [],
  } = results

  const isMastery = overallAccuracy >= 85
  const isGood = overallAccuracy >= 70 && overallAccuracy < 85

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={styles.dashboardContainer}
    >
      {/* ── 1. Top Banner ──────────────────────────────────────────────────── */}
      <div
        className={styles.dashboardBanner}
        style={{
          borderColor: isMastery ? '#10b981' : isGood ? '#6366f1' : '#f59e0b',
          background: isMastery
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.14), rgba(15, 23, 42, 0.8))'
            : 'linear-gradient(135deg, rgba(99, 102, 241, 0.14), rgba(15, 23, 42, 0.8))',
        }}
      >
        <div className={styles.bannerHeader}>
          <div
            className={styles.trophyCircle}
            style={{
              background: isMastery ? 'rgba(16, 185, 129, 0.22)' : 'rgba(99, 102, 241, 0.22)',
              color: isMastery ? '#10b981' : '#6366f1',
            }}
          >
            <Trophy size={30} />
          </div>
          <div>
            <h2 className={styles.bannerTitle}>
              {meta.shortName} Exam Results & Analysis
            </h2>
            <p className={styles.bannerSub}>
              {isMastery
                ? 'Outstanding mastery! You predicted node exploration choices with high accuracy.'
                : isGood
                ? 'Great job! Review the mistake timeline and recommendations below to perfect your understanding.'
                : 'Keep practicing! Review the step-by-step breakdown below to strengthen your grasp of the algorithm rules.'}
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. Overall Performance Metrics ─────────────────────────────────── */}
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

        {/* Total Steps Completed */}
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

        {/* Hints / Reveals Used */}
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

      {/* ── 3. Algorithm Behavior Summary ─────────────────────────────────── */}
      {behaviorSummary && (
        <div className={styles.behaviorSection}>
          <h3 className={styles.sectionHeaderTitle}>
            <Compass size={16} color={meta.color} /> Algorithm Behavior Summary: {behaviorSummary.conceptTitle}
          </h3>
          <p className={styles.behaviorText}>{behaviorSummary.description}</p>
        </div>
      )}

      {/* ── 4. Mistake Timeline ────────────────────────────────────────────── */}
      <div className={styles.mistakesSection}>
        <h3 className={styles.sectionHeaderTitle}>
          <Clock size={16} color="#f43f5e" /> Chronological Mistake Timeline
        </h3>

        {mistakeTimeline.length === 0 ? (
          <div className={styles.noMistakesCard}>
            <CheckCircle2 size={22} color="#10b981" />
            <span>Flawless Exam Run! Zero prediction mistakes recorded.</span>
          </div>
        ) : (
          <div className={styles.timelineList}>
            {mistakeTimeline.map((item, idx) => (
              <div key={idx} className={styles.timelineCard}>
                <div className={styles.timelineHeader}>
                  <span className={styles.timelineStepBadge}>Step {item.stepNumber}</span>
                  <span className={styles.timelineMistakeTag}>{item.mistakeType}</span>
                </div>

                <div className={styles.timelineChoicesRow}>
                  <div className={styles.choiceChipWrong}>
                    <span>User Selected:</span>
                    <strong>Node {item.userSelected}</strong>
                  </div>

                  <ArrowRight size={14} className={styles.choiceArrow} />

                  <div className={styles.choiceChipCorrect}>
                    <span>Correct Node:</span>
                    <strong>Node {item.correctNode}</strong>
                  </div>
                </div>

                <p className={styles.timelineReasonText}>{item.conciseReason}</p>

                {/* Mathematical Cost Comparison Card (UCS / GREEDY / ASTAR) */}
                {item.costComparison && (
                  <div className={styles.costComparisonCard}>
                    <div className={styles.costCompTitle}>
                      <Calculator size={12} /> Numerical Cost Comparison:
                    </div>
                    <div className={styles.costCompGrid}>
                      <div className={styles.costCompColWrong}>
                        <span>Selected ({item.costComparison.clicked.node}):</span>
                        <code>
                          g={item.costComparison.clicked.g}, h={item.costComparison.clicked.h}, f={item.costComparison.clicked.f}
                        </code>
                      </div>
                      <div className={styles.costCompColCorrect}>
                        <span>Correct ({item.costComparison.correct.node}):</span>
                        <code>
                          g={item.costComparison.correct.g}, h={item.costComparison.correct.h}, f={item.costComparison.correct.f}
                        </code>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 5. Personalized Learning Recommendations ─────────────────────── */}
      <div className={styles.recommendationsSection}>
        <h3 className={styles.sectionHeaderTitle}>
          <Lightbulb size={16} color="#f59e0b" /> Targeted Learning Recommendations
        </h3>
        <div className={styles.recList}>
          {recommendations.map((rec, i) => (
            <div key={i} className={styles.recCard}>
              <p className={styles.recText}>{rec}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 6. Action Buttons (Replay, Retake, Edit Graph, Back to Learn) ───── */}
      <div className={styles.dashboardActions}>
        <button className="btn btn-primary" onClick={onReplay}>
          <PlayCircle size={16} /> Replay Exam Step-by-Step
        </button>
        <button className="btn btn-secondary" onClick={onRetake}>
          <RotateCcw size={16} /> Retake Exam (Same Graph)
        </button>
        <button className="btn btn-secondary" onClick={onEditGraph}>
          <Edit3 size={16} /> Edit Graph & Retake
        </button>
        <button className="btn btn-ghost" onClick={onBackToLearn}>
          <BookOpen size={16} /> Return to Learn Mode
        </button>
      </div>
    </motion.div>
  )
}
