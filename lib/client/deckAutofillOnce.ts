/**
 * Single in-flight POST per deckId so navigating away does not abort the request
 * (no AbortController tied to React unmount). Multiple mounts await the same promise.
 */
const inflight = new Map<string, Promise<{ res: Response; data: DeckAutofillClientData }>>();

export type DeckAutofillClientData = {
  skipped?: boolean;
  reason?: string;
  ok?: boolean;
  error?: string;
  memoryImageFailures?: number;
  connectionStepFailed?: boolean;
};

const AUTOFILL_TIMEOUT_MS = 295_000;

export function fetchDeckAutofillOnce(deckId: string): Promise<{ res: Response; data: DeckAutofillClientData }> {
  const existing = inflight.get(deckId);
  if (existing) return existing;

  async function run(): Promise<{ res: Response; data: DeckAutofillClientData }> {
    const signal =
      typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
        ? AbortSignal.timeout(AUTOFILL_TIMEOUT_MS)
        : undefined;

    const res = await fetch("/api/ai/deck-auto-fill", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deckId }),
      ...(signal ? { signal } : {}),
    });
    const data = (await res.json().catch(() => ({}))) as DeckAutofillClientData;
    return { res, data };
  }

  const p = run().finally(() => {
    inflight.delete(deckId);
  });
  inflight.set(deckId, p);
  return p;
}
