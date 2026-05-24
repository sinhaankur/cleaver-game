"use client"

/**
 * MilkyWay — galaxy backdrop, mirrored from the Universe Engine.
 *
 * A custom-shader point cloud building the full structure of our
 * galaxy: four spiral arms, a warm-amber bulge, the central bar,
 * pink HII star-forming regions tracing the arms, and a halo of
 * globular clusters. Per-star colour: hot blue O/B in outer arms,
 * white main-sequence in the middle, warm yellows toward the
 * bulge, occasional red giants.
 *
 * Mounted inside the game's scene as a backdrop. The disc is
 * scaled down to fit the game's coordinate space — the player
 * camera sits effectively inside the disc, seeing the galactic
 * plane stretch around them.
 *
 * This is a stripped mirror of the portfolio engine's MilkyWay:
 *   - No invert/chart mode (game is always dark)
 *   - No interactivity / Sgr A* hover info
 *   - No time-warp coupling — slow constant drift
 */

import { useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  ShaderMaterial,
} from "three"

/* ---------- Shaders ---------- */

const GALAXY_VERTEX_SHADER = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  varying float vAlpha;
  varying vec3 vColor;
  uniform float uTime;
  uniform float uPixelRatio;

  void main() {
    vAlpha = aAlpha;
    vColor = aColor;
    float twinkle = 0.9 + 0.1 * sin(uTime * 1.2 + position.x * 8.1 + position.z * 5.7);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * twinkle * uPixelRatio * (260.0 / -mv.z);
    gl_PointSize = clamp(gl_PointSize, 0.5, 14.0);
  }
`

const GALAXY_FRAGMENT_SHADER = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec2 uv = gl_PointCoord * 2.0 - 1.0;
    float dist = length(uv);
    if (dist > 1.0) discard;
    float falloff = exp(-3.2 * dist * dist);
    gl_FragColor = vec4(vColor, falloff * vAlpha);
  }
`

/* ---------- Box-Muller gauss helper ---------- */

function gauss(): number {
  let u = 0
  let v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/* ---------- MilkyWay component ---------- */

export function MilkyWay({
  /** Scale factor for the entire galaxy. The engine builds the disc
   *  at internal radius 130; the game's camera lives in a much
   *  smaller coordinate frame (planet at z=-20, ship at z=+9), so
   *  we scale the whole group down to fit. 0.12 keeps the camera
   *  near the edge of the disc — galactic plane stretches around
   *  the player, central bulge visible toward one direction. */
  scale = 0.12,
  /** Lower-detail star counts for phones / weak GPUs. */
  mobile = false,
}: {
  scale?: number
  mobile?: boolean
}) {
  const pointsRef = useRef<Points>(null)
  const matRef = useRef<ShaderMaterial>(null)
  const { gl } = useThree()

  const geometry = useMemo(() => {
    // Mirrors the engine's counts. Mobile ~40% of desktop.
    const armCount = mobile ? 7200 : 18000
    const bulgeCount = mobile ? 2200 : 5200
    const barCount = mobile ? 900 : 2200
    const hiiClumps = mobile ? 16 : 38
    const hiiPerClump = 22
    const hiiCount = hiiClumps * hiiPerClump
    const haloCount = mobile ? 50 : 110

    const total = armCount + bulgeCount + barCount + hiiCount + haloCount
    const positions = new Float32Array(total * 3)
    const sizes = new Float32Array(total)
    const alphas = new Float32Array(total)
    const colors = new Float32Array(total * 3)

    const radius = 130
    const branches = 4
    const spin = 1.3

    const writeColor = (idx: number, r: number, g: number, b: number) => {
      const i3 = idx * 3
      colors[i3] = r
      colors[i3 + 1] = g
      colors[i3 + 2] = b
    }

    // Arm stars — young blue O/B outer, warm yellow inner.
    for (let i = 0; i < armCount; i++) {
      const r = Math.pow(Math.random(), 1.6) * radius
      const branchAngle = ((i % branches) / branches) * Math.PI * 2
      const spinAngle = r * spin * 0.04
      const randomness = 0.28
      const rx = Math.pow(Math.random(), 2.6) * (Math.random() < 0.5 ? 1 : -1) * randomness * r
      const ry = Math.pow(Math.random(), 2.6) * (Math.random() < 0.5 ? 1 : -1) * randomness * r * 0.12
      const rz = Math.pow(Math.random(), 2.6) * (Math.random() < 0.5 ? 1 : -1) * randomness * r

      const i3 = i * 3
      positions[i3] = Math.cos(branchAngle + spinAngle) * r + rx
      positions[i3 + 1] = ry
      positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * r + rz

      const sizeRoll = Math.pow(Math.random(), 3.5)
      sizes[i] = 1.0 + sizeRoll * 5
      const normR = r / radius
      alphas[i] = (0.08 + (1 - normR) * 0.25) * (0.5 + Math.random() * 0.5)

      const cRoll = Math.random()
      const blueBias = 0.18 + normR * 0.32
      if (cRoll < blueBias) {
        writeColor(i, 0.74 + Math.random() * 0.10, 0.82 + Math.random() * 0.08, 1.0)
      } else if (cRoll < blueBias + 0.30) {
        const j = 0.95 + Math.random() * 0.05
        writeColor(i, j, j, j)
      } else if (cRoll < blueBias + 0.72) {
        writeColor(i, 1.0, 0.93 + Math.random() * 0.04, 0.72 + Math.random() * 0.06)
      } else {
        writeColor(i, 1.0, 0.78 + Math.random() * 0.05, 0.58 + Math.random() * 0.06)
      }
    }

    // Bulge — old Population II, warm yellows + occasional red giants.
    for (let i = 0; i < bulgeCount; i++) {
      const idx = armCount + i
      const i3 = idx * 3
      const r = Math.abs(gauss()) * radius * 0.18
      const theta = Math.random() * Math.PI * 2
      const phi = (Math.random() - 0.5) * 0.55

      positions[i3] = r * Math.cos(theta) * Math.cos(phi)
      positions[i3 + 1] = r * Math.sin(phi) * 0.6
      positions[i3 + 2] = r * Math.sin(theta) * Math.cos(phi)

      const sizeRoll = Math.pow(Math.random(), 3)
      sizes[idx] = 2 + sizeRoll * 8
      alphas[idx] = 0.3 + Math.random() * 0.2

      if (Math.random() < 0.75) {
        writeColor(idx, 1.0, 0.90 + Math.random() * 0.05, 0.68 + Math.random() * 0.07)
      } else {
        writeColor(idx, 1.0, 0.74 + Math.random() * 0.06, 0.50 + Math.random() * 0.06)
      }
    }

    // Bar — elongated stellar bar through the bulge. SBbc-class.
    const barHalfLength = radius * 0.21
    const barHalfWidth = radius * 0.045
    const barHalfHeight = radius * 0.020
    for (let i = 0; i < barCount; i++) {
      const idx = armCount + bulgeCount + i
      const i3 = idx * 3
      const u = Math.random() * 2 - 1
      const along = Math.sign(u) * Math.pow(Math.abs(u), 0.9) * barHalfLength
      const across = gauss() * barHalfWidth * 0.55
      const vert = gauss() * barHalfHeight * 0.55

      positions[i3] = along
      positions[i3 + 1] = vert
      positions[i3 + 2] = across

      sizes[idx] = 2 + Math.pow(Math.random(), 2.5) * 6
      alphas[idx] = 0.32 + Math.random() * 0.22

      writeColor(idx, 1.0, 0.88 + Math.random() * 0.05, 0.62 + Math.random() * 0.07)
    }

    // HII star-forming regions — pink Hα clumps tracing the arms.
    for (let c = 0; c < hiiClumps; c++) {
      const armR = (0.18 + Math.random() * 0.72) * radius
      const armBranch = Math.floor(Math.random() * branches)
      const branchAngle = (armBranch / branches) * Math.PI * 2
      const spinAngle = armR * spin * 0.04
      const armX = Math.cos(branchAngle + spinAngle) * armR
      const armZ = Math.sin(branchAngle + spinAngle) * armR

      const clumpScatter = 1.6 + Math.random() * 2.2
      for (let k = 0; k < hiiPerClump; k++) {
        const idx = armCount + bulgeCount + barCount + c * hiiPerClump + k
        const i3 = idx * 3
        const dx = gauss() * clumpScatter
        const dy = gauss() * 0.5
        const dz = gauss() * clumpScatter
        positions[i3] = armX + dx
        positions[i3 + 1] = dy
        positions[i3 + 2] = armZ + dz

        sizes[idx] = 3 + Math.random() * 4
        alphas[idx] = 0.35 + Math.random() * 0.35
        if (Math.random() < 0.18) {
          writeColor(idx, 0.78, 0.86, 1.0)
        } else {
          writeColor(idx, 1.0, 0.46 + Math.random() * 0.08, 0.70 + Math.random() * 0.10)
        }
      }
    }

    // Globular cluster halo — sparse sphere of bright old clusters
    // around the disc, well above/below the plane.
    for (let i = 0; i < haloCount; i++) {
      const idx = armCount + bulgeCount + barCount + hiiCount + i
      const i3 = idx * 3
      const haloR = radius * (0.45 + Math.pow(Math.random(), 1.4) * 0.85)
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i3] = haloR * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = haloR * Math.cos(phi) * 0.85
      positions[i3 + 2] = haloR * Math.sin(phi) * Math.sin(theta)

      sizes[idx] = 4 + Math.random() * 4
      alphas[idx] = 0.55 + Math.random() * 0.25
      writeColor(idx, 1.0, 0.86 + Math.random() * 0.05, 0.62 + Math.random() * 0.08)
    }

    const geo = new BufferGeometry()
    geo.setAttribute("position", new BufferAttribute(positions, 3))
    geo.setAttribute("aSize", new BufferAttribute(sizes, 1))
    geo.setAttribute("aAlpha", new BufferAttribute(alphas, 1))
    geo.setAttribute("aColor", new BufferAttribute(colors, 3))
    return geo
  }, [mobile])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
      uStarColor: { value: new Color("#ffffff") },
    }),
    [gl],
  )

  useFrame((_, delta) => {
    // Slow drift — the disc rotates imperceptibly. The portfolio engine
    // couples this to a time-warp slider; the game has no warp control,
    // so we keep a small constant rate.
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.0008
    }
    if (matRef.current) {
      ;(matRef.current.uniforms.uTime as { value: number }).value += delta
    }
  })

  return (
    <group
      // Tilt the disc slightly so the galactic plane isn't perfectly
      // edge-on to the camera — gives a more cinematic band sweep.
      rotation={[0.35, 0, 0.12]}
      scale={scale}
    >
      <points ref={pointsRef} geometry={geometry}>
        <shaderMaterial
          ref={matRef}
          vertexShader={GALAXY_VERTEX_SHADER}
          fragmentShader={GALAXY_FRAGMENT_SHADER}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
    </group>
  )
}
