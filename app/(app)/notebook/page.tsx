import { redirect } from "next/navigation";
import { Notebook } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NotebookWorkspace } from "./NotebookWorkspace";
import type { NotebookEntry, NotebookFolder } from "@/lib/notebook/types";

export default async function NotebookPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
  if (!user) redirect("/login");

  const [{ data: folders }, { data: entries }] = await Promise.all([
    supabase
      .from("notebook_folders")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("notebook_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(500),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.045] text-[var(--accent-lime)]">
          <Notebook className="w-5 h-5" />
        </span>
        <div>
          <p className="section-eyebrow mb-1">Notebook</p>
          <h1 className="text-2xl md:text-3xl font-semibold">筆記本</h1>
          <p className="body-pretty mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
            隨手收藏單字、片語與摘抄，用資料夾整理，不影響複習排程。
          </p>
        </div>
      </header>

      <NotebookWorkspace
        initialFolders={(folders ?? []) as NotebookFolder[]}
        initialEntries={(entries ?? []) as NotebookEntry[]}
      />
    </div>
  );
}
