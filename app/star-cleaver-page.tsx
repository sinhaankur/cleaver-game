"use client"

/**
 * Star Cleaver page — full-bleed game container.
 *
 * Mounts the Cleaver Engine with the Star Cleaver game's config.
 * The engine itself is the reusable module
 * ([components/cleaver-engine/](../components/cleaver-engine/));
 * the config below is what makes *this* page Star Cleaver and not
 * some other game built on the same engine.
 */

import dynamic from "next/dynamic"
import { STAR_CLEAVER_CONFIG } from "@/games/star-cleaver.config"

const CleaverEngine = dynamic(
  () => import("@/components/cleaver-engine").then((m) => m.CleaverEngine),
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
      <CleaverEngine config={STAR_CLEAVER_CONFIG} />
    </div>
  )
}
