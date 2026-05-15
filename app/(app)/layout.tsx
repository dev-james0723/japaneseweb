import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user?.id) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("display_name, show_romaji")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[app layout] profiles:", profileError.message);
  }

  const today = new Date().toISOString().slice(0, 10);
  const { count: dueCount, error: reviewsError } = await supabase
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .lte("next_review_date", today);

  if (reviewsError) {
    console.error("[app layout] reviews:", reviewsError.message);
  }

  const due = reviewsError ? 0 : (dueCount ?? 0);

  return (
    <div className="min-h-screen flex">
      <Sidebar displayName={profile?.display_name} />
      <div className="flex-1 min-w-0">
        <TopBar streak={0} dueCount={due} />
        <div className="px-4 md:px-6 py-6 md:py-8 max-w-[1360px] mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
