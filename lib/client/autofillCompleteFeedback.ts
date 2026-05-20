/** Short "ding" using Web Audio (no asset file). Best-effort: may be blocked until a user gesture. */
export function playAutofillCompleteChime(): void {
  if (typeof window === "undefined") return;
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const resume = ctx.state === "suspended" ? ctx.resume() : Promise.resolve();
    void resume.then(() => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.setValueAtTime(1174, ctx.currentTime + 0.08);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.38);
      o.onended = () => {
        try {
          void ctx.close();
        } catch {
          /* ignore */
        }
      };
    });
  } catch {
    /* autoplay / AudioContext policy */
  }
}

const recentChimeByDeck = new Map<string, number>();

/** Avoid double chime when Strict Mode or duplicate listeners await the same autofill promise. */
export function playAutofillCompleteChimeDeduped(deckId: string): void {
  const now = Date.now();
  const prev = recentChimeByDeck.get(deckId) ?? 0;
  if (now - prev < 2800) return;
  recentChimeByDeck.set(deckId, now);
  playAutofillCompleteChime();
}

/** Desktop-style notification only if permission already granted (no prompt). */
function notifyAutofillCompleteIfPermitted(deckTitle: string): void {
  if (typeof window === "undefined" || typeof Notification === "undefined") return;
  try {
    if (Notification.permission === "granted") {
      new Notification("詞庫自動補充完成", {
        body: deckTitle,
        silent: true,
      });
    }
  } catch {
    /* ignore */
  }
}

const recentNotifyByDeck = new Map<string, number>();

export function notifyAutofillCompleteIfPermittedDeduped(deckId: string, deckTitle: string): void {
  const now = Date.now();
  const prev = recentNotifyByDeck.get(deckId) ?? 0;
  if (now - prev < 2800) return;
  recentNotifyByDeck.set(deckId, now);
  notifyAutofillCompleteIfPermitted(deckTitle);
}
