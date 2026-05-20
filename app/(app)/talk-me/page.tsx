import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GlassPanel } from "@/components/GlassPanel";
import { TalkMeLogger } from "./TalkMeLogger";

export const dynamic = "force-dynamic";

export default async function TalkMePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  const since = new Date();
  since.setDate(since.getDate() - 14);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data: recent } = await supabase
    .from("talk_me_sessions")
    .select("id, session_date, duration_minutes, lessons_completed, most_useful_sentence, shadowing_done, conversation_mode_done, created_at")
    .eq("user_id", user.id)
    .gte("session_date", sinceStr)
    .order("created_at", { ascending: false });

  const totalMins = (recent ?? []).reduce((s, r) => s + (r.duration_minutes ?? 0), 0);
  const days = new Set((recent ?? []).map((r) => r.session_date)).size;

  return (
    <div className="space-y-6">
      <GlassPanel className="p-6">
        <h1 className="text-xl font-semibold mb-1">📞 Talk Me Sessions</h1>
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          Talk Me 係外部 app — 開個 lesson 完 → 返嚟撳一吓 log。記低 most useful sentence 自動可以 mine。
        </p>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="2 週總分鐘" value={String(totalMins)} accent="lime" />
          <Stat label="2 週天數" value={String(days)} accent="sky" />
          <Stat label="平均 / 日" value={days ? String(Math.round(totalMins / days)) : "—"} accent="sakura" />
        </div>
      </GlassPanel>

      <GlassPanel className="p-5">
        <h2 className="text-sm font-semibold mb-3">+ Log a session</h2>
        <TalkMeLogger />
      </GlassPanel>

      {(recent ?? []).length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold px-1">Recent 14 days</h2>
          <div className="space-y-2">
            {(recent ?? []).map((r) => (
              <GlassPanel key={r.id} variant="subtle" className="p-3">
                <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                  <span>{r.session_date}</span>
                  <span>· {r.duration_minutes ?? 0} min</span>
                  {r.shadowing_done && <span className="px-1.5 py-0.5 rounded bg-[var(--accent-lime)]/10 text-[var(--accent-lime)]">shadowing</span>}
                  {r.conversation_mode_done && <span className="px-1.5 py-0.5 rounded bg-[var(--accent-sakura)]/10 text-[var(--accent-sakura)]">conversation</span>}
                </div>
                {r.lessons_completed?.length > 0 && (
                  <div className="text-xs text-[var(--text-secondary)] mt-1">{r.lessons_completed.join(", ")}</div>
                )}
                {r.most_useful_sentence && (
                  <div className="text-sm font-jp mt-1.5">「{r.most_useful_sentence}」</div>
                )}
              </GlassPanel>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: "lime" | "sky" | "sakura" }) {
  const color = { lime: "text-[var(--accent-lime)]", sky: "text-[var(--accent-sky)]", sakura: "text-[var(--accent-sakura)]" }[accent];
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
