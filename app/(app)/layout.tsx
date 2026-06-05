import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { MotionShell } from "@/components/MotionShell";
import { SelectionInspector } from "@/components/SelectionInspector";
import { OSBuddyDock } from "@/components/os-buddy/OSBuddyDock";
import { OSBuddyShortcutController } from "@/components/os-buddy/OSBuddyShortcutController";
import { fetchDueReviewBreakdown } from "@/lib/os/queries";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) {
    console.error("[app layout] auth:", authError.message);
  }
  if (!user?.id) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("display_name, show_romaji")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[app layout] profiles:", profileError.message);
  }

  const dueReviewBreakdown = await fetchDueReviewBreakdown(supabase, user.id);
  if (dueReviewBreakdown.errors.length) {
    console.error("[app layout] due reviews:", dueReviewBreakdown.errors.join(" / "));
  }

  return (
    <div className="app-shell flex min-h-[100dvh]">
      <a href="#app-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 btn-primary">
        跳到主要內容
      </a>
      <Sidebar displayName={profile?.display_name} />
      <div className="app-workspace">
        <TopBar
          streak={0}
          dueCount={dueReviewBreakdown.total}
          dueBreakdown={{
            vocab: dueReviewBreakdown.vocab,
            sentence: dueReviewBreakdown.sentence,
          }}
          displayName={profile?.display_name}
        />
        <main id="app-content" className="app-content-frame mx-auto max-w-[1460px] px-4 py-5 md:px-6 md:py-7 xl:px-8">
          <MotionShell>{children}</MotionShell>
        </main>
        <SelectionInspector />
        <OSBuddyShortcutController />
        <OSBuddyDock />
      </div>
    </div>
  );
}
