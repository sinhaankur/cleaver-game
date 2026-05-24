# Universe Engine (slice, mirrored)

This folder is a **mirror** of the [Universe Engine](https://github.com/sinhaankur/portfolio-2026/tree/main/components/universe-engine) from the main portfolio repo. The portfolio is the canonical source; the game is a consumer.

## What's the Universe Engine?

A self-contained 3D astronomy ecosystem: real-position stars (HYG v4.1 → 8,920 naked-eye stars), all 88 IAU constellations, 264 catalogued deep-sky objects (Messier + Caldwell + curated), 8 planets with real orbits + textures, 30+ named small bodies, 60+ spacecraft + mission history, axial tilts, proper motions, Kepler-2-correct orbital mechanics, and a scrubbable J2000-anchored sim clock.

It powers the portfolio (galaxy hero, lab pages, assistant) AND the game on this subdomain. Star Cleaver is the first game built on the ecosystem; it won't be the last.

## What's mirrored here

Today, just the bright-star background:
- `bright-star-field.tsx` — the R3F component (sky-shell point cloud, GLSL twinkle + proper motion)
- Its data dependency, `lib/bright-stars.ts` (668 KB, the HYG catalog)
- A minimal `lib/sim-time.ts` that pins the sim clock to "now" (the game doesn't use time-warp)

Future mirrors as the game pulls more from the ecosystem:
- Planet rendering (`PlanetBody`) — for defending Earth, Mars, Europa as real textured spheres at real positions
- The named-bodies catalog (Voyager, JWST, comets) — fly-by scenery
- The sky-point catalog (galaxies, nebulae) — deep-background gauze
- The Milky Way galaxy backdrop sphere
- The Sun + orbital mechanics for actual flight through Sol system

## Why mirror, not import

The two repos are intentionally separate (portfolio stays IP-clean; game ships richer assets without spillover). The Universe Engine is too small for an npm package and changes too often for a git submodule. A periodic manual copy is the right tier of overhead.

## Sync process

When the engine ships a useful upgrade on the main repo:

```bash
# from the portfolio repo
cd ~/Documents/Portfolio
git log --oneline components/universe-engine | head

# copy the file(s) you want
cp components/universe-engine/<file>.tsx ~/Documents/cleaver-game/components/universe-engine/
cp lib/data/<datafile>.ts                ~/Documents/cleaver-game/lib/

# in cleaver-game, fix any imports (engine uses @/components/universe-engine,
# @/lib/data/... — sometimes paths need adjustment), then test:
cd ~/Documents/cleaver-game && pnpm build
```

No automated drift detection yet. If this becomes a real pain point, options:
- Publish `@sinhaankur/universe-engine` to npm (cleanest, most overhead)
- Use a git subtree pull from the portfolio repo
- Move both repos under a monorepo

For now: copy when you care, ignore when you don't.
