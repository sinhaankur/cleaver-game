"use client"

/**
 * Spacecraft procedural shapes — slim mirror of the Universe Engine.
 *
 * Each silhouette is composed from R3F primitives — no model loads,
 * no textures, no IP. One dominant feature identifies each from any
 * angle (Voyager's dish, JWST's sunshield, Parker's heat shield).
 *
 * Game-only build: dropped the invert/chart mode (game is always
 * dark), trimmed the registry to three iconic craft.
 */

import { DoubleSide, PlaneGeometry } from "three"

/* ---------- Shared palette (dark mode only) ---------- */

const palette = {
  body: "#e2e6ec",
  dish: "#f4ede0",
  panel: "#1a3e6b",
  panelGlint: "#5f86b8",
  shield: "#fff5d6",
  rtg: "#b25c2a",
  boom: "#9aa1ad",
}

/* ============================================================
 * Voyager — high-gain dish + magnetometer boom + RTG cluster.
 * The dish is huge relative to the bus, and the magnetometer
 * boom is much longer than the spacecraft is wide. Both must
 * be true for the silhouette to read as Voyager.
 * ============================================================ */
export function VoyagerShape() {
  const c = palette
  return (
    <group>
      <group rotation={[0.25, 0, 0]} position={[0, 0.3, 0]}>
        <mesh>
          <cylinderGeometry args={[0.45, 0.45, 0.012, 32]} />
          <meshStandardMaterial color={c.dish} side={DoubleSide} roughness={0.5} metalness={0.25} />
        </mesh>
        <mesh position={[0, -0.06, 0]}>
          <coneGeometry args={[0.45, 0.1, 24, 1, true]} />
          <meshStandardMaterial color={c.dish} side={DoubleSide} roughness={0.5} metalness={0.25} />
        </mesh>
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.06, 12]} />
          <meshStandardMaterial color={c.body} />
        </mesh>
      </group>
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.18, 8]} />
        <meshStandardMaterial color={c.boom} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.12, 10]} />
        <meshStandardMaterial color={c.body} metalness={0.35} roughness={0.45} />
      </mesh>
      <mesh position={[0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.006, 0.006, 0.85, 6]} />
        <meshStandardMaterial color={c.boom} />
      </mesh>
      <mesh position={[-0.22, -0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.01, 0.01, 0.3, 6]} />
        <meshStandardMaterial color={c.boom} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[-0.36 - i * 0.04, -0.02, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.07, 8]} />
          <meshStandardMaterial color={c.rtg} emissive={c.rtg} emissiveIntensity={0.55} />
        </mesh>
      ))}
      <mesh position={[0, -0.05, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.22, 6]} />
        <meshStandardMaterial color={c.boom} />
      </mesh>
      <mesh position={[0, -0.05, 0.3]}>
        <boxGeometry args={[0.06, 0.05, 0.06]} />
        <meshStandardMaterial color={c.body} />
      </mesh>
    </group>
  )
}

/* ============================================================
 * JWST — kite-shaped 5-layer sunshield + hex primary mirror +
 * secondary on a tripod. Sunshield dominates the silhouette.
 * ============================================================ */
export function JWSTShape() {
  const c = palette
  return (
    <group>
      <group rotation={[Math.PI / 2 - 0.15, 0, Math.PI / 4]} position={[0, -0.08, 0]}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[0, 0, -i * 0.012]}>
            <planeGeometry args={[0.95, 0.62]} />
            <meshStandardMaterial
              color={c.shield}
              side={DoubleSide}
              roughness={0.3}
              metalness={0.55}
              transparent
              opacity={0.95 - i * 0.08}
            />
          </mesh>
        ))}
        <lineSegments>
          <edgesGeometry args={[new PlaneGeometry(0.95, 0.62)]} />
          <lineBasicMaterial color={c.boom} />
        </lineSegments>
      </group>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.14, 0.08, 0.14]} />
        <meshStandardMaterial color={c.body} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.22, 0]} rotation={[0.18, 0, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.018, 6]} />
        <meshStandardMaterial color={c.shield} metalness={0.95} roughness={0.12} />
      </mesh>
      {[0, 1, 2].map((i) => {
        const angle = (i / 3) * Math.PI * 2
        const x = Math.cos(angle) * 0.18
        const z = Math.sin(angle) * 0.18
        return (
          <mesh
            key={i}
            position={[x / 2, 0.32, z / 2]}
            rotation={[Math.atan2(z, 0.18), 0, Math.atan2(x, 0.18)]}
          >
            <cylinderGeometry args={[0.006, 0.006, 0.22, 4]} />
            <meshStandardMaterial color={c.boom} />
          </mesh>
        )
      })}
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.012, 8]} />
        <meshStandardMaterial color={c.shield} metalness={0.95} roughness={0.12} />
      </mesh>
    </group>
  )
}

/* ============================================================
 * Parker Solar Probe — bright white circular heat shield + small
 * bus + two solar panel wings. Shield always points at the sun.
 * ============================================================ */
export function ParkerShape() {
  const c = palette
  return (
    <group>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.04, 24]} />
        <meshStandardMaterial
          color={c.shield}
          roughness={0.4}
          metalness={0.15}
          emissive={c.shield}
          emissiveIntensity={0.3}
        />
      </mesh>
      <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.36, 0.012, 6, 32]} />
        <meshStandardMaterial color={c.boom} />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.016, 0.016, 0.18, 8]} />
        <meshStandardMaterial color={c.boom} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.2, 6]} />
        <meshStandardMaterial color={c.body} metalness={0.5} roughness={0.4} />
      </mesh>
      {[-1, 1].map((dir) => (
        <group key={dir} position={[dir * 0.22, 0.05, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.008, 0.008, 0.08, 4]} />
            <meshStandardMaterial color={c.boom} />
          </mesh>
          <mesh position={[dir * 0.12, 0, 0]}>
            <boxGeometry args={[0.2, 0.12, 0.008]} />
            <meshStandardMaterial
              color={c.panel}
              metalness={0.4}
              roughness={0.3}
              emissive={c.panelGlint}
              emissiveIntensity={0.18}
            />
          </mesh>
          <mesh position={[dir * 0.12, 0.03, 0.005]}>
            <boxGeometry args={[0.18, 0.002, 0.001]} />
            <meshStandardMaterial color={c.boom} />
          </mesh>
          <mesh position={[dir * 0.12, -0.03, 0.005]}>
            <boxGeometry args={[0.18, 0.002, 0.001]} />
            <meshStandardMaterial color={c.boom} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.08, 6]} />
        <meshStandardMaterial color={c.boom} />
      </mesh>
    </group>
  )
}
