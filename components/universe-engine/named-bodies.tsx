"use client"

/**
 * Named bodies as scenery — slim mirror of the Universe Engine's
 * named-bodies treatment for the game.
 *
 * Three real spacecraft drift across the scene at mid-distance,
 * each on a slow looping path with a different phase offset so
 * they don't all appear at once. They never engage, can't be hit;
 * pure cinematic detail. Reads as "the solar system is busy out
 * here — humanity has been to all of these places".
 *
 * Voyager 1 — heading out of the solar system, far depth, drifts
 *   across the upper sky from left to right. Cycle: 110s.
 * JWST — at L2, foreground-mid-depth, drifts diagonally up-right.
 *   Cycle: 75s.
 * Parker Solar Probe — closer to the sun side of the frame, drifts
 *   along an arc near the sun. Cycle: 55s.
 *
 * All three rotate slowly on their own axes for liveliness.
 */

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { Group, Vector3 } from "three"
import { JWSTShape, ParkerShape, VoyagerShape } from "./spacecraft-shapes"

type DriftConfig = {
  /** Loop period in seconds. */
  cycle: number
  /** Visible portion of the cycle (0..1). The rest is offscreen. */
  visStart: number
  visEnd: number
  /** Path endpoints in scene-units. */
  from: Vector3
  to: Vector3
  /** Scale relative to the shape's unit bounding sphere. The
   *  engine renders spacecraft at ~0.2 scene-units; the game's
   *  composition wants them larger so they read as scenery
   *  rather than dust. */
  scale: number
  /** Tilt applied to the spacecraft's own group (radians). */
  rotation: [number, number, number]
  /** Optional phase offset so siblings don't all appear at the
   *  same wall-clock moment. */
  phaseOffset?: number
}

function DriftingBody({
  config,
  children,
}: {
  config: DriftConfig
  children: React.ReactNode
}) {
  const groupRef = useRef<Group>(null)

  useFrame((state, dt) => {
    if (!groupRef.current) return
    const t = ((state.clock.elapsedTime + (config.phaseOffset ?? 0)) % config.cycle) / config.cycle
    if (t < config.visStart || t > config.visEnd) {
      groupRef.current.visible = false
      return
    }
    groupRef.current.visible = true
    const u = (t - config.visStart) / (config.visEnd - config.visStart)
    // Smoothstep eases the entry + exit so the body isn't yanked
    // on/off at constant velocity.
    const eased = u * u * (3 - 2 * u)
    groupRef.current.position.lerpVectors(config.from, config.to, eased)
    // Slow rotation on own axis — gives the silhouette life as it
    // drifts across.
    groupRef.current.rotation.y += dt * 0.12
    groupRef.current.rotation.x = config.rotation[0]
    groupRef.current.rotation.z = config.rotation[2]
  })

  return (
    <group ref={groupRef} visible={false} scale={config.scale}>
      {children}
    </group>
  )
}

export function NamedBodiesDrift() {
  const voyagerConfig = useMemo<DriftConfig>(
    () => ({
      cycle: 110,
      visStart: 0.05,
      visEnd: 0.85,
      from: new Vector3(-22, 6, -18),
      to: new Vector3(22, 8, -22),
      scale: 1.4,
      rotation: [0, 0, 0.15],
    }),
    [],
  )

  const jwstConfig = useMemo<DriftConfig>(
    () => ({
      cycle: 75,
      visStart: 0.1,
      visEnd: 0.78,
      from: new Vector3(-16, -2, -6),
      to: new Vector3(18, 5, -14),
      scale: 1.6,
      rotation: [0.2, 0, -0.1],
      phaseOffset: 24,
    }),
    [],
  )

  const parkerConfig = useMemo<DriftConfig>(
    () => ({
      cycle: 55,
      visStart: 0.1,
      visEnd: 0.78,
      // Parker stays closer to the sun side of the frame. Sun is at
      // (28, 12, -32) — Parker arcs in front of it at mid-depth.
      from: new Vector3(18, 4, -12),
      to: new Vector3(34, 14, -28),
      scale: 1.3,
      rotation: [-0.1, 0, 0.05],
      phaseOffset: 12,
    }),
    [],
  )

  return (
    <>
      <DriftingBody config={voyagerConfig}>
        <VoyagerShape />
      </DriftingBody>
      <DriftingBody config={jwstConfig}>
        <JWSTShape />
      </DriftingBody>
      <DriftingBody config={parkerConfig}>
        <ParkerShape />
      </DriftingBody>
    </>
  )
}
