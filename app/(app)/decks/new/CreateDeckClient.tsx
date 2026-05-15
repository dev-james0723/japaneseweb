"use client";

import { useState } from "react";
import clsx from "clsx";
import { Keyboard, Sparkles, ImageUp } from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import { ManualInputForm } from "./ManualInputForm";
import { AIGenerateForm } from "./AIGenerateForm";
import { OCRUploadForm } from "./OCRUploadForm";

type Mode = "manual" | "ai" | "ocr";

const TABS: { id: Mode; label: string; icon: React.ReactNode; sub: string }[] = [
  { id: "manual", label: "手動輸入", icon: <Keyboard className="w-4 h-4" />, sub: "貼上單字清單" },
  { id: "ai", label: "AI 生成", icon: <Sparkles className="w-4 h-4" />, sub: "選主題自動生成" },
  { id: "ocr", label: "圖片 OCR", icon: <ImageUp className="w-4 h-4" />, sub: "Gemini 抽取教材" },
];

export function CreateDeckClient({ initialMode }: { initialMode: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setMode(t.id)}
            className={clsx(
              "glass-panel-subtle px-4 py-3 text-left transition-all",
              mode === t.id
                ? "!border-[rgba(200,229,58,0.4)] !bg-[var(--accent-lime-bg)]"
                : "hover:bg-white/[0.08]",
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className={clsx(
                  "w-7 h-7 rounded-lg flex items-center justify-center",
                  mode === t.id ? "bg-[var(--accent-lime-bg)] text-[var(--accent-lime)]" : "bg-white/5",
                )}
              >
                {t.icon}
              </span>
              <span className="text-sm font-medium">{t.label}</span>
            </div>
            <div className="text-xs text-[var(--text-muted)] pl-9">{t.sub}</div>
          </button>
        ))}
      </div>

      <GlassPanel className="p-6 md:p-8">
        {mode === "manual" && <ManualInputForm />}
        {mode === "ai" && <AIGenerateForm />}
        {mode === "ocr" && <OCRUploadForm />}
      </GlassPanel>
    </div>
  );
}
