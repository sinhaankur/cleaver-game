"use client"

/**
 * Star Cleaver page — full-bleed game container.
 *
 * Lazy-loads the game module so the R3F bundle isn't blocking
 * first paint. The fallback is a black void; first paint is sub-
 * second on a normal connection.
 */

import dynamic from "next/dynamic"

const StarCleaver = dynamic(
  () => import("@/components/star-cleaver").then((m) => m.StarCleaver),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/40">
          Initialising…
        </div>
      </div>
    ),
  },
)

export function StarCleaverPage() {
  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden">
      <StarCleaver />
    </div>
  )
}
