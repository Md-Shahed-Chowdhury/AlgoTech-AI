/**
 * AILabBackground.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Optional Three.js visual layer rendering a subtle dark 3D particle/network
 * environment behind the application to evoke a premium AI laboratory atmosphere.
 *
 * CRITICAL DESIGN GUARANTEES:
 * 1. Does NOT touch or replace the 2D SVG graph canvas/editor.
 * 2. Purely decorative, non-interactive (pointer-events: none), z-index: -1.
 * 3. Low opacity & soft dark colors so graph readability & text are never compromised.
 * 4. Automatically simplifies/pauses on low-spec mobile devices or reduced motion.
 * 5. Isolated in its own component module; can be toggled on/off instantly.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { Sparkles } from 'lucide-react'
import { useAlgorithmStore } from '../../features/graph/store/useAlgorithmStore.js'
import { PLAYBACK } from '../../features/graph/types/graphTypes.js'
import styles from './AILabBackground.module.css'

// Helper: Generate a soft glowing circular point texture programmatically
function createCircleTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  gradient.addColorStop(0.3, 'rgba(165, 180, 252, 0.8)')
  gradient.addColorStop(0.7, 'rgba(99, 102, 241, 0.25)')
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 64, 64)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

export default function AILabBackground() {
  const containerRef = useRef(null)
  const [enabled, setEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_lab_vfx_enabled')
      return saved !== null ? JSON.parse(saved) : true
    } catch {
      return true
    }
  })

  // Watch for goal completion in graph simulation to trigger subtle visual pulse
  const playbackState = useAlgorithmStore(s => s.playbackState)
  const goalPulseRef = useRef(0) // 0 to 1 intensity factor

  useEffect(() => {
    if (playbackState === PLAYBACK.DONE) {
      goalPulseRef.current = 1.0 // Trigger pulse on completion
    }
  }, [playbackState])

  const toggleVfx = useCallback(() => {
    setEnabled(prev => {
      const next = !prev
      try {
        localStorage.setItem('ai_lab_vfx_enabled', JSON.stringify(next))
      } catch {}
      return next
    })
  }, [])

  useEffect(() => {
    if (!enabled || !containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth || window.innerWidth
    const height = container.clientHeight || window.innerHeight

    // ── Performance & Device Detection ─────────────────────────────────────
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isMobile = window.innerWidth < 768 || (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4)
    const particleCount = isMobile ? 35 : 120
    const maxConnectDist = isMobile ? 0 : 18 // Disable line connections on mobile for max FPS

    // ── Scene, Camera & Renderer ─────────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.015)

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
    camera.position.z = 42

    let renderer
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: !isMobile,
        powerPreference: 'high-performance',
      })
    } catch {
      return // WebGL not supported, gracefully exit
    }

    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 1.5))
    container.appendChild(renderer.domElement)

    // ── Particle Points setup ───────────────────────────────────────────────
    const particleTexture = createCircleTexture()
    const positions = new Float32Array(particleCount * 3)
    const velocities = new Float32Array(particleCount * 3)
    const basePositions = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount; i++) {
      const x = (Math.random() - 0.5) * 70
      const y = (Math.random() - 0.5) * 50
      const z = (Math.random() - 0.5) * 40 - 5

      positions[i * 3]     = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z

      basePositions[i * 3]     = x
      basePositions[i * 3 + 1] = y
      basePositions[i * 3 + 2] = z

      velocities[i * 3]     = (Math.random() - 0.5) * 0.02
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01
    }

    const particleGeometry = new THREE.BufferGeometry()
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const particleMaterial = new THREE.PointsMaterial({
      size: isMobile ? 1.4 : 2.2,
      map: particleTexture ?? undefined,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0x818cf8,
    })

    const pointCloud = new THREE.Points(particleGeometry, particleMaterial)
    scene.add(pointCloud)

    // ── Network Lines setup (Desktop only) ──────────────────────────────────
    let lineSegments = null
    let lineGeometry = null
    let lineMaterial = null
    const maxLines = particleCount * 6
    const linePositions = new Float32Array(maxLines * 6)

    if (maxConnectDist > 0) {
      lineGeometry = new THREE.BufferGeometry()
      lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))

      lineMaterial = new THREE.LineBasicMaterial({
        color: 0x6366f1,
        transparent: true,
        opacity: 0.14,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })

      lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial)
      scene.add(lineSegments)
    }

    // ── Parallax Mouse movement ─────────────────────────────────────────────
    let targetMouseX = 0
    let targetMouseY = 0

    const handlePointerMove = (e) => {
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2
      targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2
    }

    if (!isMobile) {
      window.addEventListener('pointermove', handlePointerMove, { passive: true })
    }

    // ── Animation Loop ──────────────────────────────────────────────────────
    let animationFrameId
    const startTime = performance.now()

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)

      const elapsedTime = (performance.now() - startTime) * 0.001

      // Goal pulse decay lerp
      if (goalPulseRef.current > 0) {
        goalPulseRef.current = Math.max(0, goalPulseRef.current - 0.015)
      }
      const pulseFactor = goalPulseRef.current

      // Parallax camera lerp
      if (!isReducedMotion && !isMobile) {
        camera.position.x += (targetMouseX * 3.5 - camera.position.x) * 0.03
        camera.position.y += (-targetMouseY * 2.5 - camera.position.y) * 0.03
        camera.lookAt(0, 0, 0)
      }

      // Update particle positions
      const posAttr = particleGeometry.attributes.position
      const speedMult = isReducedMotion ? 0.2 : 1 + pulseFactor * 2.5

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3
        positions[i3]     += (velocities[i3]     + Math.sin(elapsedTime * 0.5 + i) * 0.005) * speedMult
        positions[i3 + 1] += (velocities[i3 + 1] + Math.cos(elapsedTime * 0.4 + i) * 0.005) * speedMult
        positions[i3 + 2] += (velocities[i3 + 2] + Math.sin(elapsedTime * 0.3 + i) * 0.003) * speedMult

        // Wrap around bounds
        if (Math.abs(positions[i3])     > 45) positions[i3]     = basePositions[i3]
        if (Math.abs(positions[i3 + 1]) > 32) positions[i3 + 1] = basePositions[i3 + 1]
        if (Math.abs(positions[i3 + 2]) > 25) positions[i3 + 2] = basePositions[i3 + 2]
      }
      posAttr.needsUpdate = true

      // Update network lines
      if (lineGeometry && lineMaterial) {
        let lineVertexIdx = 0

        for (let i = 0; i < particleCount; i++) {
          for (let j = i + 1; j < particleCount; j++) {
            const dx = positions[i * 3]     - positions[j * 3]
            const dy = positions[i * 3 + 1] - positions[j * 3 + 1]
            const dz = positions[i * 3 + 2] - positions[j * 3 + 2]
            const distSq = dx * dx + dy * dy + dz * dz

            if (distSq < maxConnectDist * maxConnectDist && lineVertexIdx < maxLines * 6) {
              linePositions[lineVertexIdx++] = positions[i * 3]
              linePositions[lineVertexIdx++] = positions[i * 3 + 1]
              linePositions[lineVertexIdx++] = positions[i * 3 + 2]

              linePositions[lineVertexIdx++] = positions[j * 3]
              linePositions[lineVertexIdx++] = positions[j * 3 + 1]
              linePositions[lineVertexIdx++] = positions[j * 3 + 2]
            }
          }
        }

        lineGeometry.setDrawRange(0, lineVertexIdx / 3)
        lineGeometry.attributes.position.needsUpdate = true

        // Pulse line opacity on goal completed
        lineMaterial.opacity = 0.12 + pulseFactor * 0.35
      }

      // Rotate particle cloud subtly
      if (!isReducedMotion) {
        pointCloud.rotation.y = elapsedTime * 0.015
        if (lineSegments) lineSegments.rotation.y = elapsedTime * 0.015
      }

      renderer.render(scene, camera)
    }

    animate()

    // ── Resize Listener ─────────────────────────────────────────────────────
    const handleResize = () => {
      if (!container) return
      const w = window.innerWidth
      const h = window.innerHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    window.addEventListener('resize', handleResize)

    // ── Cleanup ─────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
      if (!isMobile) window.removeEventListener('pointermove', handlePointerMove)

      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }

      particleGeometry.dispose()
      particleMaterial.dispose()
      if (particleTexture) particleTexture.dispose()

      if (lineGeometry) lineGeometry.dispose()
      if (lineMaterial) lineMaterial.dispose()

      renderer.dispose()
    }
  }, [enabled])

  return (
    <>
      <div
        ref={containerRef}
        className={`${styles.canvasContainer} ${!enabled ? styles.disabled : ''}`}
        aria-hidden="true"
      />

      {/* Subtle toggle control pill */}
      <button
        type="button"
        onClick={toggleVfx}
        className={styles.vfxToggleBtn}
        title="Toggle Three.js AI Laboratory background VFX"
        aria-label="Toggle AI Lab VFX background"
      >
        <span className={enabled ? styles.activeDot : styles.inactiveDot} />
        <Sparkles size={13} style={{ color: enabled ? '#818cf8' : '#64748b' }} />
        <span>VFX: {enabled ? 'ON' : 'OFF'}</span>
      </button>
    </>
  )
}
