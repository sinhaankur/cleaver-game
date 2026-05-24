"use client"

/**
 * Star Cleaver — game state.
 *
 * Chase-shooter framing. The Cleaver pursues alien fighters
 * through deep space; you fly forward continuously, the world
 * streaks past, and you hold the trigger to keep a beam on
 * target. Aliens have HP and weave / bank to break the lock;
 * any that get past you damage the world behind you.
 *
 * Phases:
 *  - title:      splash screen
 *  - briefing:   world named, "Engage" or auto-advance between waves
 *  - combat:     flying, button NOT held
 *  - firing:     flying, button HELD — beam emits continuously
 *  - victory:    all waves cleared
 *  - defeat:     planet health hit zero
 *  - paused:     pause overlay
 *
 * Aim updates whenever a pointer is over the scene; the beam
 * fires while the button is held and resolves per-frame, so a
 * sustained lock on a target burns through its HP in ~250ms.
 */

export type Phase =
  | "title"
  | "briefing"
  | "combat"
  | "firing"
  | "victory"
  | "defeat"
  | "paused"

export type GameState = {
  phase: Phase
  /** Which world we're defending (0..WORLDS.length-1). */
  worldIndex: number
  /** Wave within the current world (0-indexed). */
  wave: number
  /** 0..1 — drops when aliens reach the planet. Defeat at 0. */
  planetHealth: number
  /** Cumulative score across waves. */
  score: number
  /** Weapon heat 0..1. Builds while firing; cools while idle. At 1 the
   *  weapon force-cools for a moment (forced cooldown) so the player
   *  can't camp the trigger. Gentle limit, not punitive. */
  heat: number
  /** Aim point in normalized space (-1..1 each axis). */
  aim: { x: number; y: number }
  /** Whether the title screen still shows the origin-video link. */
  showOriginLink: boolean
  /** Tutorial nudge — shown on first combat, dismissed after the first
   *  hit or after a few seconds. */
  showTutorial: boolean
}

export const INITIAL_STATE: GameState = {
  phase: "title",
  worldIndex: 0,
  wave: 0,
  planetHealth: 1,
  score: 0,
  heat: 0,
  aim: { x: 0, y: 0 },
  showOriginLink: true,
  showTutorial: true,
}

/** Beam visible duration is now continuous — these constants drive the
 *  per-frame DPS math the AlienSwarm uses to burn down HP. */

/** How fast heat builds per second of firing. 1.0 = full bar in 1s of fire. */
export const HEAT_PER_SEC_FIRING = 0.55
/** How fast heat cools per second when not firing. */
export const HEAT_COOL_PER_SEC = 0.65
/** Force-cooldown threshold — at this heat level, fire button is auto-released. */
export const HEAT_OVERLOAD = 1.0
/** Below this heat level, weapon can fire again after an overload. */
export const HEAT_REENGAGE = 0.4

/** Hit radius for the beam — perpendicular distance from beam centreline
 *  to alien for a hit. Generous on purpose; aliens have HP so a graze
 *  doesn't kill. */
export const BEAM_HIT_RADIUS = 1.5

/** DPS the beam applies per second of continuous contact. An alien with
 *  HP 1 dies after ~0.4s of sustained beam exposure (with the default
 *  HP of 1.5 below). */
export const BEAM_DPS = 4.0

/** Default alien HP. Single hit on a stationary alien is ~0.25s of beam. */
export const ALIEN_HP_BASE = 1.5

/** Waves per world. */
export const WAVES_PER_WORLD = 4

/** Base enemies for wave 0. Earlier values made the first wave brutal
 *  for a first-time player; 3 lets the player learn before the count
 *  ramps. */
export const ENEMIES_BASE = 3

/** Planet damage per alien that gets past the Cleaver. Lower = more
 *  forgiving. With BASE=3 + DAMAGE=0.10, you can leak 10 aliens across
 *  a world before defeat — a comfortable error budget. */
export const DAMAGE_PER_LEAK = 0.1

/** Score per alien killed. */
export const SCORE_PER_KILL = 100

/** Score bonus per wave cleared. */
export const SCORE_PER_WAVE = 250

/** Pause between waves (briefing flash). */
export const INTERWAVE_PAUSE_MS = 1800

/** True if the current phase accepts aim input. */
export function isAimable(phase: Phase): boolean {
  return phase === "combat" || phase === "firing"
}

/** True if combat is active and aliens should advance. */
export function isCombatActive(phase: Phase): boolean {
  return phase === "combat" || phase === "firing"
}

/** How many enemies should spawn in a wave. Gentle ramp: 3, 5, 6, 8. */
export function enemiesForWave(wave: number): number {
  return Math.round(ENEMIES_BASE * (1 + wave * 0.4))
}
