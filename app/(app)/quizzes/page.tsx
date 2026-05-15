import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GlassPanel } from "@/components/GlassPanel";
import { Check, X } from "lucide-react";

export default async function QuizzesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: attempts } = await supabase
    .from("quiz_attempts")
    .select("id, quiz_type, prompt, user_answer, correct_answer, is_correct, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const total = attempts?.length ?? 0;
  const correct = (attempts ?? []).filter((a) => a.is_correct).length;
  const rate = total ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold mb-1">小測紀錄</h1>
        <p className="text-sm text-[var(--text-secondary)]">最近 100 次答題。</p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <GlassPanel className="p-5 text-center">
          <div className="text-[10px] tracking-[0.2em] text-[var(--text-muted)] uppercase mb-1">總題數</div>
          <div className="text-2xl font-semibold tabular-nums">{total}</div>
        </GlassPanel>
        <GlassPanel className="p-5 text-center">
          <div className="text-[10px] tracking-[0.2em] text-[var(--text-muted)] uppercase mb-1">答對</div>
          <div className="text-2xl font-semibold tabular-nums text-[var(--success)]">{correct}</div>
        </GlassPanel>
        <GlassPanel className="p-5 text-center">
          <div className="text-[10px] tracking-[0.2em] text-[var(--text-muted)] uppercase mb-1">正確率</div>
          <div className="text-2xl font-semibold tabular-nums text-[var(--accent-lime)]">{rate}%</div>
        </GlassPanel>
      </div>

      {(attempts ?? []).length === 0 ? (
        <GlassPanel variant="subtle" className="p-10 text-center text-sm text-[var(--text-secondary)]">
          還沒有答題紀錄。打開詞庫的「小測」分頁開始作答吧。
        </GlassPanel>
      ) : (
        <GlassPanel className="p-3">
          <div className="divide-y divide-white/5">
            {(attempts ?? []).map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-2 py-2.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center ${
                    a.is_correct ? "bg-emerald-500/15 text-[var(--success)]" : "bg-red-500/10 text-[var(--danger)]"
                  }`}
                >
                  {a.is_correct ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-jp text-sm truncate">{a.prompt}</div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">
                    你的答案：{a.user_answer ?? "—"}　·　正確：{a.correct_answer ?? "—"}
                  </div>
                </div>
                <div className="text-[10px] text-[var(--text-muted)] tabular-nums">
                  {new Date(a.created_at).toLocaleDateString("zh-Hant-TW")}
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}
    </div>
  );
}
