/**
 * ComparePlayback.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * One sticky playback bar driving every algorithm's shared step clock.
 * Finish markers on the scrubber show where each algorithm reaches its end.
 */

import { SkipBack, ChevronLeft, Play, Pause, ChevronRight, SkipForward } from 'lucide-react'
import { PLAYBACK } from '../../../graph/types/graphTypes.js'
import { useCompareStore } from '../../store/useCompareStore.js'
import { ALGO_BY_ID, SPEEDS } from '../../constants.js'
import styles from './ComparePlayback.module.css'

export default function ComparePlayback() {
  const comparison = useCompareStore(s => s.comparison)
  const stepIndex = useCompareStore(s => s.stepIndex)
  const maxSteps = useCompareStore(s => s.maxSteps)
  const playbackState = useCompareStore(s => s.playbackState)
  const speed = useCompareStore(s => s.speed)
  const { seek, stepForward, stepBackward, goToFirst, goToLast, togglePlay, setSpeed, pause } = useCompareStore.getState()

  if (!comparison) return null

  const last = Math.max(0, maxSteps - 1)
  const playing = playbackState === PLAYBACK.PLAYING

  return (
    <div className={`glass ${styles.bar}`}>
      <div className={styles.buttons}>
        <IconBtn label="First step" onClick={goToFirst} disabled={stepIndex === 0}><SkipBack size={16} /></IconBtn>
        <IconBtn label="Previous step (←)" onClick={() => { pause(); stepBackward() }} disabled={stepIndex === 0}><ChevronLeft size={18} /></IconBtn>
        <button
          className={styles.playBtn}
          onClick={togglePlay}
          aria-label={playing ? 'Pause (Space)' : 'Play (Space)'}
          title={playing ? 'Pause (Space)' : 'Play (Space)'}
        >
          {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
        </button>
        <IconBtn label="Next step (→)" onClick={() => { pause(); stepForward() }} disabled={stepIndex >= last}><ChevronRight size={18} /></IconBtn>
        <IconBtn label="Last step" onClick={goToLast} disabled={stepIndex >= last}><SkipForward size={16} /></IconBtn>
      </div>

      <div className={styles.scrubber}>
        <input
          type="range"
          min={0}
          max={last}
          value={stepIndex}
          onChange={e => { pause(); seek(Number(e.target.value)) }}
          className={styles.range}
          style={{ '--pct': `${last ? (stepIndex / last) * 100 : 100}%` }}
          aria-label="Step"
        />
        {/* Finish markers: where each algorithm's search ends */}
        <div className={styles.markers} aria-hidden="true">
          {comparison.ids.map(id => {
            const end = comparison.results[id].totalSteps - 1
            return (
              <span
                key={id}
                className={styles.marker}
                style={{ left: `${last ? (end / last) * 100 : 100}%`, '--c': ALGO_BY_ID[id].color }}
                title={`${ALGO_BY_ID[id].shortName} finishes at step ${end}`}
              />
            )
          })}
        </div>
      </div>

      <span className={styles.counter}>
        Step <strong>{stepIndex}</strong> / {last}
      </span>

      <div className={styles.speeds} role="group" aria-label="Playback speed">
        {SPEEDS.map(s => (
          <button
            key={s.ms}
            className={`${styles.speedBtn} ${speed === s.ms ? styles.speedActive : ''}`}
            onClick={() => setSpeed(s.ms)}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function IconBtn({ label, onClick, disabled, children }) {
  return (
    <button className={styles.iconBtn} onClick={onClick} disabled={disabled} aria-label={label} title={label}>
      {children}
    </button>
  )
}
