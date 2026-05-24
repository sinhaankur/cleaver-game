# Cleaver Engine

A chase-shooter game layer that sits **on top of the [Universe Engine](../universe-engine/)** ecosystem. The Universe Engine is the foundation — it knows about real stars, planets, J2000 coordinates, the things that exist in space. The Cleaver Engine knows about a game played *inside* that universe — flight feel, alien fighters, beam combat, narrative arcs, victory + defeat states.

```
Universe Engine          (the ecosystem — real space, used by website + games)
   ↑
Cleaver Engine           (game layer — chase combat, ships, HUD, narrative)
   ↑
Star Cleaver config      (this specific game — worlds + story)
```

The game (Star Cleaver) is a config object. The engine reads the config and renders the game *inside* the Universe Engine's universe. A sibling game would be a different config; the engine stays untouched. Eventually a third layer on top of the Universe Engine (a different game, a tour, a visualization) would reuse the ecosystem the same way.

This file documents the Cleaver Engine layer. The Star Cleaver game's config lives in [`games/star-cleaver.config.ts`](../../games/star-cleaver.config.ts).

## The seam

The engine knows nothing about Star Wars ships, alien fleets, or Mars. It knows:

- **How to fly** — a player ship that banks with aim, with engine trail + camera sway tuned for forward motion.
- **How to chase** — alien fighters with HP, evasion patterns, panic-bank when hit.
- **How to fire** — a continuous hitscan beam with heat / overload mechanics, generous hit cone with falloff.
- **How to escalate** — N waves per world, M worlds per playthrough, configurable difficulty curve.
- **How to narrate** — title / briefing / victory / defeat overlays driven by config copy.

A game is a `CleaverEngineConfig` object: a list of `DefendedWorld[]` + a `narrative` block.

```tsx
import { CleaverEngine } from "@/components/cleaver-engine"
import { STAR_CLEAVER_CONFIG } from "@/games/star-cleaver.config"

<CleaverEngine config={STAR_CLEAVER_CONFIG} />
```

A sibling game on this same engine would create a new config file and pass it. The engine would render it with no code changes.

## File layout

```
components/cleaver-engine/
├── index.tsx     # <CleaverEngine config={...} /> — state machine + HUD + overlays
├── scene.tsx     # all R3F scene components (player, aliens, beam, planet, backdrop)
├── state.ts      # Phase enum, GameState shape, tuning constants
└── targets.ts    # DefendedWorld type (just the type — data lives in game config)
```

### `index.tsx` — controller
Owns React state for the high-level phase (`title / briefing / combat / firing / victory / defeat / paused`). Runs a single `requestAnimationFrame` loop while engaged that handles both weapon heat AND continuous beam damage on aliens. Renders DOM overlays + the HUD on top of the Canvas.

### `scene.tsx` — R3F scene
- `DefendedPlanet` — the planet being defended; takes a `DefendedWorld` config
- `CleaverShip` — player ship (Lambda-flavoured procedural mesh)
- `AlienSwarm` — pooled alien fleet, supports continuous `damageBeam(origin, dir, dt, dps)`
- `VenatorMothership` — looming background enemy capital ship
- `RebelTransport` + `XWingSquadron` — friendly scenery
- `Beam` — continuous-fire visual
- `MotionDebris` — streaking parallax sparks that sell forward motion
- `CameraBreath` — fixed-position camera with sway + bob

### `state.ts` — tuning constants
All gameplay numbers in one place. Tweak these to retune feel:
- `MIN_CHARGE_TO_FIRE` — removed; firing is now hold-to-fire continuous
- `HEAT_PER_SEC_FIRING` / `HEAT_COOL_PER_SEC` — weapon thermal model
- `HEAT_OVERLOAD` / `HEAT_REENGAGE` — overload + cooldown thresholds
- `BEAM_HIT_RADIUS` / `BEAM_DPS` — hitscan geometry + damage rate
- `ALIEN_HP_BASE` — per-alien hit points
- `WAVES_PER_WORLD` / `ENEMIES_BASE` / `enemiesForWave(n)` — escalation
- `DAMAGE_PER_LEAK` — planet integrity drop per escaped alien
- `SCORE_PER_KILL` / `SCORE_PER_WAVE` — scoring

## Design principles

**Asymmetry by construction.** The player ship is heavy (slower roll damping, longer commit to a heading). The aliens are fast and fragile (1.5 HP, panic-bank lateral kicks when hit). The dynamic tension is: lock the beam early, hold it through the bank.

**Hold-to-fire continuous beam.** No charge-and-release. Pressing keeps the beam on a target; releasing lets the weapon cool. The heat bar is the limiting resource — overload forces a brief mandatory cooldown.

**Forgiving hit geometry.** The beam is a cylinder with a 1.5-scene-unit radius and graze falloff (centre = full DPS, edge = ~30% DPS). Encourages good aim without punishing first-time players.

**Reverence by inversion.** The seven defended worlds are real bodies (Earth, Mars, Europa, Titan, Proxima b, TRAPPIST-1e, Kepler-186f). The Cleaver isn't destroying them — it's keeping them intact. Engine canon stays clean; the moral architecture of the game is "save what is real."

## What's deliberately NOT in the engine

These are *game config* concerns, not engine concerns. Don't add them here:

- World-specific ship rosters (a sibling game might have no X-Wings)
- Story copy (title, intro, briefings)
- Difficulty presets
- Per-world music / sound profiles

If a future game needs different ships visible in the scene, those become config-driven too — add a `ships` field to `CleaverEngineConfig` and have the scene render whichever the config supplies.

## What lives outside the engine

- [`games/star-cleaver.config.ts`](../../games/star-cleaver.config.ts) — Star Cleaver's specific worlds + narrative
- [`components/universe-engine/`](../universe-engine/) — the slice of the Universe Engine ecosystem the game uses today (currently just `BrightStarField` + the HYG catalog). Grows as the game pulls more from the ecosystem.
- [`app/star-cleaver-page.tsx`](../../app/star-cleaver-page.tsx) — the page that mounts the engine with Star Cleaver's config

## Adding a second game

```
games/your-game.config.ts            # define worlds + narrative
app/your-game-page.tsx               # mount <CleaverEngine config={YOUR_GAME_CONFIG} />
app/your-game/page.tsx               # Next.js route, e.g. /your-game/
```

Engine code stays untouched. That's the seam working.
