import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GlassPanel } from "@/components/GlassPanel";
import { RoleplayClient } from "./RoleplayClient";

export const dynamic = "force-dynamic";

export default async function RoleplayPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  const { data: settings } = await supabase
    .from("user_os_settings")
    .select("target_jlpt")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="space-y-4">
      <GlassPanel className="p-6">
        <h1 className="text-xl font-semibold mb-1">🎭 AI Roleplay</h1>
        <p className="text-xs text-[var(--text-secondary)]">
          選一個場景，AI 扮對手同你練對話。每句會即時糾錯 + 提示下一句點答。
        </p>
      </GlassPanel>
      <RoleplayClient defaultDifficulty={(settings?.target_jlpt as any) ?? "N4"} />
    </div>
  );
}
