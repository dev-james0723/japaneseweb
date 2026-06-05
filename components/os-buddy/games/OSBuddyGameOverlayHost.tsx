"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { KanaCatchOverlay } from "./KanaCatchOverlay";
import { FocusTapOverlay } from "./FocusTapOverlay";
import { StudyDeskResetOverlay } from "./StudyDeskResetOverlay";
import { OSBuddyPlayBallOverlay } from "./OSBuddyPlayBallOverlay";
import { emitOSBuddyEvent } from "@/lib/os-buddy/os-buddy-events";
import { useOSBuddyActions, useOSBuddyStore } from "@/lib/os-buddy/os-buddy-store";
import type { OSBuddyMiniGame } from "@/lib/os-buddy/os-buddy-types";

export function OSBuddyGameOverlayHost() {
  const game = useOSBuddyStore((state) => state.activeGame);
  const actions = useOSBuddyActions();

  useEffect(() => {
    if (game) emitOSBuddyEvent({ type: "game:start", game });
  }, [game]);

  if (!game) return null;

  function close() {
    actions.setActiveGame(null);
  }

  function complete(score?: number) {
    if (!game) return;
    emitOSBuddyEvent({ type: "game:complete", game, score });
    actions.setActiveGame(null);
  }

  return (
    <div className="fixed inset-0 z-[95] bg-black/62 px-4 py-6 backdrop-blur-md" data-os-buddy-shortcut-ignore="true">
      <div className="mx-auto flex h-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#171612]/96 shadow-[0_24px_90px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <p className="section-eyebrow mb-1">學習夥伴小遊戲</p>
            <h2 className="text-base font-semibold">{titleForGame(game)}</h2>
          </div>
          <button type="button" onClick={close} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10" aria-label="關閉小遊戲">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1">
          {game === "kana-catch" ? <KanaCatchOverlay onClose={close} onComplete={complete} /> : null}
          {game === "focus-tap" ? <FocusTapOverlay onClose={close} onComplete={complete} /> : null}
          {game === "study-desk-reset" ? <StudyDeskResetOverlay onClose={close} onComplete={complete} /> : null}
          {game === "play-ball" ? <OSBuddyPlayBallOverlay onClose={close} onComplete={complete} /> : null}
        </div>
      </div>
    </div>
  );
}

function titleForGame(game: OSBuddyMiniGame) {
  if (game === "kana-catch") return "假名接球";
  if (game === "focus-tap") return "專注點擊";
  if (game === "study-desk-reset") return "整理學習桌";
  return "拋接球";
}
