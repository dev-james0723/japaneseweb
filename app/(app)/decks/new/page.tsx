import Link from "next/link";
import { CreateDeckClient } from "./CreateDeckClient";

export default async function NewDeckPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const initialMode = (["manual", "ai", "ocr"].includes(mode ?? "") ? mode : "manual") as
    | "manual"
    | "ai"
    | "ocr";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
        <Link href="/dashboard" className="hover:text-white">今日總覽</Link>
        <span>/</span>
        <span className="text-white">建立詞庫</span>
      </div>

      <header>
        <h1 className="text-2xl md:text-3xl font-semibold mb-1">建立今日詞庫</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          選一個來源，建立今天要學的單字組。
        </p>
      </header>

      <CreateDeckClient initialMode={initialMode} />
    </div>
  );
}
