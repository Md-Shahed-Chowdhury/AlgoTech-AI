/**
 * ExplanationPanel.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays the enriched step explanation from explanationGenerator.js
 * and provides a voice toggle button.
 *
 * STUB — full rendering in next phase.
 */

import { useEffect } from 'react'
import { Volume2, VolumeX, BookOpen } from 'lucide-react'
import { useAlgorithmStore } from '../../store/useAlgorithmStore.js'
import { useVoiceExplanation } from '../../hooks/useVoiceExplanation.js'
import styles from './ExplanationPanel.module.css'

export default function ExplanationPanel() {
  const currentExplanation = useAlgorithmStore(s => s.explanations[s.currentStepIndex] ?? null)
  const { speak, stop, isSupported, isSpeaking, isEnabled, setEnabled } = useVoiceExplanation()

  // Auto-speak when step changes (only if voice is enabled)
  useEffect(() => {
    if (currentExplanation?.voiceText && isEnabled) {
      speak(currentExplanation.voiceText)
    }
  }, [currentExplanation, isEnabled, speak])

  if (!currentExplanation) {
    return (
      <div className={`card ${styles.panel}`}>
        <BookOpen size={18} className={styles.emptyIcon} />
        <p className={styles.empty}>Step-by-step explanations will appear here.</p>
      </div>
    )
  }

  const { concept, summary, detail, keyPoints, formula, algorithmMeta } = currentExplanation

  return (
    <div className={`card ${styles.panel}`}>
      {/* Header: concept tag + voice toggle */}
      <div className={styles.header}>
        <span
          className={styles.concept}
          style={{ color: algorithmMeta?.color, background: `${algorithmMeta?.color}18` }}
        >
          {concept}
        </span>
        {isSupported && (
          <button
            id="voice-toggle"
            className={`btn btn-ghost ${styles.voiceBtn}`}
            onClick={() => {
              if (isEnabled) { stop(); setEnabled(false) }
              else { setEnabled(true) }
            }}
            title={isEnabled ? 'Mute voice' : 'Enable voice narration'}
          >
            {isEnabled
              ? <Volume2  size={15} style={{ color: 'var(--emerald)' }} />
              : <VolumeX  size={15} />
            }
          </button>
        )}
      </div>

      {/* Summary */}
      <p className={styles.summary}>{summary}</p>

      {/* Detail */}
      <p className={styles.detail}
        dangerouslySetInnerHTML={{ __html: detail.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }}
      />

      {/* Key points */}
      {keyPoints?.length > 0 && (
        <ul className={styles.keyPoints}>
          {keyPoints.map((pt, i) => <li key={i}>{pt}</li>)}
        </ul>
      )}
    </div>
  )
}
