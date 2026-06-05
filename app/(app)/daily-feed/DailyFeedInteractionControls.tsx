"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Loader2,
  MessageCircle,
  PenLine,
  Pickaxe,
  PlusCircle,
  Repeat2,
  Sparkles,
  Volume2,
} from "lucide-react";
import { QuickMineButton } from "@/components/QuickMineButton";
import { QuickSaveButton } from "@/components/QuickSaveButton";
import { promoteDailyFeedCandidateAction } from "@/lib/actions/dailyFeed";
import {
  recordContentInteractionAction,
  type RecordContentInteractionInput,
} from "@/lib/actions/contentInteractions";

type InteractionType = RecordContentInteractionInput["interactionType"];

type ContentRefs = {
  dailyLessonId?: string | null;
  contentItemId?: string | null;
  culturalContentId?: string | null;
};

export type DailyFeedQuizQuestion = {
  prompt: string;
  answer: string;
  choices: string[];
  explanation: string;
  kind: "vocab" | "grammar" | "sentence";
};

export function DailyFeedInteractionControls({
  lessonId,
  contentItemId,
  culturalContentId,
  articleHref,
  sourceUrl,
  lessonTitle,
  lessonSummary,
  mineText,
  mineReading,
  mineMeaning,
  quizQuestions,
  completed,
}: {
  lessonId: string;
  contentItemId: string | null;
  culturalContentId: string | null;
  articleHref: string | null;
  sourceUrl: string | null;
  lessonTitle: string;
  lessonSummary: string;
  mineText: string;
  mineReading?: string | null;
  mineMeaning?: string | null;
  quizQuestions: DailyFeedQuizQuestion[];
  completed: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<InteractionType | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const refs = { dailyLessonId: lessonId, contentItemId, culturalContentId };
  const saveText = [lessonTitle, lessonSummary].filter(Boolean).join("\n\n") || "每日輸入課包";
  const professorSeed = (lessonTitle || lessonSummary || "每日輸入").slice(0, 160);

  function runInteraction({
    interactionType,
    href,
    surface = "daily_feed",
    itemsCreated = 0,
    metadata = {},
    refresh = false,
  }: {
    interactionType: InteractionType;
    href?: string;
    surface?: string;
    itemsCreated?: number;
    metadata?: Record<string, unknown>;
    refresh?: boolean;
  }) {
    startTransition(async () => {
      setPendingAction(interactionType);
      const res = await recordContentInteractionAction({
        ...refs,
        interactionType,
        sourceSurface: surface,
        itemsCreated,
        deepLink: href ?? articleHref ?? sourceUrl ?? "/daily-feed",
        metadata,
      });
      setPendingAction(null);

      if (!res.ok) {
        setMessage(res.error);
        window.setTimeout(() => setMessage(null), 1800);
        return;
      }

      if (interactionType === "lesson_complete") {
        setMessage("✓ 已完成今日輸入");
        window.setTimeout(() => setMessage(null), 1800);
      }

      if (href) {
        router.push(href);
        return;
      }
      if (refresh || interactionType === "lesson_complete") router.refresh();
    });
  }

  function generateInlineQuiz() {
    if (!quizQuestions.length) {
      setMessage("今日課程未有足夠素材出題。");
      window.setTimeout(() => setMessage(null), 1800);
      return;
    }
    setQuizOpen(true);
    runInteraction({
      interactionType: "quiz",
      itemsCreated: quizQuestions.length,
      metadata: { intent: "generate_daily_feed_quiz", question_count: quizQuestions.length },
    });
  }

  return (
    <div className="mt-5 space-y-3" data-selection-inspector-disabled="true" data-feed-panel>
      <div className="flex flex-wrap gap-2">
        {articleHref ? (
          <button
            type="button"
            onClick={() =>
              runInteraction({
                interactionType: "lesson_start",
                href: articleHref,
                metadata: { destination: "cultural_article" },
              })
            }
            disabled={pending && pendingAction === "lesson_start"}
            className="btn-primary text-sm"
            data-feed-action
          >
            {pending && pendingAction === "lesson_start" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <BookOpen className="h-4 w-4" aria-hidden="true" />
            )}
            閱讀
          </button>
        ) : sourceUrl ? (
          <TrackedInteractionLink
            refs={refs}
            href={sourceUrl}
            interactionType="open_source"
            sourceSurface="daily_feed"
            className="btn-primary text-sm"
            metadata={{ destination: "canonical_source" }}
            external
          >
            閱讀來源
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </TrackedInteractionLink>
        ) : null}

        <button
          type="button"
          onClick={() =>
            runInteraction({
              interactionType: "shadow",
              href: "/shadowing?mode=listen",
              metadata: { intent: "listen_daily_feed_line" },
            })
          }
          disabled={pending && pendingAction === "shadow"}
          className="btn-ghost text-sm"
          data-feed-action
        >
          {pending && pendingAction === "shadow" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Volume2 className="h-4 w-4" aria-hidden="true" />
          )}
          聆聽
        </button>

        <Link href="/review" className="btn-ghost text-sm" data-feed-action>複習</Link>

        {mineText ? (
          <QuickMineButton
            text={mineText}
            reading={mineReading}
            meaningZh={mineMeaning}
            context="每日輸入"
            sourceTitle={lessonTitle}
            sourceSurface="daily_feed"
            dailyLessonId={lessonId}
            contentItemId={contentItemId}
            culturalContentId={culturalContentId}
          />
        ) : (
          <button
            type="button"
            onClick={() =>
              runInteraction({
                interactionType: "mine",
                href: "/mining",
                metadata: { intent: "mine_more_from_daily_feed" },
              })
            }
            disabled={pending && pendingAction === "mine"}
            className="btn-ghost text-sm"
            data-feed-action
          >
            {pending && pendingAction === "mine" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Pickaxe className="h-4 w-4" aria-hidden="true" />
            )}
            採句子
          </button>
        )}

        <button
          type="button"
          onClick={() =>
            runInteraction({
              interactionType: "add_vocab",
              href: `/decks/new?mode=ai&seed=${encodeURIComponent(professorSeed)}`,
              metadata: { intent: "add_vocab_from_daily_feed" },
            })
          }
          disabled={pending && pendingAction === "add_vocab"}
          className="btn-ghost text-sm"
          data-feed-action
        >
          {pending && pendingAction === "add_vocab" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
          )}
          加入單字
        </button>

        <button
          type="button"
          onClick={() =>
            runInteraction({
              interactionType: "shadow",
              href: "/shadowing",
              metadata: { intent: "shadow_daily_feed_line" },
            })
          }
          disabled={pending && pendingAction === "shadow"}
          className="btn-ghost text-sm"
          data-feed-action
        >
          {pending && pendingAction === "shadow" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Repeat2 className="h-4 w-4" aria-hidden="true" />
          )}
          跟讀
        </button>

        <button
          type="button"
          onClick={() =>
            runInteraction({
              interactionType: "output",
              href: "/journal",
              metadata: { intent: "write_daily_feed_output" },
            })
          }
          disabled={pending && pendingAction === "output"}
          className="btn-ghost text-sm"
          data-feed-action
        >
          {pending && pendingAction === "output" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <PenLine className="h-4 w-4" aria-hidden="true" />
          )}
          輸出
        </button>

        <button
          type="button"
          onClick={() =>
            runInteraction({
              interactionType: "discuss",
              href: `/professor?seed=${encodeURIComponent(professorSeed)}`,
              metadata: { intent: "discuss_daily_feed" },
            })
          }
          disabled={pending && pendingAction === "discuss"}
          className="btn-ghost text-sm"
          data-feed-action
        >
          {pending && pendingAction === "discuss" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
          )}
          討論
        </button>

        <QuickSaveButton
          text={saveText}
          meaningZh={lessonSummary}
          context="每日輸入"
          tags={["daily-feed", "input"]}
          savedFrom="daily_feed"
        />

        <button
          type="button"
          onClick={generateInlineQuiz}
          disabled={pending && pendingAction === "quiz"}
          className="btn-ghost text-sm"
          data-feed-action
        >
          {pending && pendingAction === "quiz" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
          )}
          生成小測
        </button>

        <button
          type="button"
          onClick={() =>
            runInteraction({
              interactionType: "lesson_complete",
              metadata: { completed_from: "today_lesson_panel" },
              refresh: true,
            })
          }
          disabled={completed || (pending && pendingAction === "lesson_complete")}
          className={completed ? "btn-ghost text-sm opacity-75" : "btn-ghost text-sm"}
          data-feed-action
        >
          {pending && pendingAction === "lesson_complete" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          )}
          {completed ? "已完成" : "標記完成"}
        </button>
      </div>
      {message ? <p className="text-xs text-[var(--accent-lime)]">{message}</p> : null}
      {quizOpen ? <DailyFeedQuizPanel questions={quizQuestions} /> : null}
    </div>
  );
}

function DailyFeedQuizPanel({ questions }: { questions: DailyFeedQuizQuestion[] }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const answered = Object.keys(answers).length;
  const correct = Object.entries(answers).filter(([index, answer]) => questions[Number(index)]?.answer === answer).length;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/15 p-4" data-feed-panel>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="section-eyebrow mb-1">每日輸入小測</p>
          <h3 className="text-sm font-semibold">今日輸入回想</h3>
        </div>
        <span className="chip">{answered}/{questions.length} · 答中 {correct}</span>
      </div>
      <div className="space-y-3">
        {questions.map((question, index) => {
          const selected = answers[index];
          const submitted = Boolean(selected);
          return (
            <div key={`${question.kind}-${question.prompt}-${index}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-3" data-feed-card>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="chip px-2 py-0.5 text-[10px]">{question.kind}</span>
                {submitted ? (
                  <span className={selected === question.answer ? "text-xs text-[var(--success)]" : "text-xs text-red-300"}>
                    {selected === question.answer ? "答中" : "需要修復"}
                  </span>
                ) : null}
              </div>
              <p className="font-jp text-sm leading-6">{question.prompt}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {question.choices.map((choice) => {
                  const isSelected = selected === choice;
                  const isAnswer = submitted && choice === question.answer;
                  return (
                    <button
                      key={choice}
                      type="button"
                      disabled={submitted}
                      onClick={() => setAnswers((current) => ({ ...current, [index]: choice }))}
                      className={[
                        "rounded-xl border px-3 py-2 text-left text-sm transition",
                        isAnswer
                          ? "border-emerald-500/35 bg-emerald-500/10 text-[var(--success)]"
                          : isSelected
                            ? "border-red-500/30 bg-red-500/10 text-red-300"
                            : "border-white/10 bg-white/[0.035] text-[var(--text-secondary)] hover:bg-white/[0.07]",
                      ].join(" ")}
                    >
                      {choice}
                    </button>
                  );
                })}
              </div>
              {submitted ? (
                <p className="mt-3 rounded-lg border border-white/10 bg-black/15 p-2 text-xs leading-5 text-[var(--text-secondary)]">
                  {question.explanation}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TrackedInteractionLink({
  refs,
  href,
  interactionType,
  sourceSurface,
  metadata = {},
  className,
  external = false,
  children,
}: {
  refs: ContentRefs;
  href: string;
  interactionType: InteractionType;
  sourceSurface: string;
  metadata?: Record<string, unknown>;
  className: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  const input: RecordContentInteractionInput = {
    ...refs,
    interactionType,
    sourceSurface,
    deepLink: href,
    metadata,
  };

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        onClick={() => {
          void recordContentInteractionAction(input);
        }}
        className={className}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      onClick={() => {
        void recordContentInteractionAction(input);
      }}
      className={className}
    >
      {children}
    </Link>
  );
}

export function PromoteCandidateButton({
  contentItemId,
}: {
  contentItemId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function promote() {
    startTransition(async () => {
      setMessage(null);
      const res = await promoteDailyFeedCandidateAction({ contentItemId });
      if (!res.ok) {
        setMessage(res.error);
        window.setTimeout(() => setMessage(null), 3200);
        return;
      }
      setMessage(res.warning ? "課包已準備；部分資產使用備用資料。" : "✓ 已升級成今日課包");
      router.refresh();
      window.setTimeout(() => setMessage(null), 2200);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={promote}
        disabled={pending}
        className="btn-primary px-3 py-1.5 text-xs"
        data-feed-action
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        生成課包
      </button>
      {message ? <p className="max-w-52 text-[11px] leading-4 text-[var(--accent-lime)]">{message}</p> : null}
    </div>
  );
}
