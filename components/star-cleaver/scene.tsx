"use client"

/**
 * Star Cleaver — defender R3F scene.
 *
 * Layout (right-handed; +Z toward camera):
 *
 *   z = -20  ╶─  defended planet (large, partial frame, lower-left)
 *   z = -18  ╶─  alien spawn shell (back wall)
 *   z =  +9  ╶─  player ship (the Cleaver)
 *   z = +14  ╶─  camera
 *   z > +11  ╶─  "alien leaked past us" — planet takes damage
 *
 * The camera is fixed but breathes/sways for cinematic feel. The
 * ship banks with the aim input so the player has a kinaesthetic
 * connection to the reticle. Drift particles streak from depth
 * toward camera to convey forward motion through space.
 *
 * Aliens are managed by AlienSwarm, which is the only component
 * that owns array state. Everything else is stateless / ref-driven.
 */

import { useEffect, useMemo, useRef } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  Object3D,
  ShaderMaterial,
  Vector3,
} from "three"
import { BrightStarField } from "@/components/star-field/bright-star-field"
import type { GameState } from "./state"
import { ALIEN_HP_BASE, isCombatActive } from "./state"
import { WORLDS, type DefendedWorld } from "./targets"

/* =============================================================
 * Defended planet
 * ============================================================= */

const PLANET_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vLocalPos;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vLocalPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const PLANET_FRAGMENT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vLocalPos;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uLightDir;

  float hash3(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n000 = hash3(i);
    float n100 = hash3(i + vec3(1,0,0));
    float n010 = hash3(i + vec3(0,1,0));
    float n110 = hash3(i + vec3(1,1,0));
    float n001 = hash3(i + vec3(0,0,1));
    float n101 = hash3(i + vec3(1,0,1));
    float n011 = hash3(i + vec3(0,1,1));
    float n111 = hash3(i + vec3(1,1,1));
    return mix(
      mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
      mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
      f.z
    );
  }
  float fbm(vec3 p) {
    float s = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      s += a * noise3(p);
      p *= 2.05;
      a *= 0.5;
    }
    return s;
  }

  void main() {
    float n = fbm(vLocalPos * 1.6);
    vec3 base = mix(uColor2, uColor1, smoothstep(0.35, 0.7, n));
    float ndl = dot(normalize(vNormal), normalize(uLightDir));
    float lit = clamp(ndl * 0.5 + 0.5, 0.0, 1.0);
    gl_FragColor = vec4(base * (0.2 + 0.8 * lit), 1.0);
  }
`

function DefendedPlanet({ world }: { world: DefendedWorld }) {
  const groupRef = useRef<Group>(null)
  const lightDir = useMemo(() => new Vector3(0.7, 0.4, 0.5).normalize(), [])

  useFrame((_, dt) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y += world.rotationSpeed * dt
  })

  return (
    <group ref={groupRef} position={[-1.5, -4.5, -20]}>
      <mesh>
        <sphereGeometry args={[world.radius, 64, 64]} />
        <shaderMaterial
          vertexShader={PLANET_VERTEX}
          fragmentShader={PLANET_FRAGMENT}
          uniforms={{
            uColor1: { value: new Color(world.color1) },
            uColor2: { value: new Color(world.color2) },
            uLightDir: { value: lightDir },
          }}
        />
      </mesh>
      {/* Atmospheric rim. */}
      <mesh scale={world.radius * 1.07}>
        <sphereGeometry args={[1, 32, 32]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          side={DoubleSide}
          vertexShader={/* glsl */ `
            varying vec3 vNormalW;
            void main() {
              vNormalW = normalize(mat3(modelMatrix) * normal);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={/* glsl */ `
            varying vec3 vNormalW;
            uniform vec3 uColor;
            void main() {
              float rim = pow(1.0 - clamp(dot(vNormalW, vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 2.5);
              gl_FragColor = vec4(uColor * 0.7, rim * 0.6);
            }
          `}
          uniforms={{ uColor: { value: new Color(world.atmoColor) } }}
        />
      </mesh>
    </group>
  )
}

/* =============================================================
 * The Cleaver — player ship
 * ============================================================= */

function CleaverShip({
  heat,
  firing,
  aim,
  emitterRef,
}: {
  heat: number
  firing: boolean
  aim: { x: number; y: number }
  emitterRef: React.RefObject<Mesh | null>
}) {
  const groupRef = useRef<Group>(null)
  const emitterMatRef = useRef<{ emissiveIntensity?: number }>(null)
  const trailMatRef = useRef<{ opacity?: number } & { color?: { setHex?: (h: number) => void } }>(null)

  useFrame((state) => {
    if (groupRef.current) {
      // Bank harder than before — gives the chase its kinaesthetic edge.
      const targetRollZ = -aim.x * 0.6
      const targetPitchX = -aim.y * 0.35
      const targetYawY = aim.x * 0.22
      groupRef.current.rotation.z +=
        (targetRollZ - groupRef.current.rotation.z) * 0.12
      groupRef.current.rotation.x +=
        (targetPitchX - groupRef.current.rotation.x) * 0.12
      groupRef.current.rotation.y +=
        (targetYawY - groupRef.current.rotation.y) * 0.12
      // Lateral drift + slight Z bob — "this thing is actually flying".
      const t = state.clock.elapsedTime
      groupRef.current.position.x = aim.x * 0.5 + Math.sin(t * 0.6) * 0.06
      groupRef.current.position.y = -1.2 + aim.y * 0.3 + Math.sin(t * 0.45) * 0.05
      groupRef.current.position.z = 9 + Math.sin(t * 0.8) * 0.08
    }
    const mat = emitterMatRef.current
    if (mat) {
      const pulse = 0.4 + Math.sin(state.clock.elapsedTime * 6) * 0.15
      // Heat -> emitter glow. Firing pegs it bright. Overload (heat=1) flares hot.
      mat.emissiveIntensity = firing ? 8.0 : 0.4 + heat * (1.6 + pulse * 0.5)
    }
  })

  // Lambda-shuttle-inspired silhouette: long pointed cockpit, one
  // fixed top fin, two swept-down side wings. Built from R3F
  // primitives — no external assets, no IP-encumbered geometry.
  // Proportions are deliberately tweaked (longer cockpit, sharper
  // fin angle, the Cleaver's signature purple accents) so this
  // reads as "Lambda-flavoured gunship" rather than a clone.
  return (
    <group ref={groupRef} position={[0, -1.2, 9]} scale={0.8}>
      {/* Forward fuselage — long, pointed, the defining wedge. */}
      <mesh position={[0, 0, -1.6]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.22, 2.0, 6]} />
        <meshStandardMaterial color="#1a1a1d" roughness={0.5} metalness={0.7} />
      </mesh>
      {/* Mid hull — flat wedge box, wider than tall. */}
      <mesh position={[0, -0.03, -0.4]}>
        <boxGeometry args={[0.55, 0.32, 1.3]} />
        <meshStandardMaterial color="#26262a" roughness={0.5} metalness={0.7} />
      </mesh>
      {/* Cockpit viewport — thin horizontal strip near the front,
          subtly emissive so it reads as "someone's home". */}
      <mesh position={[0, 0.08, -1.05]}>
        <boxGeometry args={[0.32, 0.06, 0.18]} />
        <meshStandardMaterial
          color="#0a0a18"
          emissive="#b466ff"
          emissiveIntensity={0.7}
        />
      </mesh>
      {/* Aft hull — slightly wider engine block. */}
      <mesh position={[0, -0.05, 0.45]}>
        <boxGeometry args={[0.75, 0.36, 0.7]} />
        <meshStandardMaterial color="#1f1f24" roughness={0.55} metalness={0.7} />
      </mesh>
      {/* Top dorsal fin — tall trapezoid, the iconic "lambda" upright. */}
      <mesh position={[0, 0.55, 0.15]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.05, 0.85, 0.65]} />
        <meshStandardMaterial color="#1c1c20" roughness={0.5} metalness={0.7} />
      </mesh>
      {/* Top fin upper edge bevel — narrower bar near the top, gives
          the trapezoid the right cut-back profile. */}
      <mesh position={[0, 0.95, 0.32]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.06, 0.08, 0.32]} />
        <meshStandardMaterial color="#26262a" roughness={0.5} metalness={0.7} />
      </mesh>
      {/* Left wing — swept down at ~55° in flight position. */}
      <mesh position={[-0.55, -0.55, 0.18]} rotation={[0, 0, 0.95]}>
        <boxGeometry args={[0.85, 0.06, 0.55]} />
        <meshStandardMaterial color="#1c1c20" roughness={0.5} metalness={0.7} />
      </mesh>
      {/* Left wing tip — small accent bar at the wing's outer edge. */}
      <mesh position={[-0.95, -0.95, 0.18]} rotation={[0, 0, 0.95]}>
        <boxGeometry args={[0.12, 0.1, 0.55]} />
        <meshStandardMaterial color="#0e0e12" roughness={0.6} metalness={0.7} />
      </mesh>
      {/* Right wing — mirrored. */}
      <mesh position={[0.55, -0.55, 0.18]} rotation={[0, 0, -0.95]}>
        <boxGeometry args={[0.85, 0.06, 0.55]} />
        <meshStandardMaterial color="#1c1c20" roughness={0.5} metalness={0.7} />
      </mesh>
      <mesh position={[0.95, -0.95, 0.18]} rotation={[0, 0, -0.95]}>
        <boxGeometry args={[0.12, 0.1, 0.55]} />
        <meshStandardMaterial color="#0e0e12" roughness={0.6} metalness={0.7} />
      </mesh>
      {/* Twin rear thruster exhaust — wider stance than the original
          single thruster; reads as "two engines, defender-class". */}
      <mesh position={[-0.22, -0.05, 0.85]}>
        <coneGeometry args={[0.13, 0.55, 12]} />
        <meshBasicMaterial
          color="#9bd0ff"
          transparent
          opacity={0.65}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0.22, -0.05, 0.85]}>
        <coneGeometry args={[0.13, 0.55, 12]} />
        <meshBasicMaterial
          color="#9bd0ff"
          transparent
          opacity={0.65}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* Engine trail — long stretched cone behind the ship that sells
          forward flight. Pulse-modulated brightness reads as live thrust;
          the cone's length is much greater than the thrusters above so
          it leaves a real wake behind the Cleaver. */}
      <mesh position={[-0.22, -0.05, 2.6]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.18, 3.5, 12, 1, true]} />
        <meshBasicMaterial
          color="#5fa8d8"
          transparent
          opacity={0.18}
          blending={AdditiveBlending}
          depthWrite={false}
          ref={(m) => {
            trailMatRef.current = m as unknown as { opacity?: number; color?: { setHex?: (h: number) => void } }
          }}
        />
      </mesh>
      <mesh position={[0.22, -0.05, 2.6]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.18, 3.5, 12, 1, true]} />
        <meshBasicMaterial
          color="#5fa8d8"
          transparent
          opacity={0.18}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* Emitter — under-fuselage cannon, the beam exits from here. */}
      <mesh ref={emitterRef} position={[0, -0.12, -2.5]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial
          ref={(m) => {
            emitterMatRef.current = m as unknown as {
              emissiveIntensity?: number
            }
          }}
          color="#7a3acf"
          emissive="#b466ff"
          emissiveIntensity={0.4}
        />
      </mesh>
    </group>
  )
}

/* =============================================================
 * Venator-inspired alien mothership
 *
 * Looms in the deep background, slightly offset from the
 * defended planet so it reads as a separate threat. Built as
 * a dagger-shaped wedge hull with twin command towers + an
 * angry red engine glow. Doesn't move or fight — just hangs
 * there as the silent mass the fighters spawn from.
 *
 * IP note: this is a silhouette inspired by the Venator-class
 * Star Destroyer aesthetic — built entirely from R3F primitives
 * with different proportions and an alien colour grading. The
 * Sketchfab model file is never ingested.
 * ============================================================= */

function VenatorMothership() {
  const groupRef = useRef<Group>(null)
  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    // Drift slowly so it doesn't read as static. Yaw + a hint of
    // lateral motion gives it weight without distracting.
    groupRef.current.rotation.y = Math.sin(t * 0.04) * 0.12
    groupRef.current.position.x = 4 + Math.sin(t * 0.05) * 0.6
    groupRef.current.position.y = 1.8 + Math.sin(t * 0.06) * 0.15
  })
  return (
    <group ref={groupRef} position={[4, 1.8, -28]} scale={2.2}>
      {/* Main hull — long flat dagger. The thing's silhouette. */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, 0]}>
        <coneGeometry args={[1.6, 6.0, 3]} />
        <meshStandardMaterial color="#262630" roughness={0.55} metalness={0.7} />
      </mesh>
      {/* Hull top plate — slight rise on top of the dagger. */}
      <mesh position={[0, 0.18, 0.4]} rotation={[0, 0, 0]}>
        <coneGeometry args={[1.4, 5.4, 3]} />
        <meshStandardMaterial color="#2c2c38" roughness={0.55} metalness={0.7} />
      </mesh>
      {/* Hangar slot — ventral dark strip running along the underside. */}
      <mesh position={[0, -0.32, -0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.5, 3.5]} />
        <meshStandardMaterial
          color="#0a0a14"
          emissive="#ff4a2a"
          emissiveIntensity={0.4}
          side={DoubleSide}
        />
      </mesh>
      {/* Left command tower — rear-mounted, tall + narrow. */}
      <mesh position={[-0.32, 0.55, 1.5]}>
        <boxGeometry args={[0.22, 0.55, 0.5]} />
        <meshStandardMaterial color="#1e1e26" roughness={0.5} metalness={0.7} />
      </mesh>
      {/* Right command tower — twin. */}
      <mesh position={[0.32, 0.55, 1.5]}>
        <boxGeometry args={[0.22, 0.55, 0.5]} />
        <meshStandardMaterial color="#1e1e26" roughness={0.5} metalness={0.7} />
      </mesh>
      {/* Command-tower bridges — small spheres on top. */}
      <mesh position={[-0.32, 0.95, 1.5]}>
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshStandardMaterial
          color="#1a1a22"
          emissive="#ff7a4a"
          emissiveIntensity={0.5}
        />
      </mesh>
      <mesh position={[0.32, 0.95, 1.5]}>
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshStandardMaterial
          color="#1a1a22"
          emissive="#ff7a4a"
          emissiveIntensity={0.5}
        />
      </mesh>
      {/* Rear engine bank — three glowing ports, hostile red. */}
      <mesh position={[-0.5, 0, 2.6]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshBasicMaterial
          color="#ff4a2a"
          transparent
          opacity={0.85}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0, 2.6]}>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshBasicMaterial
          color="#ff6a4a"
          transparent
          opacity={0.85}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0.5, 0, 2.6]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshBasicMaterial
          color="#ff4a2a"
          transparent
          opacity={0.85}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

/* =============================================================
 * Rebel transport — CR-90-inspired
 *
 * One friendly corvette drifts across the mid-distance during
 * each engagement, left-to-right, slow and stately. It's a
 * scenery element — never engages, never dies, but its passage
 * tells the player "there's a fleet here, you're not alone".
 *
 * Hammerhead silhouette: wide flat front bulb, long thin tubular
 * hull, triple engine bank at the rear with blue thruster glow.
 * Procedural primitives only — no IP-encumbered geometry.
 * ============================================================= */

function RebelTransport() {
  const groupRef = useRef<Group>(null)
  // Period in seconds for one full traverse + offscreen wait.
  // 90s is slow enough that the corvette reads as massive +
  // far away. One ship is visible at a time.
  const CYCLE = 90
  // Visible portion of the cycle (0..1) — the rest is offscreen.
  const VIS_START = 0.1
  const VIS_END = 0.78
  // Path endpoints in scene units. y = 0.5 sits above the
  // defended planet (which is centred at y=-4.5), z = -10 puts
  // it between the player ship and the planet.
  const FROM = useMemo(() => new Vector3(18, 0.5, -10), [])
  const TO = useMemo(() => new Vector3(-18, 0.5, -10), [])

  useFrame((state) => {
    if (!groupRef.current) return
    const t = (state.clock.elapsedTime % CYCLE) / CYCLE
    if (t < VIS_START || t > VIS_END) {
      groupRef.current.visible = false
      return
    }
    groupRef.current.visible = true
    // Lerp from FROM → TO over the visible portion. Smoothstep
    // so the corvette eases in/out rather than popping in at
    // constant velocity.
    const u = (t - VIS_START) / (VIS_END - VIS_START)
    const eased = u * u * (3 - 2 * u)
    groupRef.current.position.lerpVectors(FROM, TO, eased)
    // Hold a slight pitch so the hammerhead reads as "moving
    // forward through space" not just sliding across a plane.
    groupRef.current.rotation.y = -Math.PI / 2 + Math.sin(state.clock.elapsedTime * 0.2) * 0.04
    groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.15) * 0.03
  })

  return (
    <group ref={groupRef} scale={0.9}>
      {/* Hammerhead — wide flat front bulb. */}
      <mesh position={[0, 0, -2.4]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.55, 0.32, 0.45, 12]} />
        <meshStandardMaterial color="#a8aab0" roughness={0.45} metalness={0.55} />
      </mesh>
      {/* Front neck — connects hammerhead to main hull. */}
      <mesh position={[0, 0, -1.6]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.32, 0.85, 10]} />
        <meshStandardMaterial color="#8e9098" roughness={0.5} metalness={0.55} />
      </mesh>
      {/* Main hull — long thin tube. */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 2.6, 12]} />
        <meshStandardMaterial color="#9b9da4" roughness={0.5} metalness={0.55} />
      </mesh>
      {/* Hull spine — slight raised ridge along the top. */}
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[0.12, 0.08, 2.0]} />
        <meshStandardMaterial color="#7a7c84" roughness={0.55} metalness={0.5} />
      </mesh>
      {/* Engine cluster — wider block at the rear. */}
      <mesh position={[0, 0, 1.5]}>
        <boxGeometry args={[0.7, 0.42, 0.55]} />
        <meshStandardMaterial color="#7a7c84" roughness={0.55} metalness={0.6} />
      </mesh>
      {/* Triple engine glows — Rebel blue. */}
      {[-0.22, 0, 0.22].map((x, i) => (
        <mesh key={i} position={[x, 0, 1.85]}>
          <sphereGeometry args={[0.13, 12, 12]} />
          <meshBasicMaterial
            color="#7ac8ff"
            transparent
            opacity={0.9}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
      {/* Comm dish — small disc on the spine, just behind the neck. */}
      <mesh position={[0, 0.32, -0.4]} rotation={[Math.PI / 2.4, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.06, 12]} />
        <meshStandardMaterial color="#6c6e76" roughness={0.5} metalness={0.6} />
      </mesh>
      {/* Hammerhead viewport — faint cockpit glow. */}
      <mesh position={[0, 0.04, -2.65]}>
        <boxGeometry args={[0.34, 0.08, 0.04]} />
        <meshStandardMaterial
          color="#0a1a2a"
          emissive="#9bd0ff"
          emissiveIntensity={0.6}
        />
      </mesh>
    </group>
  )
}

/* =============================================================
 * X-Wing squadron — friendly fighters sweeping past
 *
 * Three small X-Wing-inspired fighters fly past the camera in
 * loose formation every ~22 seconds. They enter from the lower-
 * left, bank up and right, and exit toward the upper-right
 * background. Pure scenery — they don't fire, can't be hit, but
 * their presence sells the "you're with a fleet" beat.
 *
 * S-foils in attack position (X formation viewed from front),
 * four engines with red exhaust accents, the Rebel red wing
 * stripe.
 * ============================================================= */

function XWing({ phaseOffset }: { phaseOffset: number }) {
  const groupRef = useRef<Group>(null)
  const CYCLE = 22 // seconds for one squadron pass
  const VIS_START = 0.05
  const VIS_END = 0.6
  // Path: enter lower-left near foreground, exit upper-right at
  // mid-distance. Player sees the X-Wings sweep across in front.
  const FROM = useMemo(() => new Vector3(-12, -3, 3), [])
  const TO = useMemo(() => new Vector3(14, 4, -12), [])

  useFrame((state) => {
    if (!groupRef.current) return
    const t = ((state.clock.elapsedTime + phaseOffset) % CYCLE) / CYCLE
    if (t < VIS_START || t > VIS_END) {
      groupRef.current.visible = false
      return
    }
    groupRef.current.visible = true
    const u = (t - VIS_START) / (VIS_END - VIS_START)
    // Slight arc on Y — pull up through the middle of the pass.
    const arcY = Math.sin(u * Math.PI) * 1.2
    groupRef.current.position.set(
      FROM.x + (TO.x - FROM.x) * u,
      FROM.y + (TO.y - FROM.y) * u + arcY,
      FROM.z + (TO.z - FROM.z) * u,
    )
    // Orient toward direction of travel, with a bank into the curve.
    const dir = TO.clone().sub(FROM).normalize()
    groupRef.current.lookAt(
      groupRef.current.position.clone().add(dir),
    )
    groupRef.current.rotation.z = Math.sin(u * Math.PI) * 0.45 - 0.2
  })

  return (
    <group ref={groupRef} scale={0.32}>
      {/* Central fuselage — long thin cylinder, pointed forward. */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.14, 0.1, 1.4, 10]} />
        <meshStandardMaterial color="#d4d4d8" roughness={0.5} metalness={0.4} />
      </mesh>
      {/* Nose cone. */}
      <mesh position={[0, 0, -0.85]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.1, 0.4, 8]} />
        <meshStandardMaterial color="#bfbfc4" roughness={0.5} metalness={0.45} />
      </mesh>
      {/* Cockpit canopy — bubble on top, slightly forward. */}
      <mesh position={[0, 0.12, -0.2]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial
          color="#1a1f2a"
          emissive="#3a6a9a"
          emissiveIntensity={0.4}
        />
      </mesh>
      {/* S-foils — four wings in X formation when viewed from
          the front. Each is a flat plank angled away from the
          fuselage. */}
      {[
        { x: -0.32, y: 0.18, rotZ: -0.32 }, // upper-left
        { x: 0.32, y: 0.18, rotZ: 0.32 },   // upper-right
        { x: -0.32, y: -0.18, rotZ: 0.32 }, // lower-left
        { x: 0.32, y: -0.18, rotZ: -0.32 }, // lower-right
      ].map((w, i) => (
        <group key={i} position={[w.x, w.y, 0.35]}>
          <mesh rotation={[0, 0, w.rotZ]}>
            <boxGeometry args={[0.55, 0.04, 0.5]} />
            <meshStandardMaterial color="#cccfd4" roughness={0.55} metalness={0.45} />
          </mesh>
          {/* Red squadron stripe near wing root. */}
          <mesh position={[w.x > 0 ? -0.2 : 0.2, 0, 0.05]} rotation={[0, 0, w.rotZ]}>
            <boxGeometry args={[0.12, 0.045, 0.4]} />
            <meshStandardMaterial color="#d94a3a" roughness={0.5} metalness={0.3} />
          </mesh>
          {/* Engine at wing root — blue exhaust. */}
          <mesh position={[0, 0, 0.45]}>
            <sphereGeometry args={[0.07, 10, 10]} />
            <meshBasicMaterial
              color="#9bd0ff"
              transparent
              opacity={0.95}
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function XWingSquadron() {
  // Three ships in loose formation, staggered by phase offset so
  // they don't fly stacked on each other. The offsets are small
  // (~0.7s apart) so they read as a tight wing-line, not a
  // dispersed convoy.
  return (
    <>
      <XWing phaseOffset={0} />
      <XWing phaseOffset={0.7} />
      <XWing phaseOffset={1.4} />
    </>
  )
}

/* =============================================================
 * Beam
 * ============================================================= */

function Beam({
  visible,
  aimWorldDir,
  emitterRef,
}: {
  visible: boolean
  aimWorldDir: Vector3
  emitterRef: React.RefObject<Mesh | null>
}) {
  const groupRef = useRef<Group>(null)
  const emitterWorld = useMemo(() => new Vector3(), [])
  const BEAM_LEN = 36

  useFrame(() => {
    if (!groupRef.current || !visible || !emitterRef.current) return
    emitterRef.current.getWorldPosition(emitterWorld)
    // End point is far along aim direction.
    const end = emitterWorld
      .clone()
      .add(aimWorldDir.clone().multiplyScalar(BEAM_LEN))
    const mid = emitterWorld.clone().lerp(end, 0.5)
    groupRef.current.position.copy(mid)
    const up = new Vector3(0, 1, 0)
    const dir = end.clone().sub(emitterWorld).normalize()
    const axis = up.clone().cross(dir)
    const angle = Math.acos(up.dot(dir))
    if (axis.lengthSq() > 1e-6) {
      groupRef.current.quaternion.setFromAxisAngle(axis.normalize(), angle)
    }
    groupRef.current.scale.set(1, BEAM_LEN, 1)
  })

  if (!visible) return null
  return (
    <group ref={groupRef}>
      <mesh>
        <cylinderGeometry args={[0.1, 0.06, 1, 12, 1, true]} />
        <meshBasicMaterial
          color="#b466ff"
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.028, 0.018, 1, 8, 1, true]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={1}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

/* =============================================================
 * Alien ships + swarm
 * ============================================================= */

export type AlienHandle = {
  /** Continuous beam damage tick. While firing, the parent calls this each
   *  frame with the beam origin/direction and the frame delta. Aliens
   *  inside the beam cylinder lose HP proportional to (dt × dps).
   *  Returns this frame's kills (so the parent can credit score in real time). */
  damageBeam: (origin: Vector3, dir: Vector3, dt: number, dps: number) => number
  /** Spawn a fresh wave. */
  spawnWave: (count: number, speedMul: number) => void
  /** Imperatively clear all (e.g. on defeat / restart). */
  clear: () => void
  /** Snapshot of state — alive count + escape events since last call. */
  consumeEvents: () => { kills: number; leaks: number; aliveCount: number }
}

type Alien = {
  alive: boolean
  pos: Vector3
  /** Sinusoidal wobble seed — drives weave + roll phase. */
  seed: number
  /** Forward speed scalar. */
  speed: number
  /** Remaining HP. Drops while the beam is on; alive=false at <=0. */
  hp: number
  /** Last frame's "I was hit" flag — used to drive the damage flash + evasive nudge. */
  recentlyHit: boolean
  /** Time accumulator since last "panic-bank" lateral kick. */
  panicTimer: number
}

function makeAlien(speedMul: number, baseHp: number): Alien {
  return {
    alive: true,
    pos: new Vector3(
      (Math.random() - 0.5) * 18, // x: -9..9 (wider spread)
      (Math.random() - 0.4) * 7, // y: -2.8..4.2 (biased above planet)
      -22 - Math.random() * 8, // z: -22..-30 (further away to start)
    ),
    seed: Math.random() * Math.PI * 2,
    speed: (1.4 + Math.random() * 0.7) * speedMul,
    hp: baseHp,
    recentlyHit: false,
    panicTimer: 0,
  }
}

const AlienSwarm = (() => {
  return function AlienSwarmImpl({
    handleRef,
    active,
    alienHpBase,
  }: {
    handleRef: React.MutableRefObject<AlienHandle | null>
    active: boolean
    alienHpBase: number
  }) {
    const groupRef = useRef<Group>(null)
    const aliensRef = useRef<Alien[]>([])
    const eventsRef = useRef({ kills: 0, leaks: 0 })
    const meshesRef = useRef<Map<number, Object3D>>(new Map())

    useEffect(() => {
      const handle: AlienHandle = {
        damageBeam(origin, dir, dt, dps) {
          // Generous hit cone — graze damage falls off with perp distance.
          const ndir = dir.clone().normalize()
          const HIT_RADIUS = 1.5
          let killsThisFrame = 0
          for (const a of aliensRef.current) {
            if (!a.alive) continue
            const op = a.pos.clone().sub(origin)
            const along = op.dot(ndir)
            if (along < 0) continue
            const perp = op.clone().sub(ndir.clone().multiplyScalar(along))
            const d = perp.length()
            if (d < HIT_RADIUS) {
              // Centre of beam = full dps; edge = ~30% dps. Encourages
              // good aim but rewards persistence.
              const falloff = 1 - 0.7 * (d / HIT_RADIUS)
              a.hp -= dps * dt * falloff
              a.recentlyHit = true
              if (a.hp <= 0) {
                a.alive = false
                killsThisFrame += 1
              }
            }
          }
          eventsRef.current.kills += killsThisFrame
          return killsThisFrame
        },
        spawnWave(count, speedMul) {
          aliensRef.current = []
          for (let i = 0; i < count; i++) {
            aliensRef.current.push(makeAlien(speedMul, alienHpBase))
          }
        },
        clear() {
          aliensRef.current = []
        },
        consumeEvents() {
          const out = {
            kills: eventsRef.current.kills,
            leaks: eventsRef.current.leaks,
            aliveCount: aliensRef.current.filter((a) => a.alive).length,
          }
          eventsRef.current.kills = 0
          eventsRef.current.leaks = 0
          return out
        },
      }
      handleRef.current = handle
    }, [handleRef, alienHpBase])

    useFrame((state, dt) => {
      if (!groupRef.current) return
      const t = state.clock.elapsedTime
      for (let i = 0; i < aliensRef.current.length; i++) {
        const a = aliensRef.current[i]
        if (!a.alive) {
          const mesh = meshesRef.current.get(i)
          if (mesh) mesh.visible = false
          continue
        }
        if (active) {
          // Forward (+z) drift toward the player.
          a.pos.z += a.speed * dt
          // Weave — wider amplitude than before, gives the chase
          // feel "things are zigging, not just floating".
          a.pos.x += Math.sin(t * 1.4 + a.seed) * 0.05 * a.speed
          a.pos.y += Math.cos(t * 1.1 + a.seed * 1.3) * 0.04 * a.speed
          // Panic-bank — every few seconds, if alien has been hit recently,
          // it kicks laterally to break the beam lock.
          a.panicTimer += dt
          if (a.recentlyHit && a.panicTimer > 0.6) {
            const dx = (Math.sin(a.seed * 3.7) > 0 ? 1 : -1) * 1.2
            const dy = Math.cos(a.seed * 2.1) * 0.6
            a.pos.x += dx * dt * 3
            a.pos.y += dy * dt * 3
            a.panicTimer = 0
          }
          a.recentlyHit = false // reset each frame
          if (a.pos.z > 11) {
            a.alive = false
            eventsRef.current.leaks += 1
          }
        }
        const mesh = meshesRef.current.get(i)
        if (mesh) {
          mesh.visible = true
          mesh.position.copy(a.pos)
          mesh.rotation.y = t * 1.2 + a.seed
          mesh.rotation.z = Math.sin(t * 1.5 + a.seed) * 0.3
        }
      }
    })

    // Render a fixed pool of 64 meshes; map them to alien slots as
    // we go. Spawning more than 64 in a single wave is unsupported
    // (escalation curve never gets that high).
    const POOL_SIZE = 64
    return (
      <group ref={groupRef}>
        {Array.from({ length: POOL_SIZE }, (_, i) => (
          <AlienMesh
            key={i}
            attach={(o) => {
              if (o) meshesRef.current.set(i, o)
              else meshesRef.current.delete(i)
            }}
          />
        ))}
      </group>
    )
  }
})()

function AlienMesh({ attach }: { attach: (o: Object3D | null) => void }) {
  // TIE-Shuttle-inspired hostile fighter: central spherical cockpit
  // flanked by two flat hexagonal solar panels. Glowing red viewport
  // in the cockpit ball reads as "hostile". Procedural primitives
  // only — no external geometry.
  return (
    <group ref={(o) => attach(o)} visible={false} scale={0.5}>
      {/* Central cockpit ball — the iconic TIE silhouette anchor. */}
      <mesh>
        <sphereGeometry args={[0.32, 16, 16]} />
        <meshStandardMaterial color="#1a1a22" roughness={0.5} metalness={0.7} />
      </mesh>
      {/* Cockpit window — bright red, the "eye" that signals threat. */}
      <mesh position={[0, 0, 0.32]}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshStandardMaterial
          color="#3a0808"
          emissive="#ff2a2a"
          emissiveIntensity={2.2}
        />
      </mesh>
      {/* Cockpit-to-panel pylon, left. */}
      <mesh position={[-0.42, 0, 0]}>
        <boxGeometry args={[0.18, 0.08, 0.12]} />
        <meshStandardMaterial color="#0e0e14" roughness={0.6} metalness={0.6} />
      </mesh>
      {/* Cockpit-to-panel pylon, right. */}
      <mesh position={[0.42, 0, 0]}>
        <boxGeometry args={[0.18, 0.08, 0.12]} />
        <meshStandardMaterial color="#0e0e14" roughness={0.6} metalness={0.6} />
      </mesh>
      {/* Left solar panel — hex-flavoured rectangle with a darker
          inner crosshatch (cylinderGeometry with 6 segments gives a
          hex when used flat). */}
      <mesh position={[-0.78, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.55, 0.55, 0.06, 6]} />
        <meshStandardMaterial color="#16161c" roughness={0.55} metalness={0.65} />
      </mesh>
      {/* Right solar panel. */}
      <mesh position={[0.78, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.55, 0.55, 0.06, 6]} />
        <meshStandardMaterial color="#16161c" roughness={0.55} metalness={0.65} />
      </mesh>
      {/* Panel inner detail — slightly raised central plate per panel
          for that "segmented solar array" read. */}
      <mesh position={[-0.78, 0, 0.04]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.32, 0.32, 0.04, 6]} />
        <meshStandardMaterial color="#0a0a10" roughness={0.6} metalness={0.7} />
      </mesh>
      <mesh position={[0.78, 0, 0.04]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.32, 0.32, 0.04, 6]} />
        <meshStandardMaterial color="#0a0a10" roughness={0.6} metalness={0.7} />
      </mesh>
    </group>
  )
}

/* =============================================================
 * Motion debris — parallax sparks streaming past the camera
 * ============================================================= */

const DEBRIS_VERTEX = /* glsl */ `
  attribute vec3 aSeed;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vBrightness;
  void main() {
    // Forward streaming: z cycles from -40 → +18 faster than before so
    // the chase reads as actual flight, not a leisurely cruise.
    float speed = 1.8 + aSeed.x * 2.4;
    float cycle = 58.0 / speed;
    float zPhase = mod(uTime + aSeed.y * cycle, cycle) / cycle; // 0..1
    float z = -40.0 + zPhase * 58.0;
    // Lateral position from seed — tightened slightly so streaks
    // cluster near the camera axis, focused-attention feel.
    float ang = aSeed.z * 6.2831853;
    float radius = 1.8 + aSeed.x * 8.0;
    vec3 pos = vec3(cos(ang) * radius, sin(ang) * radius * 0.55, z);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    // Bigger near-field streaks for more visual punch.
    gl_PointSize = (2.5 + zPhase * 8.0) * uPixelRatio;
    vBrightness = 0.45 + zPhase * 0.65;
  }
`
const DEBRIS_FRAGMENT = /* glsl */ `
  varying float vBrightness;
  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    if (d > 0.5) discard;
    float a = (1.0 - smoothstep(0.0, 0.5, d)) * vBrightness * 0.75;
    gl_FragColor = vec4(0.85, 0.9, 1.0, a);
  }
`

function MotionDebris() {
  const matRef = useRef<ShaderMaterial>(null)
  const gl = useThree((s) => s.gl)
  const geometry = useMemo(() => {
    // Doubled from 280 → 560 streaks. Cheap on GPU; thick enough to
    // read as "we're tearing through space" rather than "drifting".
    const N = 560
    const seeds = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      seeds[i * 3 + 0] = Math.random() // x.r: radial size
      seeds[i * 3 + 1] = Math.random() // y.g: phase offset
      seeds[i * 3 + 2] = Math.random() // z.b: angular position
    }
    const geo = new BufferGeometry()
    geo.setAttribute("position", new BufferAttribute(new Float32Array(N * 3), 3))
    geo.setAttribute("aSeed", new BufferAttribute(seeds, 3))
    return geo
  }, [])

  useEffect(() => {
    if (matRef.current) {
      matRef.current.uniforms.uPixelRatio.value = gl.getPixelRatio()
    }
  }, [gl])

  useFrame((state) => {
    if (matRef.current)
      matRef.current.uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        vertexShader={DEBRIS_VERTEX}
        fragmentShader={DEBRIS_FRAGMENT}
        uniforms={{
          uTime: { value: 0 },
          uPixelRatio: { value: 1 },
        }}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  )
}

/* =============================================================
 * Scene contents — orchestrates the whole 3D layer
 * ============================================================= */

function CameraBreath({ aim }: { aim: { x: number; y: number } }) {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(0, 0.7, 14)
    camera.lookAt(0, -0.5, 0)
  }, [camera])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    // Flight feel — more aggressive sway than a passive backdrop. Slight
    // forward bob on Z so the camera actually "bobs" with the engine
    // pulses, aim-tracked lateral lean, and a sweep on Y from breath.
    camera.position.x = Math.sin(t * 0.55) * 0.3 + aim.x * 0.7
    camera.position.y = 0.7 + Math.sin(t * 0.42) * 0.22 + aim.y * 0.45
    camera.position.z = 14 + Math.sin(t * 1.1) * 0.18
    camera.lookAt(aim.x * 2.0, -0.5 + aim.y * 1.2, 0)
  })
  return null
}

export function SceneContents({
  state,
  aimWorldDirRef,
  alienHandleRef,
}: {
  state: GameState
  aimWorldDirRef: React.MutableRefObject<Vector3>
  alienHandleRef: React.MutableRefObject<AlienHandle | null>
}) {
  const world = WORLDS[state.worldIndex]
  const emitterRef = useRef<Mesh>(null)

  return (
    <>
      <ambientLight intensity={0.22} />
      <directionalLight position={[5, 4, 7]} intensity={1.1} />
      <BrightStarField />

      <DefendedPlanet world={world} />

      {/* Alien capital ship — looming in the deep background near
          the defended planet. Doesn't engage; it's the source the
          fighters spawn from + the silent presence behind everything. */}
      <VenatorMothership />

      {/* Rebel transport — one CR-90-inspired corvette drifts across
          mid-depth each engagement. Tells the player there's an
          allied fleet, not just the lone Cleaver. */}
      <RebelTransport />

      {/* X-Wing squadron — three friendly fighters sweep past the
          camera in formation periodically. Pure cinematic flavour. */}
      <XWingSquadron />

      <MotionDebris />

      <AlienSwarm
        handleRef={alienHandleRef}
        active={isCombatActive(state.phase)}
        alienHpBase={ALIEN_HP_BASE}
      />

      <CleaverShip
        heat={state.heat}
        firing={state.phase === "firing"}
        aim={state.aim}
        emitterRef={emitterRef}
      />

      <Beam
        visible={state.phase === "firing"}
        aimWorldDir={aimWorldDirRef.current}
        emitterRef={emitterRef}
      />

      <CameraBreath aim={state.aim} />
    </>
  )
}

/* =============================================================
 * Canvas wrapper
 * ============================================================= */

export function StarCleaverScene(props: {
  state: GameState
  aimWorldDirRef: React.MutableRefObject<Vector3>
  alienHandleRef: React.MutableRefObject<AlienHandle | null>
}) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 55, near: 0.1, far: 500, position: [0, 0.5, 14] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <SceneContents {...props} />
    </Canvas>
  )
}

/* =============================================================
 * Aim helper
 * ============================================================= */

/**
 * Map a normalized aim point (-1..1 each axis, where (0,0) is the
 * screen centre) into a world-space unit vector relative to the
 * player ship's emitter — i.e. the direction the beam travels.
 *
 * The screen is the camera's image plane; the aim point on that
 * plane corresponds to a world direction at the camera's near
 * plane. We approximate by mapping x → world+X, y → world+Y, with
 * z = -1 (forward into depth, where the aliens are). This is a
 * cheap parallel projection that's accurate enough for the
 * combat range — the beam appears to track the reticle exactly.
 */
export function aimToWorldDir(aim: { x: number; y: number }): Vector3 {
  // Aim half-FOV ≈ 30 degrees → tan(30°) ≈ 0.577.
  const k = 0.6
  return new Vector3(aim.x * k, aim.y * k, -1).normalize()
}

export { WORLDS }
