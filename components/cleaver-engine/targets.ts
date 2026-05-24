/**
 * Cleaver Engine — defended world shape.
 *
 * The engine renders any world that matches this shape. The
 * Star Cleaver game ships a list of seven real worlds via its
 * config ([games/star-cleaver.config.ts](../../games/star-cleaver.config.ts));
 * a different game built on this engine would ship a different list.
 *
 * Shape:
 *  - id: stable key
 *  - name: display name shown in the HUD
 *  - kind: short qualifier ("home world", "moon", "exoplanet", …)
 *  - radius: scene-units for the background planet sphere
 *  - color1/color2: surface palette
 *  - rotationSpeed: rad/s (cosmetic, just gives the disc life)
 *  - atmoColor: subtle rim-glow tint
 *  - briefing: per-level flavour copy shown in the briefing overlay
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
