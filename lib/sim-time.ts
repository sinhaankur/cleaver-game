/**
 * Minimal sim-time ref used by BrightStarField for proper-motion
 * deformation. In the portfolio's Universe Engine this came from
 * `astronomy.ts` and was scrubbable via the time-warp slider; the
 * game doesn't expose time-warp, so we just keep it pinned to
 * "now" — the bright stars sit at their current sky positions
 * (J2000 + ~26 years), no further animation needed.
 */
export const simTimeRef = {
  current: {
    /** Epoch ms — J2000 + the wall clock at app load. */
    epochMs: Date.now(),
    /** Days advanced since epoch. Stays at 0 in the game. */
    days: 0,
  },
}
