# Star Cleaver

A 3D R3F defender game. An autonomous weapon. Seven worlds. Wave after wave. Hold the line.

Side project by [Ankur Sinha](https://www.sinhaankur.com). Lives at [cleaver.sinhaankur.com](https://cleaver.sinhaankur.com).

## Local dev

```bash
pnpm install
pnpm dev   # http://localhost:3000
```

`pnpm build` runs the Next.js static export → `out/`.

## Stack

- Next.js 16 (Turbopack, `output: "export"`)
- React 19
- React Three Fiber 9 + Three.js 0.181
- Tailwind v4
- Deploys to GitHub Pages via the workflow in `.github/workflows/deploy.yml`

## Where things live

- [`app/page.tsx`](app/page.tsx) — the route entry, lazy-loads the game
- [`components/star-cleaver/`](components/star-cleaver/) — game state, scene, HUD
- [`components/star-field/`](components/star-field/) — the engine's `BrightStarField`, copied from the [main portfolio's Universe Engine](https://github.com/sinhaankur/portfolio-2026)
- [`lib/bright-stars.ts`](lib/bright-stars.ts) — the HYG v4.1 catalog (~8,920 naked-eye stars, public domain)

## Ship roster

Three procedural silhouettes — Star Wars-inspired but built from R3F primitives, no IP-protected geometry ingested:

- **Cleaver** — Lambda-shuttle-flavoured player ship
- **Alien mothership** — Venator-flavoured background presence
- **Alien fighter** — TIE-shuttle-flavoured wave-spawned enemy
