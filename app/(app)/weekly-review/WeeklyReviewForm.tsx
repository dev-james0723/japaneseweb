"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import {
  generateWeeklyQuizAction,
  saveWeeklyQuizAttemptAction,
  saveWeeklyReviewAction,
  type WeeklyQuizQuestion,
  type WeeklyQuizResult,
} from "@/lib/actions/weeklyReview";

type SubmittedAnswer = {
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
};

export function WeeklyReviewForm({
  initial,
  weekStart,
  existingQuiz,
}: {
  initial: { userReflection: string; nextWeekFocus: string };
  weekStart: string;
  existingQuiz: WeeklyQuizResult | null;
}) {
  const [reflection, setReflection] = useState(initial.userReflection);
  const [nextFocus, setNextFocus] = useState(initial.nextWeekFocus);
  const [quiz, setQuiz] = useState<WeeklyQuizResult | null>(existingQuiz);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState<Record<number, SubmittedAnswer>>({});
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  function save() {
    startTransition(async () => {
      const res = await saveWeeklyReviewAction({ weekStart, userReflection: reflection, nextWeekFocus: nextFocus });
      setMsg(res.ok ? "✓ 已儲存" : res.error);
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
      setAnswers({});
      setSubmitted({});
      setMsg("✓ 小測已生成");
      setTimeout(() => setMsg(null), 1500);
    });
  }

  function chooseAnswer(index: number, value: string) {
    if (submitted[index]) return;
    setAnswers((current) => ({ ...current, [index]: value }));
  }

  function submitAnswer(index: number, question: WeeklyQuizQuestion) {
    const rawAnswer = answers[index] ?? "";
    if (!rawAnswer.trim()) return;
    const correctAnswer = correctAnswerFor(question);
    const isCorrect = question.type === "mcq"
      ? Number(rawAnswer) === question.correct_index
      : normalizeAnswer(rawAnswer) === normalizeAnswer(question.answer);

    startTransition(async () => {
      const res = await saveWeeklyQuizAttemptAction({
        weekStart,
        questionIndex: index,
        quizType: question.type,
        prompt: promptForQuestion(question),
        userAnswer: displayAnswer(question, rawAnswer),
        correctAnswer,
        isCorrect,
        explanation: explanationFor(question),
      });
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      setSubmitted((current) => ({
        ...current,
        [index]: {
          userAnswer: rawAnswer,
          correctAnswer,
          isCorrect,
        },
      }));
      router.refresh();
    });
  }

  const questions = quiz?.questions ?? [];
  const answered = Object.keys(submitted).length;
  const correct = Object.values(submitted).filter((answer) => answer.isCorrect).length;

  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">反思</div>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          rows={4}
          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm resize-y focus:border-[var(--accent-lime)] focus:outline-none"
          placeholder="今星期學到啲乜？邊樣最有用？邊樣最揦埋？"
        />
      </label>
      <label className="block space-y-1">
        <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">下週重點</div>
        <textarea
          value={nextFocus}
          onChange={(e) => setNextFocus(e.target.value)}
          rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm resize-y focus:border-[var(--accent-lime)] focus:outline-none"
          placeholder="下星期最重要專注一樣嘢"
        />
      </label>
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={save} disabled={pending} className="btn-primary text-sm">{pending ? "儲存中…" : "儲存"}</button>
        <button onClick={genQuiz} disabled={pending} className="btn-ghost text-sm">{pending ? "…" : "生成 10 題小測"}</button>
        {msg && <span className="text-xs text-[var(--accent-lime)]">{msg}</span>}
      </div>

      {questions.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">AI 小測</h3>
            <div className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-xs text-[var(--text-muted)]">
              {answered}/{questions.length} · {correct} 題正確
            </div>
          </div>

          {questions.map((question, index) => (
            <QuizQuestionCard
              key={index}
              index={index}
              question={question}
              answer={answers[index] ?? ""}
              submitted={submitted[index] ?? null}
              pending={pending}
              onAnswer={chooseAnswer}
              onSubmit={submitAnswer}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QuizQuestionCard({
  index,
  question,
  answer,
  submitted,
  pending,
  onAnswer,
  onSubmit,
}: {
  index: number;
  question: WeeklyQuizQuestion;
  answer: string;
  submitted: SubmittedAnswer | null;
  pending: boolean;
  onAnswer: (index: number, answer: string) => void;
  onSubmit: (index: number, question: WeeklyQuizQuestion) => void;
}) {
  const isSubmitted = Boolean(submitted);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
          第 {index + 1} 題 · {questionTypeLabel(question.type)}
        </div>
        {submitted ? (
          <div className={submitted.isCorrect ? "text-[var(--success)]" : "text-[var(--danger)]"}>
            {submitted.isCorrect ? <Check className="h-4 w-4" aria-hidden="true" /> : <X className="h-4 w-4" aria-hidden="true" />}
          </div>
        ) : null}
      </div>

      {question.type === "mcq" ? (
        <>
          <div className="font-jp text-sm">{question.prompt_ja}</div>
          {question.prompt_zh ? <div className="text-xs text-[var(--text-muted)]">{question.prompt_zh}</div> : null}
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {question.options.map((option, optionIndex) => {
              const selected = answer === String(optionIndex);
              const correct = isSubmitted && optionIndex === question.correct_index;
              const wrongSelected = isSubmitted && selected && optionIndex !== question.correct_index;
              return (
                <button
                  key={`${option}-${optionIndex}`}
                  type="button"
                  disabled={isSubmitted}
                  onClick={() => onAnswer(index, String(optionIndex))}
                  className={[
                    "rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                    correct
                      ? "border-emerald-500/35 bg-emerald-500/10 text-[var(--success)]"
                      : wrongSelected
                        ? "border-red-500/30 bg-red-500/10 text-red-300"
                        : selected
                          ? "border-[var(--accent-lime)]/45 bg-[var(--accent-lime-bg)] text-[var(--accent-lime)]"
                          : "border-white/10 bg-white/[0.035] text-[var(--text-secondary)] hover:bg-white/[0.07]",
                  ].join(" ")}
                >
                  <span className="mr-2 text-[10px] text-[var(--text-muted)]">{String.fromCharCode(65 + optionIndex)}</span>
                  {option}
                </button>
              );
            })}
          </div>
          {isSubmitted ? (
            <div className="mt-3 rounded-lg border border-white/10 bg-black/15 p-2 text-xs leading-5 text-[var(--text-secondary)]">
              {question.explanation_zh}
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="font-jp text-sm">{question.sentence_ja}</div>
          {question.hint_zh ? <div className="mt-1 text-xs text-[var(--text-muted)]">{question.hint_zh}</div> : null}
          <input
            value={answer}
            disabled={isSubmitted}
            onChange={(event) => onAnswer(index, event.target.value)}
            className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-jp text-sm focus:border-[var(--accent-lime)] focus:outline-none"
            placeholder="填入答案"
          />
          {isSubmitted ? (
            <div className="mt-3 rounded-lg border border-white/10 bg-black/15 p-2 text-xs leading-5 text-[var(--text-secondary)]">
              正解：<span className="font-jp text-[var(--accent-lime)]">{question.answer}</span>
            </div>
          ) : null}
        </>
      )}

      {!isSubmitted ? (
        <button
          type="button"
          disabled={pending || !answer.trim()}
          onClick={() => onSubmit(index, question)}
          className="btn-primary mt-3 px-3 py-1.5 text-xs disabled:opacity-50"
        >
          提交答案
        </button>
      ) : null}
    </div>
  );
}

function promptForQuestion(question: WeeklyQuizQuestion) {
  return question.type === "mcq" ? question.prompt_ja : question.sentence_ja;
}

function correctAnswerFor(question: WeeklyQuizQuestion) {
  return question.type === "mcq"
    ? question.options[question.correct_index] ?? ""
    : question.answer;
}

function displayAnswer(question: WeeklyQuizQuestion, answer: string) {
  if (question.type === "mcq") {
    const index = Number(answer);
    return question.options[index] ?? answer;
  }
  return answer;
}

function explanationFor(question: WeeklyQuizQuestion) {
  return question.type === "mcq" ? question.explanation_zh : question.hint_zh;
}

function questionTypeLabel(type: WeeklyQuizQuestion["type"]) {
  if (type === "mcq") return "選擇題";
  if (type === "cloze") return "填空";
  return type;
}

function normalizeAnswer(answer: string) {
  return answer
    .normalize("NFKC")
    .replace(/[。．.、，,\s]/g, "")
    .toLowerCase();
}
