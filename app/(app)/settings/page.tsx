import Link from "next/link";
import { ArrowRight, BellRing, SlidersHorizontal, Target } from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OSBuddySettingsSection } from "@/components/os-buddy/OSBuddySettingsSection";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, show_romaji, preferred_voice, default_jlpt_level, daily_word_count")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold mb-1">設定</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          個人偏好留在這裡；學習合約、截止日和每日模式放在目標頁。
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <GlassPanel variant="subtle" className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
            <h2 className="text-sm font-semibold">個人偏好</h2>
          </div>
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            顯示名稱、羅馬字、語音聲線和預設難度會影響全站呈現方式。
          </p>
        </GlassPanel>

        <GlassPanel variant="subtle" className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
            <h2 className="text-sm font-semibold">學習合約</h2>
          </div>
          <p className="mb-4 text-sm leading-6 text-[var(--text-secondary)]">
            JLPT 目標、截止日、每日時間和每週配額會直接影響儀表板任務。
          </p>
          <Link href="/goals" className="btn-ghost w-fit text-sm">
            調整目標
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </GlassPanel>

        <GlassPanel variant="subtle" className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <BellRing className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
            <h2 className="text-sm font-semibold">提醒節奏</h2>
          </div>
          <p className="mb-4 text-sm leading-6 text-[var(--text-secondary)]">
            到期複習、每日輸入、連續學習補救和每週修復提醒集中在提醒頁調整。
          </p>
          <Link href="/notifications" className="btn-ghost w-fit text-sm">
            調整提醒
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </GlassPanel>
      </section>

      <GlassPanel className="p-6 md:p-8">
        <h2 className="mb-5 text-base font-semibold">個人偏好</h2>
        <SettingsForm
          initial={{
            displayName: profile?.display_name ?? "",
            showRomaji: profile?.show_romaji ?? true,
            preferredVoice: profile?.preferred_voice ?? "Takumi",
            defaultJlptLevel: profile?.default_jlpt_level ?? "N5",
            dailyWordCount: profile?.daily_word_count ?? 10,
          }}
        />
      </GlassPanel>

      <GlassPanel className="p-6 md:p-8">
        <OSBuddySettingsSection />
      </GlassPanel>
    </div>
  );
}
