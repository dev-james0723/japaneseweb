import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProfessorChatClient } from "./ProfessorChatClient";

export const dynamic = "force-dynamic";

export default async function ProfessorPage({
  searchParams,
}: {
  searchParams: Promise<{ seed?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) redirect("/login");

  const { seed } = await searchParams;
  const topic = (seed ?? "今日想深挖的日文").slice(0, 240);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link href="/cultural" className="inline-flex items-center gap-2 text-sm text-[var(--accent)] hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        返回
      </Link>
      <GlassPanel className="p-6">
        <div className="mb-3 flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-[var(--accent-lime)]" aria-hidden="true" />
          <h1 className="text-xl font-semibold">與教授探索更多</h1>
        </div>
        <p className="font-jp text-2xl font-semibold leading-relaxed">{topic}</p>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          這裡專門深挖一個字詞或短句：語感、配搭、例句、文化背景、常見錯誤。
        </p>
      </GlassPanel>
      <GlassPanel className="p-4 md:p-5">
        <ProfessorChatClient seed={topic} />
      </GlassPanel>
    </div>
  );
}
