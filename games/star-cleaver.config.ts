/**
 * Star Cleaver — game configuration.
 *
 * This is what makes the Cleaver Engine *into* the Star Cleaver
 * game. Swap the values below for a different list of worlds +
 * different narrative copy and you'd have a sibling game on the
 * same engine.
 *
 * The engine reads:
 *  - `worlds`: array of DefendedWorld[] — the level list. Each one
 *    is a real body the player defends in one engagement (4 waves).
 *  - `narrative`: the title screen, victory, and defeat copy. The
 *    engine handles the per-world briefings using each world's own
 *    `briefing` field, so they're not duplicated here.
 *
 * Add or remove worlds freely; the engine adapts to the length.
 */

import type { CleaverEngineConfig } from "@/components/cleaver-engine"

export const STAR_CLEAVER_CONFIG: CleaverEngineConfig = {
  worlds: [
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
  ],
  narrative: {
    workingTitle: "Working title",
    gameTitle: "Star Cleaver",
    intro: [
      "We found a weapon in the ruins on Mars.",
      "We do not know who built it. We know it works.",
      "The aliens are here. The fleet flies with you. Seven worlds.",
    ],
    beginButton: "Begin defense →",
    originVideoUrl: "https://www.youtube.com/watch?v=IGhZWH-umSk",
    victoryTitle: "They didn't get past you.",
    victoryEyebrow: "All worlds defended",
    victoryBody:
      "The Cleaver knew this place. Now you do too. Seven worlds intact. The civilisation that built the weapon lost their war here — yours did not. The fleet stands down. Earth's long-range arrays will see the next ones coming.",
    defeatTitle: "They got through.",
    defeatBody:
      "The Cleaver kept firing until the last leak. It was not enough. The remaining worlds will need someone better.",
  },
}
