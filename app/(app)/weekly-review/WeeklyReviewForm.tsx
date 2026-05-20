"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveWeeklyReviewAction, generateWeeklyQuizAction } from "@/lib/actions/weeklyReview";

type QuizQ =
  | { type: "mcq"; prompt_ja: string; prompt_zh?: string; options: string[]; correct_index: number; explanation_zh: string }
  | { type: "cloze"; sentence_ja: string; answer: string; hint_zh?: string };

export function WeeklyReviewForm({
  initial,
  weekStart,
  existingQuiz,
}: {
  initial: { userReflection: string; nextWeekFocus: string };
  weekStart: string;
  existingQuiz: { questions?: QuizQ[] } | null;
}) {
  const [reflection, setReflection] = useState(initial.userReflection);
  const [nextFocus, setNextFocus] = useState(initial.nextWeekFocus);
  const [quiz, setQuiz] = useState<{ questions?: QuizQ[] } | null>(existingQuiz);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  function save() {
    startTransition(async () => {
      const res = await saveWeeklyReviewAction({ weekStart, userReflection: reflection, nextWeekFocus: nextFocus });
      setMsg(res.ok ? "✓ Saved" : res.error);
      if (res.ok) {
        setTimeout(() => setMsg(null), 1500);
        router.refresh();
      }
    });
  }

  function genQuiz() {
    startTransition(async () => {
      const res = await generateWeeklyQuizAction({ weekStart });
      if (!res.ok) { setMsg(res.error); return; }
      setQuiz(res.quiz);
      setMsg("✓ Quiz generated");
      setTimeout(() => setMsg(null), 1500);
    });
  }

  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Reflection</div>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          rows={4}
          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm resize-y focus:border-[var(--accent-lime)] focus:outline-none"
          placeholder="今星期學到啲乜？邊樣最 useful？邊樣最揦埋？"
        />
      </label>
      <label className="block space-y-1">
        <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Next Week Focus</div>
        <textarea
          value={nextFocus}
          onChange={(e) => setNextFocus(e.target.value)}
          rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm resize-y focus:border-[var(--accent-lime)] focus:outline-none"
          placeholder="下星期最重要 focus 一樣嘢"
        />
      </label>
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={save} disabled={pending} className="btn-primary text-sm">{pending ? "Saving…" : "Save"}</button>
        <button onClick={genQuiz} disabled={pending} className="btn-ghost text-sm">{pending ? "…" : "Generate 10-Q quiz"}</button>
        {msg && <span className="text-xs text-[var(--accent-lime)]">{msg}</span>}
      </div>

      {quiz?.questions && quiz.questions.length > 0 && (
        <div className="mt-4 space-y-3">
          <h3 className="text-sm font-semibold">AI Quiz</h3>
          {quiz.questions.map((q, i) => (
            <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
              {q.type === "mcq" ? (
                <>
                  <div className="text-sm font-jp">{q.prompt_ja}</div>
                  {q.prompt_zh && <div className="text-xs text-[var(--text-muted)]">{q.prompt_zh}</div>}
                  <ul className="mt-2 space-y-1 text-sm">
                    {q.options.map((opt, j) => (
                      <li key={j} className={j === q.correct_index ? "text-[var(--accent-lime)]" : ""}>
                        {String.fromCharCode(65 + j)}. {opt}
                      </li>
                    ))}
                  </ul>
                  <div className="text-xs text-[var(--text-muted)] mt-1">→ {q.explanation_zh}</div>
                </>
              ) : (
                <>
                  <div className="text-sm font-jp">{q.sentence_ja}</div>
                  <div className="text-xs text-[var(--accent-lime)] mt-1">Answer: {q.answer}</div>
                  {q.hint_zh && <div className="text-xs text-[var(--text-muted)]">{q.hint_zh}</div>}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
