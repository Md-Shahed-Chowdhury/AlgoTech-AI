/**
 * PlaybackControls.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Transport bar: Step Back / Play / Pause / Step Forward / Speed Slider / Scrubber
 *
 * STUB — full implementation in next phase.
 */

import {
  SkipBack, ChevronLeft, Play, Pause, ChevronRight, SkipForward,
} from 'lucide-react'
import { useAlgorithmStore } from '../../store/useAlgorithmStore.js'
import { PLAYBACK } from '../../types/graphTypes.js'
import styles from './PlaybackControls.module.css'

const SPEEDS = [
  { label: '0.5×', ms: 1200 },
  { label: '1×',   ms: 600  },
  { label: '2×',   ms: 300  },
  { label: '4×',   ms: 100  },
]

export default function PlaybackControls() {
  const currentStepIndex = useAlgorithmStore(s => s.currentStepIndex)
  const totalSteps       = useAlgorithmStore(s => s.steps.length)
  const playbackState    = useAlgorithmStore(s => s.playbackState)
  const playbackSpeed    = useAlgorithmStore(s => s.playbackSpeed)

  const play          = useAlgorithmStore(s => s.play)
  const pause         = useAlgorithmStore(s => s.pause)
  const stepForward   = useAlgorithmStore(s => s.stepForward)
  const stepBackward  = useAlgorithmStore(s => s.stepBackward)
  const goToFirst     = useAlgorithmStore(s => s.goToFirst)
  const goToLast      = useAlgorithmStore(s => s.goToLast)
  const goToStep      = useAlgorithmStore(s => s.goToStep)
  const setPlaybackSpeed = useAlgorithmStore(s => s.setPlaybackSpeed)

  const isPlaying = playbackState === PLAYBACK.PLAYING
  const disabled  = totalSteps === 0

  return (
    <div className={styles.controls}>
      {/* Transport buttons */}
      <div className={styles.transport}>
        <button
          id="play-first"
          className="btn btn-ghost"
          onClick={goToFirst}
          disabled={disabled || currentStepIndex === 0}
          title="First step"
        >
          <SkipBack size={15} />
        </button>

        <button
          id="play-back"
          className="btn btn-ghost"
          onClick={stepBackward}
          disabled={disabled || currentStepIndex === 0}
          title="Previous step"
        >
          <ChevronLeft size={15} />
        </button>

        <button
          id="play-pause"
          className={`btn btn-primary ${styles.playBtn}`}
          onClick={isPlaying ? pause : play}
          disabled={disabled}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <button
          id="play-forward"
          className="btn btn-ghost"
          onClick={stepForward}
          disabled={disabled || currentStepIndex >= totalSteps - 1}
          title="Next step"
        >
          <ChevronRight size={15} />
        </button>

        <button
          id="play-last"
          className="btn btn-ghost"
          onClick={goToLast}
          disabled={disabled || currentStepIndex >= totalSteps - 1}
          title="Last step"
        >
          <SkipForward size={15} />
        </button>
      </div>

      {/* Scrubber */}
      <div className={styles.scrubberRow}>
        <input
          id="play-scrubber"
          type="range"
          className={styles.scrubber}
          min={0}
          max={Math.max(0, totalSteps - 1)}
          value={currentStepIndex}
          onChange={e => goToStep(Number(e.target.value))}
          disabled={disabled}
        />
        <span className={styles.stepLabel}>
          {disabled ? '—' : `${currentStepIndex + 1} / ${totalSteps}`}
        </span>
      </div>

      {/* Speed selector */}
      <div className={styles.speeds}>
        {SPEEDS.map(({ label, ms }) => (
          <button
            key={ms}
            className={`${styles.speedBtn} ${playbackSpeed === ms ? styles.speedActive : ''}`}
            onClick={() => setPlaybackSpeed(ms)}
            title={`Playback speed ${label}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
