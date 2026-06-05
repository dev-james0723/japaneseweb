"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  PlusCircle,
  Radio,
  Trash2,
  UploadCloud,
} from "lucide-react";
import {
  addContentSourceAction,
  addManualContentCandidateAction,
  deactivateContentSourceAction,
  dismissContentCandidateAction,
  type DailyFeedMutationState,
} from "@/lib/actions/dailyFeed";

export type SourceManagerSource = {
  id: string;
  user_id: string | null;
  source_type: string;
  source_name: string;
  source_url: string;
  topic_tags: string[] | null;
  difficulty_bias: string | null;
  license_policy: string;
  fetch_frequency: string;
  active: boolean;
  last_fetched_at: string | null;
};

export function DailyFeedSourceManager({ sources }: { sources: SourceManagerSource[] }) {
  const [sourceState, sourceAction, sourcePending] = useActionState<DailyFeedMutationState, FormData>(
    addContentSourceAction,
    null,
  );
  const [candidateState, candidateAction, candidatePending] = useActionState<DailyFeedMutationState, FormData>(
    addManualContentCandidateAction,
    null,
  );
  const ownedSources = sources.filter((source) => Boolean(source.user_id));

  return (
    <div className="glass-panel p-5 md:p-6" data-selection-inspector-disabled="true" data-feed-panel>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="section-eyebrow mb-2">輸入管線</p>
          <h2 className="text-lg font-semibold">素材入口</h2>
        </div>
        <span className="chip">{ownedSources.length} 個自建來源</span>
      </div>

      <div className="space-y-4">
        <form action={sourceAction} className="rounded-xl border border-white/10 bg-white/[0.025] p-3" data-feed-card>
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold">
            <Radio className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
            新增來源
          </div>
          <div className="space-y-2">
            <select name="source_type" defaultValue="rss" className="glass-input w-full text-sm">
              <option value="rss">RSS</option>
              <option value="news_api">News API</option>
              <option value="podcast">Podcast</option>
              <option value="youtube">YouTube</option>
              <option value="manual">手動</option>
            </select>
            <input name="source_name" className="glass-input w-full text-sm" placeholder="來源名稱" required />
            <input name="source_url" type="url" className="glass-input w-full text-sm" placeholder="https://..." required />
            <p className="text-[11px] leading-4 text-[var(--text-muted)]">
              News API 來源可以使用 top-headlines URL，並帶上 q、country、category 或 sources 查詢參數。
            </p>
            <input name="topic_tags" className="glass-input w-full text-sm" placeholder="文化、旅行、美食" />
            <div className="grid grid-cols-2 gap-2">
              <select name="language" defaultValue="ja" className="glass-input w-full text-sm">
                <option value="ja">日文</option>
                <option value="mixed">混合</option>
                <option value="en">英文</option>
              </select>
              <select name="difficulty_bias" defaultValue="" className="glass-input w-full text-sm">
                <option value="">JLPT 偏好</option>
                <option value="N5">N5</option>
                <option value="N4">N4</option>
                <option value="N3">N3</option>
                <option value="N2">N2</option>
                <option value="N1">N1</option>
              </select>
              <select name="fetch_frequency" defaultValue="weekly" className="glass-input w-full text-sm">
                <option value="daily">每日</option>
                <option value="weekly">每週</option>
                <option value="manual">手動</option>
              </select>
              <select name="license_policy" defaultValue="metadata_only" className="glass-input w-full text-sm">
                <option value="metadata_only">只用摘要資料</option>
                <option value="excerpt_allowed">可用摘錄</option>
                <option value="full_allowed">可用全文</option>
              </select>
            </div>
          </div>
          <ActionStateMessage state={sourceState} />
          <button type="submit" disabled={sourcePending} className="btn-primary mt-3 w-full justify-center text-sm disabled:opacity-60" data-feed-action>
            {sourcePending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <PlusCircle className="h-4 w-4" aria-hidden="true" />}
            新增來源
          </button>
        </form>

        <form action={candidateAction} className="rounded-xl border border-white/10 bg-white/[0.025] p-3" data-feed-card>
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold">
            <UploadCloud className="h-4 w-4 text-[var(--accent-lime)]" aria-hidden="true" />
            新增候選素材
          </div>
          <div className="space-y-2">
            <input name="title" className="glass-input w-full text-sm" placeholder="標題或主題" required />
            <input name="source_url" type="url" className="glass-input w-full text-sm" placeholder="原始來源 URL" required />
            <div className="grid grid-cols-2 gap-2">
              <select name="source_type" defaultValue="article" className="glass-input w-full text-sm">
                <option value="article">文章</option>
                <option value="news">新聞</option>
                <option value="youtube">YouTube</option>
                <option value="podcast">Podcast</option>
                <option value="manual">手動</option>
              </select>
              <select name="jlpt_estimate" defaultValue="" className="glass-input w-full text-sm">
                <option value="">JLPT</option>
                <option value="N5">N5</option>
                <option value="N4">N4</option>
                <option value="N3">N3</option>
                <option value="N2">N2</option>
                <option value="N1">N1</option>
              </select>
            </div>
            <textarea
              name="raw_excerpt"
              className="glass-input min-h-20 w-full resize-y text-sm"
              placeholder="可用摘錄／備註"
              maxLength={500}
            />
            <input name="summary_zh" className="glass-input w-full text-sm" placeholder="中文摘要" />
            <div className="grid grid-cols-2 gap-2">
              <select name="language" defaultValue="ja" className="glass-input w-full text-sm">
                <option value="ja">日文</option>
                <option value="mixed">混合</option>
                <option value="en">英文</option>
              </select>
              <input name="topic_tags" className="glass-input w-full text-sm" placeholder="標籤" />
            </div>
          </div>
          <ActionStateMessage state={candidateState} />
          <button type="submit" disabled={candidatePending} className="btn-primary mt-3 w-full justify-center text-sm disabled:opacity-60" data-feed-action>
            {candidatePending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <PlusCircle className="h-4 w-4" aria-hidden="true" />}
            新增候選素材
          </button>
        </form>

        {ownedSources.length ? (
          <div className="space-y-2">
            {ownedSources.slice(0, 4).map((source) => (
              <div key={source.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/10 p-3" data-feed-card>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{source.source_name}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className="chip px-2 py-0.5 text-[10px]">{sourceTypeLabel(source.source_type)}</span>
                    <span className="chip px-2 py-0.5 text-[10px]">{licensePolicyLabel(source.license_policy)}</span>
                  </div>
                </div>
                <DeactivateSourceButton sourceId={source.id} />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function DeactivateSourceButton({ sourceId }: { sourceId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function deactivate() {
    startTransition(async () => {
      setMessage(null);
      const result = await deactivateContentSourceAction({ sourceId });
      if (!result.ok) {
        setMessage(result.error);
        window.setTimeout(() => setMessage(null), 2600);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button type="button" onClick={deactivate} disabled={pending} className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-60" data-feed-action>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
        停用
      </button>
      {message ? <p className="max-w-44 text-right text-[11px] leading-4 text-[var(--danger)]">{message}</p> : null}
    </div>
  );
}

export function DismissCandidateButton({ contentItemId }: { contentItemId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function dismiss() {
    startTransition(async () => {
      setMessage(null);
      const result = await dismissContentCandidateAction({ contentItemId });
      if (!result.ok) {
        setMessage(result.error);
        window.setTimeout(() => setMessage(null), 2600);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button type="button" onClick={dismiss} disabled={pending} className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-60">
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
        移除
      </button>
      {message ? <p className="max-w-52 text-[11px] leading-4 text-[var(--danger)]">{message}</p> : null}
    </div>
  );
}

function ActionStateMessage({ state }: { state: DailyFeedMutationState }) {
  if (!state) return null;
  if ("error" in state) {
    return (
      <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs leading-5 text-[var(--danger)]">
        {state.error}
      </p>
    );
  }
  return (
    <p className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--accent-lime)]/20 bg-[var(--accent-lime-bg)]/20 px-3 py-2 text-xs leading-5 text-[var(--text-secondary)]">
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--accent-lime)]" aria-hidden="true" />
      {state.message}
    </p>
  );
}

function sourceTypeLabel(type: string) {
  if (type === "rss") return "RSS";
  if (type === "news_api") return "News API";
  if (type === "podcast") return "Podcast";
  if (type === "youtube") return "YouTube";
  if (type === "manual") return "手動";
  if (type === "article") return "文章";
  if (type === "news") return "新聞";
  return type;
}

function licensePolicyLabel(policy: string) {
  if (policy === "metadata_only") return "只用摘要資料";
  if (policy === "excerpt_allowed") return "可用摘錄";
  if (policy === "full_allowed") return "可用全文";
  return policy.replace(/_/g, " ");
}
