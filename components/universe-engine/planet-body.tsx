"use client"

/**
 * TexturedPlanet — Universe Engine-flavoured planet rendering.
 *
 * Mirrors the texture-loading + day/night terminator approach the
 * portfolio's Universe Engine uses for Earth/Mars/etc. Stripped
 * down to what the game needs:
 *   - Load a day-side equirectangular texture (NASA Blue Marble for
 *     Earth, Solar System Scope CC BY for the rest).
 *   - Optionally load a night-side texture (Earth city lights). If
 *     present, the terminator shader blends day → night smoothly
 *     based on the sun direction; if absent, the shadow side just
 *     falls to ambient dark.
 *   - Soft atmospheric rim using additive blending on a slightly
 *     larger sphere — gives Earth its cyan limb glow, Mars its
 *     salmon haze, etc.
 *   - Rotates the planet at its real rotational speed.
 *
 * Not included (vs the full engine PlanetBody): orbital motion,
 * hover/focus state, surface-feature pins, atmosphere bloom on
 * hover, click-to-fly. Those are website concerns; the game has
 * its own state.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { useFrame } from "@react-three/fiber"
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  Group,
  type ShaderMaterial,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
  Vector3,
} from "three"

const DAY_NIGHT_VERTEX = /* glsl */ `
  varying vec3 vNormalW;
  varying vec2 vUv;
  void main() {
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const DAY_NIGHT_FRAGMENT = /* glsl */ `
  uniform sampler2D uDayMap;
  uniform sampler2D uNightMap;
  uniform vec3 uSunDir;
  uniform float uSoftness;
  varying vec3 vNormalW;
  varying vec2 vUv;
  void main() {
    vec3 day = texture2D(uDayMap, vUv).rgb;
    vec3 night = texture2D(uNightMap, vUv).rgb;
    float ndl = dot(normalize(vNormalW), normalize(uSunDir));
    float lit = smoothstep(-uSoftness, uSoftness, ndl);
    // City lights pop a little — slight gain on the night-side mix.
    vec3 col = mix(night * 1.4, day, lit);
    gl_FragColor = vec4(col, 1.0);
  }
`

const DAY_ONLY_VERTEX = /* glsl */ `
  varying vec3 vNormalW;
  varying vec2 vUv;
  void main() {
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const DAY_ONLY_FRAGMENT = /* glsl */ `
  uniform sampler2D uDayMap;
  uniform vec3 uSunDir;
  uniform float uAmbient;
  varying vec3 vNormalW;
  varying vec2 vUv;
  void main() {
    vec3 day = texture2D(uDayMap, vUv).rgb;
    float ndl = dot(normalize(vNormalW), normalize(uSunDir));
    float lit = clamp(ndl * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = day * (uAmbient + (1.0 - uAmbient) * lit);
    gl_FragColor = vec4(col, 1.0);
  }
`

const RIM_VERTEX = /* glsl */ `
  varying vec3 vNormalW;
  void main() {
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const RIM_FRAGMENT = /* glsl */ `
  varying vec3 vNormalW;
  uniform vec3 uColor;
  void main() {
    float rim = pow(1.0 - clamp(dot(vNormalW, vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 2.5);
    gl_FragColor = vec4(uColor * 0.7, rim * 0.6);
  }
`

export function TexturedPlanet({
  radius,
  textureUrl,
  nightTextureUrl,
  atmoColor,
  rotationSpeed,
  /** Sun direction in world space — slightly off-axis for a
   *  cinematic crescent. Defaults match the procedural fallback's
   *  light direction so the two planet kinds read consistently. */
  sunDir,
}: {
  radius: number
  textureUrl: string
  nightTextureUrl?: string
  atmoColor?: string
  rotationSpeed: number
  sunDir?: Vector3
}) {
  const groupRef = useRef<Group>(null)
  const dnMatRef = useRef<ShaderMaterial>(null)
  const dayMatRef = useRef<ShaderMaterial>(null)
  const [dayTex, setDayTex] = useState<Texture | null>(null)
  const [nightTex, setNightTex] = useState<Texture | null>(null)

  // Eager-load the textures on mount. TextureLoader is async; the
  // mesh renders without the sampler until they arrive, then pops
  // in. Acceptable here because the planet is the largest visual
  // element — there's no graceful fade needed.
  useEffect(() => {
    const loader = new TextureLoader()
    loader.load(textureUrl, (tex) => {
      tex.colorSpace = SRGBColorSpace
      tex.anisotropy = 8
      setDayTex(tex)
    })
  }, [textureUrl])

  useEffect(() => {
    if (!nightTextureUrl) {
      setNightTex(null)
      return
    }
    const loader = new TextureLoader()
    loader.load(nightTextureUrl, (tex) => {
      tex.colorSpace = SRGBColorSpace
      tex.anisotropy = 8
      setNightTex(tex)
    })
  }, [nightTextureUrl])

  const defaultSunDir = useMemo(
    () => sunDir ?? new Vector3(0.7, 0.4, 0.5).normalize(),
    [sunDir],
  )

  const rimColor = useMemo(
    () => (atmoColor ? new Color(atmoColor) : null),
    [atmoColor],
  )

  useFrame((_, dt) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += rotationSpeed * dt
    }
  })

  // Texture not loaded yet — render nothing rather than a blank
  // sphere flash. The dark backdrop covers the brief gap.
  if (!dayTex) return null

  const hasNight = nightTex !== null

  return (
    <group ref={groupRef} position={[-1.5, -4.5, -20]}>
      <mesh>
        <sphereGeometry args={[radius, 96, 96]} />
        {hasNight && nightTex ? (
          <shaderMaterial
            ref={dnMatRef}
            vertexShader={DAY_NIGHT_VERTEX}
            fragmentShader={DAY_NIGHT_FRAGMENT}
            uniforms={{
              uDayMap: { value: dayTex },
              uNightMap: { value: nightTex },
              uSunDir: { value: defaultSunDir },
              uSoftness: { value: 0.08 },
            }}
          />
        ) : (
          <shaderMaterial
            ref={dayMatRef}
            vertexShader={DAY_ONLY_VERTEX}
            fragmentShader={DAY_ONLY_FRAGMENT}
            uniforms={{
              uDayMap: { value: dayTex },
              uSunDir: { value: defaultSunDir },
              uAmbient: { value: 0.18 },
            }}
          />
        )}
      </mesh>
      {/* Atmospheric rim — only if an atmo colour was provided. */}
      {rimColor && (
        <mesh scale={radius * 1.07}>
          <sphereGeometry args={[1, 32, 32]} />
          <shaderMaterial
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
            side={DoubleSide}
            vertexShader={RIM_VERTEX}
            fragmentShader={RIM_FRAGMENT}
            uniforms={{ uColor: { value: rimColor } }}
          />
        </mesh>
      )}
    </group>
  )
}
