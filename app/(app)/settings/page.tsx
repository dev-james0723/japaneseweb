import { GlassPanel } from "@/components/GlassPanel";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, show_romaji, preferred_voice, default_jlpt_level, daily_word_count")
    .eq("id", user!.id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold mb-1">設定</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          調整 Romaji 顯示、TTS 聲音與學習偏好。
        </p>
      </header>

      <GlassPanel className="p-6 md:p-8">
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
    </div>
  );
}
