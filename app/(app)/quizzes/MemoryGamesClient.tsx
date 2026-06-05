"use client";

import { useState, useTransition, type ReactNode } from "react";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  Flame,
  Keyboard,
  ListRestart,
  MapPinned,
  MessageSquareText,
  Newspaper,
  Images,
  Puzzle,
  ScanSearch,
  Stethoscope,
  Swords,
  XCircle,
} from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import { SpeakerButton } from "@/components/SpeakerButton";
import type {
  ConversationNextLineGameCard,
  ContextMatchGameCard,
  ClozeAttackGameCard,
  GrammarDuelGameCard,
  KanaKanjiSnapGameCard,
  MemoryGameContext,
  MemoryPalaceGameCard,
  MistakeDoctorGameCard,
  NewsRecallGameCard,
  SentenceRebuildGameCard,
} from "@/lib/memoryGames/queue";

type GameId =
  | "kana_kanji_snap"
  | "sentence_rebuild"
  | "cloze_attack"
  | "grammar_duel"
  | "context_match"
  | "mistake_doctor"
  | "news_recall"
  | "memory_palace"
  | "conversation_next_line";

type Feedback = {
  ok: boolean;
  title: string;
  detail: string;
} | null;

const GAME_META: Record<GameId, { label: string; mechanism: string; icon: LucideIcon }> = {
  kana_kanji_snap: {
    label: "假名漢字快配",
    mechanism: "辨認速度",
    icon: ScanSearch,
  },
  sentence_rebuild: {
    label: "句子重組",
    mechanism: "語法／語序",
    icon: Puzzle,
  },
  cloze_attack: {
    label: "限時填空",
    mechanism: "壓力下回想",
    icon: Keyboard,
  },
  grammar_duel: {
    label: "文法對決",
    mechanism: "句型辨別",
    icon: Swords,
  },
  context_match: {
    label: "語境配對",
    mechanism: "用法／語域",
    icon: MapPinned,
  },
  mistake_doctor: {
    label: "錯句醫生",
    mechanism: "錯誤修正",
    icon: Stethoscope,
  },
  news_recall: {
    label: "新聞回想",
    mechanism: "輸出回想",
    icon: Newspaper,
  },
  memory_palace: {
    label: "記憶宮殿",
    mechanism: "雙編碼",
    icon: Images,
  },
  conversation_next_line: {
    label: "對話下一句",
    mechanism: "語用",
    icon: MessageSquareText,
  },
};

export function MemoryGamesClient({ context }: { context: MemoryGameContext }) {
  const defaultGame = context.kanaKanjiSnap.length
    ? "kana_kanji_snap"
    : context.sentenceRebuild.length
    ? "sentence_rebuild"
    : context.clozeAttack.length
      ? "cloze_attack"
      : context.grammarDuel.length
        ? "grammar_duel"
        : context.mistakeDoctor.length
        ? "mistake_doctor"
        : context.contextMatch.length
          ? "context_match"
          : context.newsRecall.length
            ? "news_recall"
            : context.memoryPalace.length
              ? "memory_palace"
              : "conversation_next_line";
  const [activeGame, setActiveGame] = useState<GameId>(defaultGame);

  const counts: Record<GameId, number> = {
    kana_kanji_snap: context.kanaKanjiSnap.length,
    sentence_rebuild: context.sentenceRebuild.length,
    cloze_attack: context.clozeAttack.length,
    grammar_duel: context.grammarDuel.length,
    context_match: context.contextMatch.length,
    mistake_doctor: context.mistakeDoctor.length,
    news_recall: context.newsRecall.length,
    memory_palace: context.memoryPalace.length,
    conversation_next_line: context.conversationNextLine.length,
  };

  return (
    <div className="space-y-4">
      <GlassPanel className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="section-eyebrow mb-1">記憶遊戲</p>
            <h2 className="text-xl font-semibold">今日練習模式</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-9">
            {(Object.keys(GAME_META) as GameId[]).map((gameId) => {
              const meta = GAME_META[gameId];
              const Icon = meta.icon;
              const active = activeGame === gameId;
              return (
                <button
                  key={gameId}
                  type="button"
                  onClick={() => setActiveGame(gameId)}
                  disabled={counts[gameId] === 0}
                  className={clsx(
                    "flex min-h-16 items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45",
                    active
                      ? "border-[var(--accent-lime)]/45 bg-[var(--accent-lime-bg)]/30"
                      : "border-white/10 bg-white/[0.025] hover:bg-white/[0.055]",
                  )}
                >
                  <Icon className={clsx("h-4 w-4 shrink-0", active ? "text-[var(--accent-lime)]" : "text-[var(--text-muted)]")} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{meta.label}</span>
                    <span className="block text-[10px] text-[var(--text-muted)]">{counts[gameId]} 張卡</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </GlassPanel>

      {activeGame === "kana_kanji_snap" && <KanaKanjiSnapGame cards={context.kanaKanjiSnap} />}
      {activeGame === "sentence_rebuild" && <SentenceRebuildGame cards={context.sentenceRebuild} />}
      {activeGame === "cloze_attack" && <ClozeAttackGame cards={context.clozeAttack} />}
      {activeGame === "grammar_duel" && <GrammarDuelGame cards={context.grammarDuel} />}
      {activeGame === "context_match" && <ContextMatchGame cards={context.contextMatch} />}
      {activeGame === "mistake_doctor" && <MistakeDoctorGame cards={context.mistakeDoctor} />}
      {activeGame === "news_recall" && <NewsRecallGame cards={context.newsRecall} />}
      {activeGame === "memory_palace" && <MemoryPalaceGame cards={context.memoryPalace} />}
      {activeGame === "conversation_next_line" && <ConversationNextLineGame cards={context.conversationNextLine} />}
    </div>
  );
}

function KanaKanjiSnapGame({ cards }: { cards: KanaKanjiSnapGameCard[] }) {
  const [index, setIndex] = useState(0);
  const [readingChoice, setReadingChoice] = useState<string | null>(null);
  const [meaningChoice, setMeaningChoice] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  const card = cards[index] ?? null;

  if (!card) return <EmptyGame title="未有快配卡" detail="加入有假名和意思的單字後，這個遊戲會訓練辨認速度。" />;

  const canSubmit = Boolean(readingChoice && meaningChoice);

  function submit() {
    if (!canSubmit || pending) return;
    const ok = readingChoice === card.reading && meaningChoice === card.meaning;
    const userAnswer = `${readingChoice ?? "—"} · ${meaningChoice ?? "—"}`;
    const correctAnswer = `${card.reading} · ${card.meaning}`;
    startTransition(async () => {
      await recordAttempt({
        gameType: "kana_kanji_snap",
        vocabId: card.vocabId,
        promptId: null,
        prompt: `Kana-Kanji Snap: ${card.surface}`,
        userAnswer,
        correctAnswer,
        isCorrect: ok,
        explanation: card.hasKanji
          ? "將漢字表記配對到假名讀音和意思。"
          : "將日文表記配對到讀音和意思。",
        responseTimeMs: Date.now() - startedAt,
        grammarTags: [],
        difficultyJlpt: card.jlptLevel,
      });
      setFeedback({
        ok,
        title: ok ? "配對成功" : "辨認未接上",
        detail: ok
          ? "讀音同意思已經接在一起。"
          : `正確配對：${correctAnswer}`,
      });
    });
  }

  function nextCard() {
    setReadingChoice(null);
    setMeaningChoice(null);
    setFeedback(null);
    setStartedAt(Date.now());
    setIndex((current) => (current + 1) % cards.length);
  }

  const tags = [card.jlptLevel, card.registerLabel, card.partOfSpeech]
    .filter((tag): tag is string => Boolean(tag?.trim()));

  return (
    <GameShell
      icon={ScanSearch}
      title="假名漢字快配"
      mechanism="漢字・かな・意思快速配對：訓練辨認速度"
      current={index + 1}
      total={cards.length}
      feedback={feedback}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-black/15 p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs text-[var(--text-muted)]">快速配對讀音同意思</p>
              <SpeakerButton text={card.surface} size="sm" />
            </div>
            <p className="break-words font-jp text-5xl leading-tight md:text-7xl">{card.surface}</p>
            <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
              快速配對假名同意思，練到一眼認出，而唔係慢慢翻譯。
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <SnapChoiceGroup
              label="假名"
              choices={card.readingChoices}
              selected={readingChoice}
              correct={card.reading}
              feedback={feedback}
              onSelect={(choice) => {
                setReadingChoice(choice);
                setFeedback(null);
              }}
            />
            <SnapChoiceGroup
              label="意思"
              choices={card.meaningChoices}
              selected={meaningChoice}
              correct={card.meaning}
              feedback={feedback}
              onSelect={(choice) => {
                setMeaningChoice(choice);
                setFeedback(null);
              }}
            />
          </div>
        </div>

        <GameControlPanel
          isLeech={false}
          tags={tags}
          correctAnswer={`${card.reading} · ${card.meaning}`}
          onReset={() => {
            setReadingChoice(null);
            setMeaningChoice(null);
            setFeedback(null);
            setStartedAt(Date.now());
          }}
          onSubmit={submit}
          onNext={nextCard}
          canSubmit={canSubmit}
          pending={pending}
          feedback={feedback}
        />
      </div>
    </GameShell>
  );
}

function SnapChoiceGroup({
  label,
  choices,
  selected,
  correct,
  feedback,
  onSelect,
}: {
  label: string;
  choices: string[];
  selected: string | null;
  correct: string;
  feedback: Feedback;
  onSelect: (choice: string) => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
      <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
      <div className="grid gap-2">
        {choices.map((choice) => {
          const checked = selected === choice;
          const solved = Boolean(feedback);
          const correctChoice = solved && choice === correct;
          const wrongChoice = solved && checked && choice !== correct;
          return (
            <button
              key={choice}
              type="button"
              onClick={() => onSelect(choice)}
              disabled={solved}
              className={clsx(
                "min-h-12 rounded-lg border px-3 py-2 text-left font-jp text-sm leading-5 transition-colors disabled:cursor-default",
                correctChoice
                  ? "border-emerald-500/35 bg-emerald-500/10 text-white"
                  : wrongChoice
                    ? "border-red-500/35 bg-red-500/10 text-white"
                    : checked
                      ? "border-[var(--accent-lime)]/45 bg-[var(--accent-lime-bg)]/25 text-white"
                      : "border-white/10 bg-white/[0.035] text-[var(--text-secondary)] hover:bg-white/[0.065]",
              )}
            >
              {choice}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SentenceRebuildGame({ cards }: { cards: SentenceRebuildGameCard[] }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<Array<{ index: number; value: string }>>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  const card = cards[index] ?? null;

  if (!card) return <EmptyGame title="未有重組卡" detail="先採礦句子，之後這個遊戲會訓練語序。" />;

  const selectedIndexes = new Set(selected.map((item) => item.index));
  const answer = selected.map((item) => item.value).join("");
  const complete = selected.length === card.scrambledChunks.length;

  function submit() {
    if (!complete || pending) return;
    const ok = normalize(answer) === normalize(card.sentenceJa);
    startTransition(async () => {
      await recordAttempt({
        gameType: "sentence_rebuild",
        promptId: card.promptId,
        prompt: card.translationZh ? `句子重組：${card.translationZh}` : "重組日文句子。",
        userAnswer: answer,
        correctAnswer: card.sentenceJa,
        isCorrect: ok,
        explanation: card.keyGrammar.length ? `文法焦點：${card.keyGrammar.join(" / ")}` : null,
        responseTimeMs: Date.now() - startedAt,
        grammarTags: card.keyGrammar,
        difficultyJlpt: card.difficultyJlpt,
      });
      setFeedback({
        ok,
        title: ok ? "句子重組成功" : "語序需要修復",
        detail: ok ? "語法路徑更順了。" : "對比片段次序，再試多一次同一句。",
      });
    });
  }

  function nextCard() {
    setSelected([]);
    setFeedback(null);
    setStartedAt(Date.now());
    setIndex((current) => (current + 1) % cards.length);
  }

  return (
    <GameShell
      icon={Puzzle}
      title="句子重組"
      mechanism="打亂句子 → 重組：訓練語法／語序"
      current={index + 1}
      total={cards.length}
      feedback={feedback}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="mb-4 rounded-xl border border-white/10 bg-black/15 p-4">
            <p className="text-xs text-[var(--text-muted)]">意思</p>
            <p className="mt-2 text-lg leading-7 text-[var(--zh-text)]">
              {card.translationZh ?? "重組成自然日文句子。"}
            </p>
          </div>

          <div className="mb-4 min-h-24 rounded-xl border border-[var(--accent-lime)]/20 bg-[var(--accent-lime-bg)]/15 p-3">
            <div className="flex min-h-14 flex-wrap gap-2">
              {selected.length ? selected.map((item) => (
                <button
                  key={`${item.index}-${item.value}`}
                  type="button"
                  onClick={() => {
                    setFeedback(null);
                    setSelected((current) => current.filter((token) => token.index !== item.index));
                  }}
                  className="rounded-lg border border-[var(--accent-lime)]/30 bg-black/20 px-3 py-2 font-jp text-lg text-white"
                >
                  {item.value}
                </button>
              )) : (
                <p className="self-center text-sm text-[var(--text-muted)]">按下面片段排成完整句子。</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {card.scrambledChunks.map((chunk, chunkIndex) => (
              <button
                key={`${chunk}-${chunkIndex}`}
                type="button"
                onClick={() => {
                  setFeedback(null);
                  setSelected((current) => [...current, { index: chunkIndex, value: chunk }]);
                }}
                disabled={selectedIndexes.has(chunkIndex)}
                className="rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2 font-jp text-base transition-colors hover:bg-white/[0.075] disabled:opacity-25"
              >
                {chunk}
              </button>
            ))}
          </div>
        </div>

        <GameControlPanel
          isLeech={card.isLeech}
          tags={card.keyGrammar}
          correctAnswer={card.sentenceJa}
          onReset={() => {
            setSelected([]);
            setFeedback(null);
            setStartedAt(Date.now());
          }}
          onSubmit={submit}
          onNext={nextCard}
          canSubmit={complete}
          pending={pending}
          feedback={feedback}
        />
      </div>
    </GameShell>
  );
}

function ClozeAttackGame({ cards }: { cards: ClozeAttackGameCard[] }) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  const card = cards[index] ?? null;

  if (!card) return <EmptyGame title="未有填空卡" detail="句子採礦建立複習提示後，填空卡會出現在這裡。" />;

  function submit() {
    if (!answer.trim() || pending) return;
    const ok = normalize(answer) === normalize(card.answer);
    startTransition(async () => {
      await recordAttempt({
        gameType: "cloze_attack",
        promptId: card.promptId,
        prompt: card.prompt,
        userAnswer: answer,
        correctAnswer: card.answer,
        isCorrect: ok,
        explanation: card.sentenceJa,
        responseTimeMs: Date.now() - startedAt,
        grammarTags: card.keyGrammar,
        difficultyJlpt: null,
      });
      setFeedback({
        ok,
        title: ok ? "回想成功" : "回想失手",
        detail: ok ? "缺口已能在壓力下回想出來。" : "先講一次完整句子，再重試缺口。",
      });
    });
  }

  function nextCard() {
    setAnswer("");
    setFeedback(null);
    setStartedAt(Date.now());
    setIndex((current) => (current + 1) % cards.length);
  }

  return (
    <GameShell
      icon={Keyboard}
      title="限時填空"
      mechanism="限時填空：訓練主動回想"
      current={index + 1}
      total={cards.length}
      feedback={feedback}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-black/15 p-5">
            <p className="mb-3 text-xs text-[var(--text-muted)]">填上空格</p>
            <p className="font-jp text-3xl leading-relaxed md:text-5xl">{card.prompt}</p>
            {card.translationZh ? (
              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{card.translationZh}</p>
            ) : null}
          </div>
          <input
            value={answer}
            onChange={(event) => {
              setAnswer(event.target.value);
              setFeedback(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
            placeholder="輸入缺口答案"
            className="w-full rounded-xl border border-white/10 bg-white/[0.045] px-4 py-3 font-jp text-lg outline-none transition-colors focus:border-[var(--accent-lime)]"
          />
        </div>

        <GameControlPanel
          isLeech={card.isLeech}
          tags={card.keyGrammar}
          correctAnswer={card.answer}
          onReset={() => {
            setAnswer("");
            setFeedback(null);
            setStartedAt(Date.now());
          }}
          onSubmit={submit}
          onNext={nextCard}
          canSubmit={Boolean(answer.trim())}
          pending={pending}
          feedback={feedback}
        />
      </div>
    </GameShell>
  );
}

function GrammarDuelGame({ cards }: { cards: GrammarDuelGameCard[] }) {
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  const card = cards[index] ?? null;

  if (!card) return <EmptyGame title="未有文法對決卡" detail="卡片需要文法標籤。先採礦或複習文法相關句子。" />;

  function submit(selectedChoice = choice) {
    if (!selectedChoice || pending) return;
    const ok = selectedChoice === card.correct;
    startTransition(async () => {
      await recordAttempt({
        gameType: "grammar_duel",
        promptId: card.promptId,
        prompt: card.sentenceJa,
        userAnswer: selectedChoice,
        correctAnswer: card.correct,
        isCorrect: ok,
        explanation: card.explanation,
        responseTimeMs: Date.now() - startedAt,
        grammarTags: [card.correct],
        difficultyJlpt: null,
      });
      setFeedback({
        ok,
        title: ok ? "句型辨認成功" : "句型混淆",
        detail: ok ? card.explanation : `正確焦點：${card.correct}。${card.explanation}`,
      });
    });
  }

  function nextCard() {
    setChoice(null);
    setFeedback(null);
    setStartedAt(Date.now());
    setIndex((current) => (current + 1) % cards.length);
  }

  return (
    <GameShell
      icon={Swords}
      title="文法對決"
      mechanism="相近句型二選一：訓練辨別力"
      current={index + 1}
      total={cards.length}
      feedback={feedback}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-black/15 p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs text-[var(--text-muted)]">呢句真正用緊邊個句型？</p>
              <SpeakerButton text={card.sentenceJa} size="sm" />
            </div>
            <p className="font-jp text-2xl leading-relaxed md:text-4xl">{card.sentenceJa}</p>
            {card.translationZh ? (
              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{card.translationZh}</p>
            ) : null}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {card.choices.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setChoice(item);
                  setFeedback(null);
                }}
                className={clsx(
                  "min-h-14 rounded-xl border px-4 py-3 text-left font-jp text-base transition-colors",
                  choice === item
                    ? "border-[var(--accent-lime)]/45 bg-[var(--accent-lime-bg)]/25 text-white"
                    : "border-white/10 bg-white/[0.035] text-[var(--text-secondary)] hover:bg-white/[0.065]",
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <GameControlPanel
          isLeech={card.isLeech}
          tags={[card.correct]}
          correctAnswer={card.correct}
          onReset={() => {
            setChoice(null);
            setFeedback(null);
            setStartedAt(Date.now());
          }}
          onSubmit={() => submit()}
          onNext={nextCard}
          canSubmit={Boolean(choice)}
          pending={pending}
          feedback={feedback}
        />
      </div>
    </GameShell>
  );
}

function ContextMatchGame({ cards }: { cards: ContextMatchGameCard[] }) {
  const [index, setIndex] = useState(0);
  const [choiceId, setChoiceId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  const card = cards[index] ?? null;

  if (!card) return <EmptyGame title="未有語境配對卡" detail="採礦帶核心詞的句子後，這個遊戲會訓練用法同語域。" />;

  function submit(selectedId = choiceId) {
    if (!selectedId || pending) return;
    const chosen = card.choices.find((choice) => choice.id === selectedId) ?? null;
    const ok = selectedId === card.promptId;
    startTransition(async () => {
      await recordAttempt({
        gameType: "context_match",
        promptId: card.promptId,
        prompt: `Context match: ${card.vocab}`,
        userAnswer: chosen?.sentenceJa ?? selectedId,
        correctAnswer: card.sentenceJa,
        isCorrect: ok,
        explanation: card.explanation,
        responseTimeMs: Date.now() - startedAt,
        grammarTags: card.keyGrammar,
        difficultyJlpt: card.difficultyJlpt,
      });
      setFeedback({
        ok,
        title: ok ? "語境接上" : "場景不合",
        detail: ok ? card.explanation : `最佳場景：${card.sentenceJa}`,
      });
    });
  }

  function nextCard() {
    setChoiceId(null);
    setFeedback(null);
    setStartedAt(Date.now());
    setIndex((current) => (current + 1) % cards.length);
  }

  const tags = [card.difficultyJlpt, ...card.keyGrammar]
    .filter((tag): tag is string => Boolean(tag?.trim()));

  return (
    <GameShell
      icon={MapPinned}
      title="語境配對"
      mechanism="單字放入正確場景：訓練用法／語域"
      current={index + 1}
      total={cards.length}
      feedback={feedback}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-black/15 p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs text-[var(--text-muted)]">邊句採礦句先係正確場景？</p>
              <SpeakerButton text={card.vocab} size="sm" />
            </div>
            <p className="break-words font-jp text-4xl leading-tight md:text-6xl">{card.vocab}</p>
            <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
              唔係背孤立意思，而係揀出呢個詞最自然出現嘅語境。
            </p>
          </div>

          <div className="grid gap-2">
            {card.choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => {
                  setChoiceId(choice.id);
                  setFeedback(null);
                }}
                className={clsx(
                  "min-h-20 rounded-xl border px-4 py-3 text-left transition-colors",
                  choiceId === choice.id
                    ? "border-[var(--accent-lime)]/45 bg-[var(--accent-lime-bg)]/25 text-white"
                    : "border-white/10 bg-white/[0.035] text-[var(--text-secondary)] hover:bg-white/[0.065]",
                )}
              >
                <span className="block font-jp text-base leading-6">{choice.sentenceJa}</span>
                {choice.translationZh ? (
                  <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">{choice.translationZh}</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <GameControlPanel
          isLeech={card.isLeech}
          tags={tags}
          correctAnswer={card.sentenceJa}
          onReset={() => {
            setChoiceId(null);
            setFeedback(null);
            setStartedAt(Date.now());
          }}
          onSubmit={() => submit()}
          onNext={nextCard}
          canSubmit={Boolean(choiceId)}
          pending={pending}
          feedback={feedback}
        />
      </div>
    </GameShell>
  );
}

function MistakeDoctorGame({ cards }: { cards: MistakeDoctorGameCard[] }) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  const card = cards[index] ?? null;

  if (!card) {
    return (
      <EmptyGame
        title="未有錯句卡"
        detail="日記或角色扮演修正會在這裡變成修復練習。"
      />
    );
  }

  function submit() {
    if (!answer.trim() || pending) return;
    const ok = normalize(answer) === normalize(card.corrected);
    const explanation = card.explanationZh
      ?? "對比你嘅修正版同自然修正版，再重寫一次。";
    startTransition(async () => {
      await recordAttempt({
        gameType: "mistake_doctor",
        promptId: null,
        prompt: `錯句醫生：${card.original}`,
        userAnswer: answer,
        correctAnswer: card.corrected,
        isCorrect: ok,
        explanation,
        responseTimeMs: Date.now() - startedAt,
        grammarTags: card.skillArea === "grammar" ? [card.skillArea] : [],
        difficultyJlpt: null,
      });
      setFeedback({
        ok,
        title: ok ? "修復通過" : "仍需處理",
        detail: ok ? "你已重組出修正版輸出。" : `自然修正版：${card.corrected}`,
      });
    });
  }

  function nextCard() {
    setAnswer("");
    setFeedback(null);
    setStartedAt(Date.now());
    setIndex((current) => (current + 1) % cards.length);
  }

  const tags = [card.sourceLabel, card.skillArea, card.severity]
    .filter((tag): tag is string => Boolean(tag?.trim()));

  return (
    <GameShell
      icon={Stethoscope}
      title="錯句醫生"
      mechanism="自己錯句 → 修正版：訓練錯誤修正"
      current={index + 1}
      total={cards.length}
      feedback={feedback}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-black/15 p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs text-[var(--text-muted)]">{card.sourceLabel} 修正</p>
              <SpeakerButton text={card.corrected} size="sm" />
            </div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--danger)]">原本輸出</p>
            <p className="mt-2 break-words font-jp text-2xl leading-relaxed md:text-4xl">{card.original}</p>
            {card.explanationZh ? (
              <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{card.explanationZh}</p>
            ) : null}
          </div>

          <textarea
            value={answer}
            onChange={(event) => {
              setAnswer(event.target.value);
              setFeedback(null);
            }}
            placeholder="輸入你嘅修正版日文"
            rows={4}
            className="min-h-28 w-full rounded-xl border border-white/10 bg-white/[0.045] px-4 py-3 font-jp text-lg leading-7 outline-none transition-colors focus:border-[var(--accent-lime)]"
          />
        </div>

        <GameControlPanel
          isLeech={card.severity === "leech"}
          tags={tags}
          correctAnswer={feedback ? card.corrected : "檢查後顯示"}
          onReset={() => {
            setAnswer("");
            setFeedback(null);
            setStartedAt(Date.now());
          }}
          onSubmit={submit}
          onNext={nextCard}
          canSubmit={Boolean(answer.trim())}
          pending={pending}
          feedback={feedback}
        />
      </div>
    </GameShell>
  );
}

function NewsRecallGame({ cards }: { cards: NewsRecallGameCard[] }) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  const card = cards[index] ?? null;

  if (!card) {
    return (
      <EmptyGame
        title="未有新聞回想卡"
        detail="建立每日輸入課包後，相關練習會出現在這裡。"
      />
    );
  }

  function submit() {
    if (!answer.trim() || pending) return;
    const ok = looksLikeJapanese(answer);
    startTransition(async () => {
      await recordAttempt({
        gameType: "news_recall",
        promptId: null,
        prompt: `新聞回想：${card.hookZh ?? card.lessonDate}`,
        userAnswer: answer,
        correctAnswer: card.modelSentence,
        isCorrect: ok,
        explanation: card.explanation,
        responseTimeMs: Date.now() - startedAt,
        grammarTags: card.keyGrammar,
        difficultyJlpt: card.difficultyJlpt,
      });
      setFeedback({
        ok,
        title: ok ? "回想已記錄" : "需要一句日文",
        detail: ok ? "你已經用今日輸入產出一句日文。" : "請用日文，至少寫／講一句短句。",
      });
    });
  }

  function nextCard() {
    setAnswer("");
    setFeedback(null);
    setStartedAt(Date.now());
    setIndex((current) => (current + 1) % cards.length);
  }

  const tags = [card.difficultyJlpt, ...card.keyVocab.slice(0, 2), ...card.keyGrammar.slice(0, 2)]
    .filter((tag): tag is string => Boolean(tag?.trim()));

  return (
    <GameShell
      icon={Newspaper}
      title="新聞回想"
      mechanism="睇完今日輸入 → 講返一句：訓練輸出回想"
      current={index + 1}
      total={cards.length}
      feedback={feedback}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-black/15 p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs text-[var(--text-muted)]">{card.lessonDate} 課包回想</p>
              <SpeakerButton text={card.modelSentence} size="sm" />
            </div>
            {card.hookZh ? (
              <p className="text-sm leading-6 text-[var(--text-secondary)]">{card.hookZh}</p>
            ) : null}
            {card.summaryJa ? (
              <p className="mt-3 font-jp text-xl leading-8 md:text-2xl">{card.summaryJa}</p>
            ) : null}
            {!card.summaryJa && card.originalSnippet ? (
              <p className="mt-3 line-clamp-4 font-jp text-lg leading-8">{card.originalSnippet}</p>
            ) : null}
          </div>

          <textarea
            value={answer}
            onChange={(event) => {
              setAnswer(event.target.value);
              setFeedback(null);
            }}
            placeholder="用日文講返今日內容一句"
            rows={4}
            className="min-h-28 w-full rounded-xl border border-white/10 bg-white/[0.045] px-4 py-3 font-jp text-lg leading-7 outline-none transition-colors focus:border-[var(--accent-lime)]"
          />
        </div>

        <GameControlPanel
          isLeech={false}
          tags={tags}
          correctAnswer={feedback ? card.modelSentence : "檢查後顯示示範句"}
          onReset={() => {
            setAnswer("");
            setFeedback(null);
            setStartedAt(Date.now());
          }}
          onSubmit={submit}
          onNext={nextCard}
          canSubmit={Boolean(answer.trim())}
          pending={pending}
          feedback={feedback}
        />
      </div>
    </GameShell>
  );
}

function MemoryPalaceGame({ cards }: { cards: MemoryPalaceGameCard[] }) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  const card = cards[index] ?? null;

  if (!card) {
    return (
      <EmptyGame
        title="未有記憶宮殿卡"
        detail="先由詞庫生成單字記憶場景，之後這個遊戲會訓練圖像回想。"
      />
    );
  }

  const correctAnswer = card.words.map((word) => word.reading ? `${word.word}（${word.reading}）` : word.word).join(" / ");

  function submit() {
    if (!answer.trim() || pending) return;
    const recalled = countMemoryPalaceMatches(answer, card.words.map((word) => word.word));
    const ok = recalled >= card.requiredRecallCount;
    startTransition(async () => {
      await recordAttempt({
        gameType: "memory_palace",
        promptId: null,
        prompt: `記憶宮殿：${card.titleZh}`,
        userAnswer: answer,
        correctAnswer,
        isCorrect: ok,
        explanation: `回想 ${recalled}/${card.words.length} 個。${card.explanation}`,
        responseTimeMs: Date.now() - startedAt,
        grammarTags: [],
        difficultyJlpt: null,
      });
      setFeedback({
        ok,
        title: ok ? "場景回想成功" : "回想需要再來一次",
        detail: ok
          ? `你已從場景回想出 ${recalled} 個目標詞。`
          : `至少回想 ${card.requiredRecallCount} 個：${correctAnswer}`,
      });
    });
  }

  function nextCard() {
    setAnswer("");
    setFeedback(null);
    setStartedAt(Date.now());
    setIndex((current) => (current + 1) % cards.length);
  }

  const tags = [generationStatusLabel(card.generationStatus), `${card.words.length} 個詞`];

  return (
    <GameShell
      icon={Images}
      title="記憶宮殿"
      mechanism="圖像場景 → 回想詞組：訓練雙編碼"
      current={index + 1}
      total={cards.length}
      feedback={feedback}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/15">
            {card.imageUrl ? (
              <div
                role="img"
                aria-label={card.titleZh}
                className="aspect-video bg-cover bg-center"
                style={{ backgroundImage: `url("${card.imageUrl}")` }}
              />
            ) : (
              <div className="grid aspect-video place-items-center bg-white/[0.035] px-6 text-center text-sm text-[var(--text-secondary)]">
                圖像場景待生成；先用故事線做記憶宮殿。
              </div>
            )}
            <div className="p-5">
              <p className="section-eyebrow mb-2">{card.titleZh}</p>
              <p className="font-jp text-lg leading-8">{card.storylineJa}</p>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{card.storylineZh}</p>
            </div>
          </div>

          <textarea
            value={answer}
            onChange={(event) => {
              setAnswer(event.target.value);
              setFeedback(null);
            }}
            placeholder={`回想至少 ${card.requiredRecallCount} 個日文詞`}
            rows={4}
            className="min-h-28 w-full rounded-xl border border-white/10 bg-white/[0.045] px-4 py-3 font-jp text-lg leading-7 outline-none transition-colors focus:border-[var(--accent-lime)]"
          />
        </div>

        <GameControlPanel
          isLeech={false}
          tags={tags}
          correctAnswer={feedback ? correctAnswer : "檢查後顯示詞表"}
          onReset={() => {
            setAnswer("");
            setFeedback(null);
            setStartedAt(Date.now());
          }}
          onSubmit={submit}
          onNext={nextCard}
          canSubmit={Boolean(answer.trim())}
          pending={pending}
          feedback={feedback}
        />
      </div>
    </GameShell>
  );
}

function ConversationNextLineGame({ cards }: { cards: ConversationNextLineGameCard[] }) {
  const [index, setIndex] = useState(0);
  const [choiceId, setChoiceId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  const card = cards[index] ?? null;

  if (!card) {
    return (
      <EmptyGame
        title="未有下一句卡"
        detail="先完成角色扮演對話，之後這個遊戲會訓練自然回應和語用。"
      />
    );
  }

  function submit(selectedId = choiceId) {
    if (!selectedId || pending) return;
    const chosen = card.choices.find((choice) => choice.id === selectedId) ?? null;
    const ok = selectedId === card.turnId;
    startTransition(async () => {
      await recordAttempt({
        gameType: "conversation_next_line",
        promptId: null,
        prompt: `對話下一句：${card.partnerLine}`,
        userAnswer: chosen?.textJa ?? selectedId,
        correctAnswer: card.correct,
        isCorrect: ok,
        explanation: card.explanation,
        responseTimeMs: Date.now() - startedAt,
        grammarTags: [],
        difficultyJlpt: card.difficultyJlpt,
      });
      setFeedback({
        ok,
        title: ok ? "回應自然" : "語用不合",
        detail: ok ? card.explanation : `最自然回應：${card.correct}`,
      });
    });
  }

  function nextCard() {
    setChoiceId(null);
    setFeedback(null);
    setStartedAt(Date.now());
    setIndex((current) => (current + 1) % cards.length);
  }

  const tags = [card.difficultyJlpt, card.personaLabel]
    .filter((tag): tag is string => Boolean(tag?.trim()));

  return (
    <GameShell
      icon={MessageSquareText}
      title="對話下一句"
      mechanism="最自然下一句：訓練語用／輪替"
      current={index + 1}
      total={cards.length}
      feedback={feedback}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-black/15 p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs text-[var(--text-muted)]">
                {card.scenario} · {card.partnerRole}
              </p>
              <SpeakerButton text={card.partnerLine} size="sm" />
            </div>
            {card.previousUserLine ? (
              <div className="mb-3 rounded-lg border border-white/10 bg-white/[0.025] p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">你上一句</p>
                <p className="mt-1 font-jp text-sm leading-6 text-[var(--text-secondary)]">{card.previousUserLine}</p>
              </div>
            ) : null}
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--accent-sakura)]">對方說</p>
            <p className="mt-2 font-jp text-2xl leading-relaxed md:text-4xl">{card.partnerLine}</p>
            {card.partnerTranslationZh ? (
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{card.partnerTranslationZh}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            {card.choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => {
                  setChoiceId(choice.id);
                  setFeedback(null);
                }}
                className={clsx(
                  "min-h-20 rounded-xl border px-4 py-3 text-left transition-colors",
                  choiceId === choice.id
                    ? "border-[var(--accent-lime)]/45 bg-[var(--accent-lime-bg)]/25 text-white"
                    : "border-white/10 bg-white/[0.035] text-[var(--text-secondary)] hover:bg-white/[0.065]",
                )}
              >
                <span className="block font-jp text-base leading-6">{choice.textJa}</span>
                {choice.translationZh ? (
                  <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">{choice.translationZh}</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <GameControlPanel
          isLeech={false}
          tags={tags}
          correctAnswer={card.correct}
          onReset={() => {
            setChoiceId(null);
            setFeedback(null);
            setStartedAt(Date.now());
          }}
          onSubmit={() => submit()}
          onNext={nextCard}
          canSubmit={Boolean(choiceId)}
          pending={pending}
          feedback={feedback}
        />
      </div>
    </GameShell>
  );
}

function GameShell({
  icon: Icon,
  title,
  mechanism,
  current,
  total,
  feedback,
  children,
}: {
  icon: LucideIcon;
  title: string;
  mechanism: string;
  current: number;
  total: number;
  feedback: Feedback;
  children: ReactNode;
}) {
  return (
    <GlassPanel className="p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-[var(--accent-lime)]">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{mechanism}</p>
          </div>
        </div>
        <div className="chip w-fit">{current} / {total}</div>
      </div>

      {feedback ? (
        <div className={clsx(
          "mb-5 flex items-start gap-3 rounded-xl border px-4 py-3",
          feedback.ok
            ? "border-emerald-500/25 bg-emerald-500/10"
            : "border-red-500/25 bg-red-500/10",
        )}>
          {feedback.ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--danger)]" />
          )}
          <div>
            <p className="text-sm font-medium">{feedback.title}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{feedback.detail}</p>
          </div>
        </div>
      ) : null}

      {children}
    </GlassPanel>
  );
}

function GameControlPanel({
  isLeech,
  tags,
  correctAnswer,
  onReset,
  onSubmit,
  onNext,
  canSubmit,
  pending,
  feedback,
}: {
  isLeech: boolean;
  tags: string[];
  correctAnswer: string;
  onReset: () => void;
  onSubmit: () => void;
  onNext: () => void;
  canSubmit: boolean;
  pending: boolean;
  feedback: Feedback;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <div className="mb-4 flex flex-wrap gap-2">
        {isLeech ? <span className="chip text-[var(--danger)]">弱項修復</span> : null}
        {tags.slice(0, 3).map((tag) => (
          <span key={tag} className="chip text-[var(--accent-sakura)]">{tagLabel(tag)}</span>
        ))}
      </div>
      <div className="rounded-lg border border-white/10 bg-black/15 p-3">
        <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">答案</p>
        <p className="break-words font-jp text-sm leading-6 text-[var(--text-secondary)]">{correctAnswer}</p>
      </div>
      <div className="mt-4 grid gap-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit || pending || Boolean(feedback)}
          className="btn-primary justify-center disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "記錄中…" : "檢查"}
        </button>
        <button type="button" onClick={onReset} className="btn-ghost justify-center">
          <ListRestart className="h-4 w-4" />
          重設
        </button>
        {feedback ? (
          <button type="button" onClick={onNext} className="btn-ghost justify-center">
            下一張
          </button>
        ) : null}
      </div>
    </div>
  );
}

function EmptyGame({ title, detail }: { title: string; detail: string }) {
  return (
    <GlassPanel variant="subtle" className="p-8 text-center">
      <Flame className="mx-auto mb-4 h-6 w-6 text-[var(--accent-amber)]" />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">{detail}</p>
    </GlassPanel>
  );
}

function generationStatusLabel(status: string) {
  if (status === "completed") return "已完成";
  if (status === "pending") return "待生成";
  if (status === "failed") return "生成失敗";
  if (status === "processing") return "生成中";
  return tagLabel(status);
}

function tagLabel(tag: string) {
  const labels: Record<string, string> = {
    completed: "已完成",
    correction: "修正",
    grammar: "文法",
    hard: "困難",
    leech: "弱項",
    listening: "聽力",
    miss: "答錯",
    output: "輸出",
    pending: "待處理",
    production: "產出",
    review: "複習",
    shadowing: "跟讀",
    speaking: "口說",
    vocab: "單字",
    vocabulary: "單字",
    weak: "薄弱",
  };
  return labels[tag] ?? tag.replace(/_/g, " ");
}

async function recordAttempt(input: {
  gameType: GameId;
  promptId?: string | null;
  vocabId?: string | null;
  prompt: string;
  userAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string | null;
  responseTimeMs: number;
  grammarTags: string[];
  difficultyJlpt: string | null;
}) {
  await fetch("/api/memory-games/attempt", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

function normalize(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "")
    .replace(/[。、，,.!?！？]/g, "")
    .toLocaleLowerCase();
}

function looksLikeJapanese(value: string) {
  const compactValue = value.trim().replace(/\s+/g, "");
  return compactValue.length >= 4 && /[ぁ-んァ-ン一-龯]/u.test(compactValue);
}

function countMemoryPalaceMatches(answer: string, targetWords: string[]) {
  const recalled = splitRecallTokens(answer);
  return targetWords.filter((word) => {
    const target = normalize(word);
    return recalled.some((token) => (
      token === target
      || (token.length >= 2 && target.length >= 2 && (token.includes(target) || target.includes(token)))
    ));
  }).length;
}

function splitRecallTokens(value: string) {
  return Array.from(new Set(
    value
      .split(/[、,，\s/／]+/u)
      .map(normalize)
      .filter((token) => token.length >= 1),
  ));
}
