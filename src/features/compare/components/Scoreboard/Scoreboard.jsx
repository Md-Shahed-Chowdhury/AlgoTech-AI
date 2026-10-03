/**
 * Scoreboard.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Overall ranking podium + one card per evaluation criterion with a winner
 * and a horizontal score bar for every algorithm.
 */

import { motion } from 'framer-motion'
import { Timer, Target, Zap, TrendingUp, Crown } from 'lucide-react'
import { CRITERIA } from '../../engine/compareRunner.js'
import { ALGO_BY_ID, formatTime } from '../../constants.js'
import styles from './Scoreboard.module.css'

const CRITERION_ICON = { time: Timer, quality: Target, efficiency: Zap, convergence: TrendingUp }

const RAW_VALUE = {
  time:        r => formatTime(r.timeMs),
  quality:     r => (r.pathFound ? `cost ${r.realCost}${r.isOptimal ? ' · optimal' : ''}` : 'no path'),
  efficiency:  r => `${r.nodesExpanded} expanded · peak ${r.maxFrontier}`,
  convergence: r => (r.pathFound ? `${r.stepsToGoal} steps` : 'did not finish'),
}

export default function Scoreboard({ comparison }) {
  const { ids, results, verdict } = comparison
  const { scores, winners, ranking } = verdict

  return (
    <div className={styles.wrap}>
      {/* Overall ranking */}
      <section>
        <h3 className={styles.sectionTitle}>Overall ranking</h3>
        <p className={styles.sectionHint}>
          Weighted score: {CRITERIA.map(c => `${c.label} ${Math.round(c.weight * 100)}%`).join(' · ')}
        </p>
        <div className={styles.podium} style={{ '--n': ids.length }}>
          {ranking.map((id, i) => {
            const algo = ALGO_BY_ID[id]
            const r = results[id]
            return (
              <motion.div
                key={id}
                className={`${styles.place} ${i === 0 ? styles.first : ''}`}
                style={{ '--c': algo.color }}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.3 }}
              >
                <div className={styles.placeTop}>
                  <span className={styles.rank}>{i === 0 ? <Crown size={14} /> : `#${i + 1}`}</span>
                  <span className={styles.swatch} />
                  <span className={styles.placeName}>{algo.shortName}</span>
                </div>
                <div className={styles.score}>
                  {Math.round(scores[id].overall)}
                  <span className={styles.scoreMax}>/100</span>
                </div>
                <div className={styles.placeMeta}>
                  {r.pathFound ? `cost ${r.realCost} · ${r.nodesExpanded} expanded` : 'no path found'}
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Per-criterion cards */}
      <section className={styles.criteria}>
        {CRITERIA.map(c => {
          const Icon = CRITERION_ICON[c.id]
          const won = winners[c.id]
          const order = [...ids].sort((a, b) => scores[b][c.id] - scores[a][c.id])
          return (
            <article key={c.id} className={styles.criterion}>
              <header className={styles.critHead}>
                <span className={styles.critIcon}><Icon size={16} /></span>
                <div>
                  <h4 className={styles.critTitle}>{c.label}</h4>
                  <p className={styles.critHint}>{c.hint}</p>
                </div>
              </header>

              <div className={styles.winnerRow}>
                <span className={styles.winnerLabel}>Winner</span>
                {won.length === 0 ? (
                  <span className={styles.none}>none</span>
                ) : won.map(id => (
                  <span key={id} className={styles.winnerChip} style={{ '--c': ALGO_BY_ID[id].color }}>
                    {ALGO_BY_ID[id].shortName}
                  </span>
                ))}
              </div>

              <ul className={styles.bars}>
                {order.map(id => {
                  const s = scores[id][c.id]
                  return (
                    <li key={id} className={styles.barRow} title={`${ALGO_BY_ID[id].name}: score ${Math.round(s)} / 100`}>
                      <span className={styles.barLabel}>
                        <span className={styles.dot} style={{ background: ALGO_BY_ID[id].color }} />
                        {ALGO_BY_ID[id].shortName}
                      </span>
                      <span className={styles.barTrack}>
                        <motion.span
                          className={styles.barFill}
                          style={{ background: ALGO_BY_ID[id].color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(s, 1.5)}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                      </span>
                      <span className={styles.barValue}>{RAW_VALUE[c.id](results[id])}</span>
                    </li>
                  )
                })}
              </ul>
            </article>
          )
        })}
      </section>
    </div>
  )
}
