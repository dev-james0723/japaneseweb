import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GlassPanel } from "@/components/GlassPanel";
import { getCanDoGoalsForPhase, pickCanDoGoal } from "@/lib/learning/communicationGoals";
import { RoleplayClient, type Difficulty } from "./RoleplayClient";

export const dynamic = "force-dynamic";

export default async function RoleplayPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  const { data: settings } = await supabase
    .from("user_os_settings")
    .select("target_jlpt, current_phase, phase_started_at")
    .eq("user_id", user.id)
    .maybeSingle();
  const phase = settings?.current_phase ?? 1;
  const now = new Date();
  const startedAt = settings?.phase_started_at ? new Date(settings.phase_started_at).getTime() : now.getTime();
  const daysIntoPhase = Math.max(1, Math.floor((now.getTime() - startedAt) / (1000 * 60 * 60 * 24)) + 1);
  const goals = getCanDoGoalsForPhase(phase);
  const defaultGoal = pickCanDoGoal(phase, daysIntoPhase);

  return (
    <div className="space-y-4">
      <GlassPanel className="p-6">
        <h1 className="mb-1 text-xl font-semibold">任務角色扮演</h1>
        <p className="text-xs text-[var(--text-secondary)]">
          選一個 Can-Do 任務，AI 扮對手同你練對話。重點是完成真實溝通目標，而不只是回覆句子。
        </p>
      </GlassPanel>
      <RoleplayClient
        defaultDifficulty={normalizeDifficulty(settings?.target_jlpt)}
        goals={goals}
        defaultGoalId={defaultGoal.id}
      />
    </div>
  );
}

function normalizeDifficulty(value: string | null | undefined): Difficulty {
  if (value === "N5" || value === "N4" || value === "N3" || value === "N2" || value === "N1") {
    return value;
  }
  return "N4";
}
