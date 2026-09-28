/**
 * TraversalParticle.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Animated SVG particle that travels from a parent node to a neighbor node
 * along the edge — giving a clear visual signal that the algorithm is
 * "currently evaluating this edge."
 *
 * Uses a CSS/SVG keyframe animation on a circle element that moves from
 * (x1,y1) → (x2,y2) over a fixed duration.
 */

import { useEffect, useRef } from 'react'
import { motion, useAnimation } from 'framer-motion'

/**
 * @param {{
 *   x1: number, y1: number,    // source node center
 *   x2: number, y2: number,    // target node center
 *   color?: string,
 *   duration?: number,          // ms
 * }} props
 */
export default function TraversalParticle({ x1, y1, x2, y2, color = '#a78bfa', duration = 450, delay = 0 }) {
  const controls = useAnimation()

  useEffect(() => {
    controls.set({ cx: x1, cy: y1, opacity: 0 })
    controls.start({
      cx: [x1, x2],
      cy: [y1, y2],
      opacity: [0, 1, 1, 0],
      transition: { duration: duration / 1000, delay: delay / 1000, ease: 'easeInOut' },
    })
  }, [x1, y1, x2, y2, duration, delay, controls])

  return (
    <>
      {/* Glow trail — a larger fading circle */}
      <motion.circle
        animate={controls}
        r={10}
        fill={color}
        opacity={0.18}
        style={{ pointerEvents: 'none' }}
        cx={x1}
        cy={y1}
      />
      {/* Main particle dot */}
      <motion.circle
        animate={controls}
        r={6}
        fill={color}
        style={{
          pointerEvents: 'none',
          filter: `drop-shadow(0 0 6px ${color})`,
        }}
        cx={x1}
        cy={y1}
      />
    </>
  )
}
