"use client"

/**
 * Sun — slim mirror of the Universe Engine's solar body.
 *
 * Renders a textured sun (Solar System Scope CC BY photosphere
 * map) with a soft additive halo, plus a point light at its
 * position so the rest of the scene actually receives light from
 * the right direction. Everything that needs to know "where is
 * the sun?" reads from `SUN_WORLD_POS` so the planet terminator
 * and the lighting source agree.
 *
 * No hover state, no lens-flare boost, no chart mode — this is
 * the game's static sun, not the portfolio's interactive one.
 */

import { useEffect, useRef, useState } from "react"
import { useFrame } from "@react-three/fiber"
import {
  AdditiveBlending,
  DoubleSide,
  Mesh,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
  Vector3,
} from "three"

/**
 * Sun position in the game's scene-units. Far upper-right and
 * slightly back from the camera — produces a cinematic crescent
 * on the defended planet rather than a fully-lit disc.
 *
 * Anything that needs to know where the sun is (the planet's
 * day/night shader, light direction calculations) imports this
 * single constant.
 */
export const SUN_WORLD_POS = new Vector3(28, 12, -32)

/** Apparent radius of the sun in scene-units. Large enough to read
 *  as a real disc at the chosen distance; not so large that it
 *  blocks the play area. */
export const SUN_RADIUS = 4.0

export function Sun() {
  const meshRef = useRef<Mesh>(null)
  const haloRef = useRef<Mesh>(null)
  const [texture, setTexture] = useState<Texture | null>(null)

  useEffect(() => {
    const loader = new TextureLoader()
    loader.load("/textures/sun.webp", (tex) => {
      tex.colorSpace = SRGBColorSpace
      tex.anisotropy = 4
      setTexture(tex)
    })
  }, [])

  useFrame((_, dt) => {
    // Slow rotation — real solar rotation period is ~25 days at the
    // equator. Keep it gentle here so the texture reads as alive but
    // not spinning.
    if (meshRef.current) meshRef.current.rotation.y += dt * 0.02
    // Halo breathes — small pulse-modulated scale wobble.
    if (haloRef.current) {
      const s = 1 + Math.sin(performance.now() * 0.001) * 0.04
      haloRef.current.scale.setScalar(s)
    }
  })

  return (
    <group position={SUN_WORLD_POS}>
      {/* Solar disc — textured sphere with emissive boost so it
          self-illuminates rather than depending on ambient. */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[SUN_RADIUS, 48, 48]} />
        {texture ? (
          <meshStandardMaterial
            map={texture}
            emissiveMap={texture}
            emissive="#ffffff"
            emissiveIntensity={1.6}
            roughness={1}
            metalness={0}
          />
        ) : (
          <meshBasicMaterial color="#ffd28a" />
        )}
      </mesh>
      {/* Inner halo — tight bright corona. */}
      <mesh ref={haloRef}>
        <sphereGeometry args={[SUN_RADIUS * 1.35, 32, 32]} />
        <meshBasicMaterial
          color="#ffd06a"
          transparent
          opacity={0.45}
          blending={AdditiveBlending}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      {/* Outer halo — soft amber bloom. */}
      <mesh>
        <sphereGeometry args={[SUN_RADIUS * 2.2, 32, 32]} />
        <meshBasicMaterial
          color="#ffb060"
          transparent
          opacity={0.18}
          blending={AdditiveBlending}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      {/* The point-light source that lights everything else in the
          scene. Sits at the same origin as the visible sun so the
          terminator on Earth aligns with the visible light source. */}
      <pointLight
        intensity={3.2}
        color="#fff5d6"
        distance={0}
        decay={0}
      />
    </group>
  )
}
