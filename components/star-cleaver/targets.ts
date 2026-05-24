/**
 * Defended worlds — the stakes of each level.
 *
 * These are REAL bodies. The Cleaver isn't destroying them; it's
 * keeping them intact. That's the entire moral architecture of
 * this build — the engine's reverence stance is preserved because
 * nothing real gets destroyed; aliens take damage, planets get
 * saved.
 *
 * Each world has:
 *  - id: stable key
 *  - name: display name (real)
 *  - kind: short qualifier ("home world", "moon", "exoplanet", …)
 *  - radius: scene-units for the background planet sphere
 *  - color1/color2: surface palette tuned to the real body
 *  - rotationSpeed: rad/s (cosmetic, just gives the disc life)
 *  - atmoColor: subtle rim glow tint
 *  - briefing: defender flavour copy for the briefing overlay
 */
export type DefendedWorld = {
  id: string
  name: string
  kind: string
  radius: number
  color1: string
  color2: string
  rotationSpeed: number
  atmoColor: string
  briefing: string
}

export const WORLDS: DefendedWorld[] = [
  {
    id: "earth",
    name: "Earth",
    kind: "home world",
    radius: 3.6,
    color1: "#3a76b8",
    color2: "#1a3a5a",
    rotationSpeed: 0.06,
    atmoColor: "#8ab6e8",
    briefing:
      "First contact, first front. Eight billion souls. CR-90 transports are running evacuation drills they always hoped to never need. Don't let them need a second run.",
  },
  {
    id: "mars",
    name: "Mars",
    kind: "outpost · where the Cleaver woke",
    radius: 3.0,
    color1: "#c46b3b",
    color2: "#5a2818",
    rotationSpeed: 0.07,
    atmoColor: "#e8a070",
    briefing:
      "The Cleaver was buried in the dust here. You fly it back to defend the dome cities you took it from. Three thousand colonists below. The aliens want what is under them more.",
  },
  {
    id: "europa",
    name: "Europa",
    kind: "moon (Jupiter)",
    radius: 2.4,
    color1: "#dfe4ec",
    color2: "#6c7888",
    rotationSpeed: 0.05,
    atmoColor: "#bfd2e8",
    briefing:
      "Liquid ocean under the ice. Whatever lives down there has never known a war. Wedge fighters inbound from the gas giant's shadow — keep them from the surface.",
  },
  {
    id: "titan",
    name: "Titan",
    kind: "moon (Saturn)",
    radius: 2.9,
    color1: "#caa66e",
    color2: "#5e3e1a",
    rotationSpeed: 0.05,
    atmoColor: "#f0c890",
    briefing:
      "Methane seas, organic haze. The X-Wing squadron has been running CAP for three days. You are their relief. They have earned it.",
  },
  {
    id: "proxima-b",
    name: "Proxima Centauri b",
    kind: "exoplanet · 4.2 ly · first crossing",
    radius: 3.2,
    color1: "#a04c4c",
    color2: "#3a1818",
    rotationSpeed: 0.04,
    atmoColor: "#d68080",
    briefing:
      "Four light-years out — humanity's first alien shore. Distress signals from the colony. If no one is left to receive them, the aliens win the next world without firing.",
  },
  {
    id: "trappist-1e",
    name: "TRAPPIST-1e",
    kind: "exoplanet · 40 ly",
    radius: 3.0,
    color1: "#5a8c6e",
    color2: "#1a3a2a",
    rotationSpeed: 0.05,
    atmoColor: "#90c8a8",
    briefing:
      "Forty light-years. The fleet is thinner now. Transports run with empty bays — but they run. The Cleaver is the only thing between TRAPPIST-1 and silence.",
  },
  {
    id: "kepler-186f",
    name: "Kepler-186f",
    kind: "exoplanet · 580 ly · the origin",
    radius: 3.3,
    color1: "#7a6cb8",
    color2: "#1f1a3a",
    rotationSpeed: 0.04,
    atmoColor: "#a89cd6",
    briefing:
      "Five hundred and eighty light-years from Sol. This is where the weapon was originally built, by the civilisation that lost. The Cleaver remembers this place. End it here.",
  },
]

export const WORLD_COUNT = WORLDS.length
