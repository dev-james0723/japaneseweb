import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, show_romaji")
    .eq("id", user.id)
    .maybeSingle();

  // Lightweight metrics; full implementation in later phases.
  const today = new Date().toISOString().slice(0, 10);
  const { count: dueCount } = await supabase
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .lte("next_review_date", today);

  return (
    <div className="min-h-screen flex">
      <Sidebar displayName={profile?.display_name} />
      <div className="flex-1 min-w-0">
        <TopBar streak={0} dueCount={dueCount ?? 0} />
        <div className="px-4 md:px-6 py-6 md:py-8 max-w-[1360px] mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
