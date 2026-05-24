"use client"

/**
 * Sky points — galaxies, nebulae, star clusters at real J2000
 * coordinates. Slim mirror of the Universe Engine's deep-sky layer
 * for the game's backdrop.
 *
 * Renders each as a faint additive halo on the sky shell. The
 * BrightStarField (8,920 naked-eye stars) is the headline sky
 * layer; these are the *named* far-field landmarks behind it.
 *
 * Curated subset of the engine's catalog — the dozen most iconic
 * objects. Adding more is just appending to SKY_POINTS below.
 */

import { useMemo } from "react"
import { AdditiveBlending, Color, DoubleSide } from "three"

/** Sky-shell radius in scene-units. Matches BrightStarField so
 *  both layers share the same celestial sphere. */
const SHELL = 150

/**
 * Project celestial coordinates (J2000 RA in hours, Dec in degrees)
 * onto a sphere of the given radius around scene origin.
 *
 * Differs from the engine's version: no SUN_OFFSET_SCENE shift —
 * the game's coordinate frame is local, not galactic.
 */
function raDecToScenePos(
  raHours: number,
  decDeg: number,
  distance: number,
): [number, number, number] {
  const raRad = (raHours / 24) * 2 * Math.PI
  const decRad = decDeg * (Math.PI / 180)
  const x = distance * Math.cos(decRad) * Math.cos(raRad)
  const y = distance * Math.sin(decRad)
  const z = distance * Math.cos(decRad) * Math.sin(raRad)
  return [x, y, z]
}

type SkyPointKind = "galaxy" | "nebula" | "cluster"

type SkyPoint = {
  id: string
  name: string
  kind: SkyPointKind
  /** J2000 RA in decimal hours. */
  raHours: number
  /** J2000 Dec in decimal degrees. */
  decDeg: number
  /** Visual size on the sky shell in scene-units. */
  size: number
}

/**
 * Curated iconic deep-sky catalog. Mirrors the headline entries
 * from the portfolio engine's hand-curated set — the things a
 * casual visitor recognises ("the Andromeda galaxy") or a
 * stargazer flags as worth pointing at ("Orion Nebula").
 */
const SKY_POINTS: SkyPoint[] = [
  // Galaxies
  { id: "m31", name: "Andromeda Galaxy", kind: "galaxy", raHours: 0.712, decDeg: 41.27, size: 6.0 },
  { id: "m33", name: "Triangulum Galaxy", kind: "galaxy", raHours: 1.566, decDeg: 30.66, size: 3.8 },
  { id: "lmc", name: "Large Magellanic Cloud", kind: "galaxy", raHours: 5.393, decDeg: -69.76, size: 5.0 },
  { id: "smc", name: "Small Magellanic Cloud", kind: "galaxy", raHours: 0.878, decDeg: -72.83, size: 3.6 },
  { id: "m51", name: "Whirlpool Galaxy", kind: "galaxy", raHours: 13.498, decDeg: 47.20, size: 2.4 },
  { id: "m104", name: "Sombrero Galaxy", kind: "galaxy", raHours: 12.667, decDeg: -11.62, size: 2.2 },
  // Nebulae
  { id: "m42", name: "Orion Nebula", kind: "nebula", raHours: 5.588, decDeg: -5.39, size: 4.8 },
  { id: "m1", name: "Crab Nebula", kind: "nebula", raHours: 5.575, decDeg: 22.02, size: 2.0 },
  { id: "m57", name: "Ring Nebula", kind: "nebula", raHours: 18.892, decDeg: 33.03, size: 1.6 },
  { id: "m8", name: "Lagoon Nebula", kind: "nebula", raHours: 18.06, decDeg: -24.38, size: 3.2 },
  { id: "ngc7293", name: "Helix Nebula", kind: "nebula", raHours: 22.495, decDeg: -20.83, size: 2.4 },
  { id: "m16", name: "Eagle Nebula", kind: "nebula", raHours: 18.31, decDeg: -13.78, size: 2.6 },
  // Clusters
  { id: "m45", name: "Pleiades", kind: "cluster", raHours: 3.792, decDeg: 24.10, size: 4.0 },
  { id: "m13", name: "Hercules Globular", kind: "cluster", raHours: 16.695, decDeg: 36.46, size: 2.0 },
  { id: "m22", name: "Sagittarius Globular", kind: "cluster", raHours: 18.61, decDeg: -23.90, size: 1.8 },
]

/** Kind → halo color. Galaxies warm cream, nebulae pink/cyan, clusters bluish. */
const KIND_COLOR: Record<SkyPointKind, string> = {
  galaxy: "#e8d8b0",
  nebula: "#e87aa8",
  cluster: "#a8c8ff",
}

function SkyPointHalo({ point }: { point: SkyPoint }) {
  const pos = useMemo(
    () => raDecToScenePos(point.raHours, point.decDeg, SHELL),
    [point.raHours, point.decDeg],
  )
  const color = useMemo(() => new Color(KIND_COLOR[point.kind]), [point.kind])
  // Inner bright core + outer soft bloom. Two stacked spheres with
  // additive blending give the diffuse halo read without a shader.
  return (
    <group position={pos}>
      {/* Inner core */}
      <mesh>
        <sphereGeometry args={[point.size * 0.35, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.85}
          blending={AdditiveBlending}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      {/* Outer bloom */}
      <mesh>
        <sphereGeometry args={[point.size, 24, 24]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.18}
          blending={AdditiveBlending}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
    </group>
  )
}

export function SkyPoints() {
  return (
    <group>
      {SKY_POINTS.map((p) => (
        <SkyPointHalo key={p.id} point={p} />
      ))}
    </group>
  )
}
