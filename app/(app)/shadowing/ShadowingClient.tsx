"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, Loader2, Mic, Square, Volume2, Wand2, X } from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import { SpeakerButton } from "@/components/SpeakerButton";
import { recordLeechRepairAction } from "@/lib/actions/repair";
import type { ReviewRating } from "@/lib/srs";

export type ShadowingPrompt = {
  id: string;
  prompt: string;
  answer: string;
  sentence_ja: string;
  kana_reading: string | null;
  translation_zh: string | null;
  difficulty_jlpt: string | null;
  key_vocab: string[] | null;
  key_grammar: string[] | null;
  status: string | null;
  is_leech: boolean | null;
  next_review_date: string;
  review_count: number | null;
  is_fallback?: boolean;
  source_label?: string | null;
};

const ratings: { value: ReviewRating; label: string; hint: string; correct: boolean }[] = [
  { value: "again", label: "重來", hint: "卡住，要重做", correct: false },
  { value: "hard", label: "困難", hint: "跟到但不穩", correct: false },
  { value: "good", label: "良好", hint: "節奏自然", correct: true },
  { value: "easy", label: "容易", hint: "可遮字復述", correct: true },
];

const practiceStages = [
  {
    title: "盲聽",
    detail: "先聽一次，不看文字，只抓停頓、音高和句尾。",
    showText: false,
  },
  {
    title: "看字聽",
    detail: "看日文再聽一次，標出自己會卡住的位置。",
    showText: true,
  },
  {
    title: "看字跟讀",
    detail: "看字跟三次，速度由慢到自然。",
    showText: true,
  },
  {
    title: "遮字復述",
    detail: "遮字講一次，把節奏從記憶拉出來。",
    showText: false,
  },
  {
    title: "語音回饋",
    detail: "錄一遍；有支援時會嘗試轉寫並比對句子。",
    showText: true,
  },
] as const;

type ShadowingFeedback = {
  score: number | null;
  notes: string[];
  recognitionSupported: boolean;
};

type ShadowingEvidence = {
  transcript: string | null;
  feedback: ShadowingFeedback | null;
  durationMs: number | null;
};

type SpeechRecognitionAlternative = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  0: SpeechRecognitionAlternative;
  isFinal: boolean;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function ShadowingClient({ prompts }: { prompts: ShadowingPrompt[] }) {
  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [pending, setPending] = useState<ReviewRating | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = prompts[index] ?? null;
  const progress = prompts.length ? Math.round((completed / prompts.length) * 100) : 0;
  const rescueMode = Boolean(current?.is_leech || current?.status === "weak");
  const grammarTags = useMemo(() => current?.key_grammar?.filter(Boolean).slice(0, 4) ?? [], [current]);

  async function submit(rating: (typeof ratings)[number], evidence: ShadowingEvidence) {
    if (!current || pending) return;
    if (current.is_fallback) {
      setError(null);
      setCompleted((value) => value + 1);
      setIndex((value) => value + 1);
      return;
    }
    setPending(rating.value);
    setError(null);
    const transcript = evidence.transcript?.trim() ?? "";
    try {
      const res = await fetch("/api/review/sentence-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptId: current.id,
          isCorrect: rating.correct,
          rating: rating.value,
          quizType: "shadowing",
          prompt: current.prompt,
          userAnswer: transcript ? transcript.slice(0, 800) : `shadowing:${rating.value}`,
          correctAnswer: current.sentence_ja,
          speechTranscript: transcript || undefined,
          speechFeedback: evidence.feedback ?? undefined,
          shadowingDurationMs: evidence.durationMs ?? undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "提交失敗");
      if (rescueMode) {
        const repair = await recordLeechRepairAction({
          targetType: "sentence",
          sentenceReviewPromptId: current.id,
          activityType: "shadow_loop",
          repairStage: "completed",
          rating: rating.value,
          success: rating.correct,
          evidenceText: current.sentence_ja,
          metadata: {
            status: current.status,
            was_leech: Boolean(current.is_leech),
            prompt_type: "shadowing",
          },
        });
        if (!repair.ok) console.error("[shadowing] repair evidence:", repair.error);
      }
      setCompleted((value) => value + 1);
      setIndex((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失敗");
    } finally {
      setPending(null);
    }
  }

  if (!current) {
    return (
      <GlassPanel className="p-8 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-[var(--accent-lime-bg)] text-[var(--accent-lime)]">
          <Check className="h-5 w-5" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-semibold">跟讀隊列已清空</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
          今日已完成這組跟讀。可以去採一句新素材，或者回複習做混合回想。
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Link href="/mining" className="btn-primary text-sm">採新句子</Link>
          <Link href="/review" className="btn-ghost text-sm">回複習</Link>
        </div>
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-4">
      <ShadowingCoachCard
        key={current.id}
        current={current}
        progress={progress}
        grammarTags={grammarTags}
        rescueMode={rescueMode}
        pending={pending}
        error={error}
        index={index}
        total={prompts.length}
        onSubmit={submit}
      />
    </div>
  );
}

function ShadowingCoachCard({
  current,
  progress,
  grammarTags,
  rescueMode,
  pending,
  error,
  index,
  total,
  onSubmit,
}: {
  current: ShadowingPrompt;
  progress: number;
  grammarTags: string[];
  rescueMode: boolean;
  pending: ReviewRating | null;
  error: string | null;
  index: number;
  total: number;
  onSubmit: (rating: (typeof ratings)[number], evidence: ShadowingEvidence) => void;
}) {
  const [stageIndex, setStageIndex] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedMs, setRecordedMs] = useState<number | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<number | null>(null);
  const recognitionSupported = typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const currentStage = practiceStages[stageIndex];
  const showText = currentStage.showText;
  const feedback = useMemo(
    () => buildShadowingFeedback(current.sentence_ja, transcript, recognitionSupported),
    [current.sentence_ja, recognitionSupported, transcript],
  );

  useEffect(() => {
    return () => {
      stopRecognition();
      stopRecordingTracks();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  function advanceStage() {
    setStageIndex((value) => Math.min(value + 1, practiceStages.length - 1));
  }

  function stopRecognition() {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    recognition.onend = null;
    recognition.onerror = null;
    recognition.onresult = null;
    try {
      recognition.stop();
    } catch {
      try {
        recognition.abort();
      } catch {
        // Best-effort cleanup only.
      }
    }
    recognitionRef.current = null;
    setIsListening(false);
  }

  function stopRecordingTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function startRecording() {
    if (isRecording) return;
    setRecognitionError(null);
    setTranscript("");
    setInterimTranscript("");
    setRecordedMs(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recordingStartedAtRef.current = Date.now();
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const duration = recordingStartedAtRef.current ? Date.now() - recordingStartedAtRef.current : null;
        setRecordedMs(duration);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        stopRecordingTracks();
      };
      recorder.start();
      setIsRecording(true);
      startRecognition();
    } catch (err) {
      stream?.getTracks().forEach((track) => track.stop());
      setRecognitionError(err instanceof Error ? err.message : "無法使用麥克風。");
      setIsRecording(false);
    }
  }

  function startRecognition() {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      setRecognitionError("此瀏覽器未支援語音轉寫；你仍然可以錄音並自行評分。");
      return;
    }

    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = "ja-JP";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) finalText += text;
        else interimText += text;
      }
      if (finalText) setTranscript((value) => `${value}${finalText}`.trim());
      setInterimTranscript(interimText.trim());
    };
    recognition.onerror = (event) => {
      setRecognitionError(event.error ? `語音轉寫暫停：${event.error}` : "語音轉寫暫停。");
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setRecognitionError("語音轉寫已在進行中；請先停止再重新錄。");
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      stopRecordingTracks();
    }
    stopRecognition();
    setIsRecording(false);
  }

  function clearRecording() {
    stopRecording();
    setTranscript("");
    setInterimTranscript("");
    setRecordedMs(null);
    setRecognitionError(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  }

  const evidence: ShadowingEvidence = {
    transcript: transcript || null,
    feedback,
    durationMs: recordedMs,
  };

  return (
    <>
      <GlassPanel className="p-5 md:p-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="section-eyebrow mb-2">跟讀第 {index + 1} / {total} 次</p>
            <h2 className="text-xl font-semibold">{currentStage.title}</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{currentStage.detail}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {current.difficulty_jlpt ? <span className="chip">{current.difficulty_jlpt}</span> : null}
            {rescueMode ? <span className="chip text-[var(--danger)]">補救</span> : null}
            {current.is_fallback ? <span className="chip">{current.source_label ?? "Can-Do 起步句"}</span> : null}
            <span className="chip chip-active">{progress}%</span>
          </div>
        </div>

        <div className="mb-4 grid gap-2 sm:grid-cols-5">
          {practiceStages.map((stage, stageNumber) => (
            <button
              key={stage.title}
              type="button"
              onClick={() => setStageIndex(stageNumber)}
              className={[
                "rounded-xl border px-3 py-2 text-left transition",
                stageIndex === stageNumber
                  ? "border-[var(--accent-lime)]/40 bg-[var(--accent-lime-bg)] text-[var(--accent-lime)]"
                  : stageIndex > stageNumber
                    ? "border-emerald-500/20 bg-emerald-500/10 text-[var(--success)]"
                    : "border-white/10 bg-white/[0.03] text-[var(--text-secondary)] hover:bg-white/[0.06]",
              ].join(" ")}
            >
              <div className="text-[10px] uppercase tracking-[0.12em]">第 {stageNumber + 1} 步</div>
              <div className="mt-1 text-xs font-semibold leading-4">{stage.title}</div>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/15 p-5">
          <div className="mb-5 flex justify-center">
            <SpeakerButton text={current.sentence_ja} size="lg" />
          </div>
          {showText ? (
            <p className="text-center font-jp text-3xl font-semibold leading-relaxed md:text-5xl">
              {current.sentence_ja}
            </p>
          ) : (
            <div className="mx-auto grid min-h-28 max-w-3xl place-items-center rounded-2xl border border-dashed border-white/15 bg-white/[0.025] px-5 text-center">
              <p className="text-sm leading-6 text-[var(--text-secondary)]">
                文字暫時遮住。先聽聲音和節奏，再用記憶復述。
              </p>
            </div>
          )}
          {showText && current.kana_reading ? (
            <p className="mt-3 text-center font-jp text-sm leading-6 text-[var(--text-muted)]">{current.kana_reading}</p>
          ) : null}
          {showText && current.translation_zh ? (
            <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-6 text-[var(--text-secondary)]">
              {current.translation_zh}
            </p>
          ) : null}
        </div>

        {(current.key_vocab?.length || grammarTags.length) ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {current.key_vocab?.slice(0, 5).map((item) => <span key={item} className="chip font-jp text-[10px]">{item}</span>)}
            {grammarTags.map((item) => <span key={item} className="chip chip-active font-jp text-[10px]">{item}</span>)}
          </div>
        ) : null}

        {stageIndex < practiceStages.length - 1 ? (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={advanceStage}
              className="btn-primary px-3 py-1.5 text-xs"
            >
              下一步
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </GlassPanel>

      <GlassPanel variant="subtle" className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Wand2 className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
            語音回饋
          </div>
          <span className="chip">{feedback.score == null ? "手動" : `${feedback.score}% 相似`}</span>
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
            <div className="mb-3 flex flex-wrap gap-2">
              {!isRecording ? (
                <button type="button" onClick={startRecording} className="btn-primary px-3 py-1.5 text-xs">
                  <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                  錄音跟讀
                </button>
              ) : (
                <button type="button" onClick={stopRecording} className="btn-primary px-3 py-1.5 text-xs">
                  <Square className="h-3.5 w-3.5" aria-hidden="true" />
                  停止
                </button>
              )}
              <button type="button" onClick={clearRecording} className="btn-ghost px-3 py-1.5 text-xs">
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                清除
              </button>
              <span className="chip">
                {isRecording ? "錄音中" : isListening ? "聆聽中" : recordedMs ? `${Math.round(recordedMs / 1000)} 秒` : "就緒"}
              </span>
            </div>

            {audioUrl ? (
              <audio src={audioUrl} controls className="mb-3 w-full" />
            ) : null}

            <label className="block space-y-1">
              <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">轉寫 / 自我筆記</span>
              <textarea
                value={interimTranscript ? `${transcript}${transcript ? " " : ""}${interimTranscript}` : transcript}
                onChange={(event) => {
                  setTranscript(event.target.value);
                  setInterimTranscript("");
                }}
                rows={3}
                className="glass-input w-full resize-y font-jp text-sm"
                placeholder="有支援時會自動填入；也可以手動記低自己講出的版本。"
              />
            </label>
            {recognitionError ? <p className="mt-2 text-xs text-[var(--accent-amber)]">{recognitionError}</p> : null}
          </div>

          <div className="rounded-xl border border-white/10 bg-black/15 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
              <Volume2 className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
              回饋筆記
            </div>
            <ul className="space-y-2 text-xs leading-5 text-[var(--text-secondary)]">
              {feedback.notes.map((note) => (
                <li key={note}>· {note}</li>
              ))}
            </ul>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel variant="subtle" className="p-4">
        <div className="mb-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Volume2 className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
          評分今次口說
        </div>
        <div className="grid gap-2 sm:grid-cols-4">
          {ratings.map((rating) => (
            <button
              key={rating.value}
              type="button"
              onClick={() => onSubmit(rating, evidence)}
              disabled={Boolean(pending)}
              className="rounded-xl border border-white/10 bg-white/[0.035] p-3 text-left transition hover:border-[var(--accent-lime)]/35 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex items-center justify-between gap-2 text-sm font-semibold">
                {rating.label}
                {pending === rating.value ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />}
              </div>
              <div className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{rating.hint}</div>
            </button>
          ))}
        </div>
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      </GlassPanel>
    </>
  );
}

function buildShadowingFeedback(reference: string, transcript: string, recognitionSupported: boolean): ShadowingFeedback {
  const cleanTranscript = transcript.trim();
  if (!cleanTranscript) {
    return {
      score: null,
      recognitionSupported,
      notes: [
        recognitionSupported
          ? "錄音後如果轉寫成功，這裡會用文字相似度做初步回饋。"
          : "瀏覽器未支援自動轉寫；完成錄音後用重來 / 困難 / 良好 / 容易自評。",
        "重點不是完美背誦，而是句尾、助詞、停頓是否穩定。",
      ],
    };
  }

  const score = similarityScore(reference, cleanTranscript);
  const notes = [
    score >= 86
      ? "句子骨架非常接近，可以進入遮字復述。"
      : score >= 68
        ? "大意接近，請重聽一次修正缺漏的助詞或活用。"
        : "差異較大，先退回看字聽再跟讀。",
    score >= 78
      ? "下一輪試著更自然地切分停頓。"
      : "建議把句子拆成 2-3 個語塊練節奏。",
  ];

  return { score, notes, recognitionSupported };
}

function similarityScore(reference: string, transcript: string) {
  const left = normalizeJapaneseForCompare(reference);
  const right = normalizeJapaneseForCompare(transcript);
  if (!left || !right) return 0;
  const lcs = longestCommonSubsequenceLength(left, right);
  return Math.round((lcs / Math.max(left.length, right.length)) * 100);
}

function normalizeJapaneseForCompare(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[ぁ-ん]/g, (char) => String.fromCharCode(char.charCodeAt(0) + 0x60))
    .replace(/[\s、。．.,!?！？「」『』（）()・:：;；ー~〜]/g, "")
    .toLowerCase();
}

function longestCommonSubsequenceLength(left: string, right: string) {
  const previous = new Array(right.length + 1).fill(0);
  const current = new Array(right.length + 1).fill(0);
  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = left[i - 1] === right[j - 1]
        ? previous[j - 1] + 1
        : Math.max(previous[j], current[j - 1]);
    }
    for (let j = 0; j <= right.length; j += 1) previous[j] = current[j];
  }
  return previous[right.length];
}
