"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  FolderPlus,
  Star,
  StarOff,
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  Loader2,
  Search,
  Inbox,
  X,
  Check,
  BookOpen,
} from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import type {
  NotebookEntry,
  NotebookEntryKind,
  NotebookFolder,
} from "@/lib/notebook/types";
import {
  applyNotebookClassifyAction,
  createNotebookEntryAction,
  createNotebookFolderAction,
  deleteNotebookEntryAction,
  deleteNotebookFolderAction,
  importNotebookEntriesToDeckAction,
  moveNotebookEntryAction,
  toggleNotebookFavoriteAction,
  updateNotebookEntryAction,
  updateNotebookFolderAction,
} from "@/lib/actions/notebook";

type ClassifySuggestion = {
  entryId: string;
  suggestedFolderId: string | null;
  suggestedFolderName: string | null;
  tags: string[];
  confidence: number | null;
  reason: string | null;
};

const KIND_LABELS: Record<NotebookEntryKind, string> = {
  term: "單字",
  phrase: "片語",
  freeform: "自由筆記",
};

type EntryFormState = {
  id?: string;
  kind: NotebookEntryKind;
  folderId: string | null;
  japanese: string;
  reading: string;
  meaningZh: string;
  meaningEn: string;
  content: string;
  tags: string;
  isFavorite: boolean;
};

const emptyForm = (folderId: string | null): EntryFormState => ({
  kind: "term",
  folderId,
  japanese: "",
  reading: "",
  meaningZh: "",
  meaningEn: "",
  content: "",
  tags: "",
  isFavorite: false,
});

export function NotebookWorkspace({
  initialFolders,
  initialEntries,
}: {
  initialFolders: NotebookFolder[];
  initialEntries: NotebookEntry[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [folders, setFolders] = useState(initialFolders);
  const [entries, setEntries] = useState(initialEntries);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("__all__");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<EntryFormState>(() =>
    emptyForm(null),
  );
  const [error, setError] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [classifyBusy, setClassifyBusy] = useState(false);
  const [classifySuggestions, setClassifySuggestions] = useState<
    ClassifySuggestion[] | null
  >(null);
  const [importTitle, setImportTitle] = useState("從筆記本匯入");
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    setFolders(initialFolders);
    setEntries(initialEntries);
  }, [initialFolders, initialEntries]);

  const folderById = useMemo(
    () => new Map(folders.map((f) => [f.id, f])),
    [folders],
  );

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (favoritesOnly && !e.is_favorite) return false;
      if (selectedFolderId === "__inbox__" && e.folder_id !== null) {
        return false;
      }
      if (
        selectedFolderId !== "__all__" &&
        selectedFolderId !== "__inbox__" &&
        e.folder_id !== selectedFolderId
      ) {
        return false;
      }
      if (!q) return true;
      const hay = [
        e.japanese,
        e.reading,
        e.meaning_zh,
        e.meaning_en,
        e.content,
        ...(e.tags ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [entries, favoritesOnly, search, selectedFolderId]);

  const folderCounts = useMemo(() => {
    const counts = new Map<string | null, number>();
    counts.set(null, 0);
    for (const f of folders) counts.set(f.id, 0);
    for (const e of entries) {
      const key = e.folder_id;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [entries, folders]);

  function refresh() {
    router.refresh();
  }

  function openCreateEntry() {
    const folderId =
      selectedFolderId &&
      selectedFolderId !== "__all__" &&
      selectedFolderId !== "__inbox__"
        ? selectedFolderId
        : null;
    setForm(emptyForm(folderId));
    setFormOpen(true);
    setError(null);
  }

  function openEditEntry(entry: NotebookEntry) {
    setForm({
      id: entry.id,
      kind: entry.kind,
      folderId: entry.folder_id,
      japanese: entry.japanese ?? "",
      reading: entry.reading ?? "",
      meaningZh: entry.meaning_zh ?? "",
      meaningEn: entry.meaning_en ?? "",
      content: entry.content ?? "",
      tags: (entry.tags ?? []).join(", "),
      isFavorite: entry.is_favorite,
    });
    setFormOpen(true);
    setError(null);
  }

  function parseTags(raw: string) {
    return raw
      .split(/[,，、]/)
      .map((t) => t.trim())
      .filter(Boolean);
  }

  function handleSaveEntry() {
    startTransition(async () => {
      setError(null);
      const payload = {
        kind: form.kind,
        folderId: form.folderId,
        japanese: form.japanese || null,
        reading: form.reading || null,
        meaningZh: form.meaningZh || null,
        meaningEn: form.meaningEn || null,
        content: form.content || null,
        tags: parseTags(form.tags),
        isFavorite: form.isFavorite,
      };

      const result = form.id
        ? await updateNotebookEntryAction({ entryId: form.id, ...payload })
        : await createNotebookEntryAction(payload);

      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFormOpen(false);
      refresh();
    });
  }

  function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    startTransition(async () => {
      setError(null);
      const result = await createNotebookFolderAction({ name });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNewFolderName("");
      refresh();
    });
  }

  function handleDeleteFolder(folderId: string) {
    if (!confirm("刪除此資料夾？筆記會移到收件匣（未分類）。")) return;
    startTransition(async () => {
      const result = await deleteNotebookFolderAction({ folderId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (selectedFolderId === folderId) setSelectedFolderId("__all__");
      refresh();
    });
  }

  function handleSaveFolderName(folderId: string) {
    const name = editingFolderName.trim();
    if (!name) return;
    startTransition(async () => {
      const result = await updateNotebookFolderAction({ folderId, name });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditingFolderId(null);
      refresh();
    });
  }

  function toggleSelect(id: string) {
    setSelectedEntryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runClassify(entryIds: string[]) {
    if (entryIds.length === 0) return;
    setClassifyBusy(true);
    setError(null);
    setClassifySuggestions(null);
    try {
      const res = await fetch("/api/ai/notebook/classify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entryIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "AI 分類失敗。");
        return;
      }
      setClassifySuggestions(data.suggestions ?? []);
      refresh();
    } finally {
      setClassifyBusy(false);
    }
  }

  async function applySuggestion(s: ClassifySuggestion) {
    setError(null);
    let folderId = s.suggestedFolderId;

    if (!folderId && s.suggestedFolderName) {
      const existing = folders.find(
        (f) => f.name === s.suggestedFolderName,
      );
      if (existing) {
        folderId = existing.id;
      } else {
        const created = await createNotebookFolderAction({
          name: s.suggestedFolderName,
        });
        if (!created.ok) {
          setError(created.error);
          return;
        }
        folderId = created.data!.folderId;
      }
    }

    const result = await applyNotebookClassifyAction({
      entryId: s.entryId,
      folderId,
      tags: s.tags,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setClassifySuggestions((prev) =>
      prev ? prev.filter((x) => x.entryId !== s.entryId) : null,
    );
    setSelectedEntryIds(new Set());
    refresh();
  }

  function handleImportToDeck() {
    const ids = Array.from(selectedEntryIds);
    if (ids.length === 0) return;
    startTransition(async () => {
      setError(null);
      const result = await importNotebookEntriesToDeckAction({
        entryIds: ids,
        title: importTitle.trim() || "從筆記本匯入",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setShowImport(false);
      setSelectedEntryIds(new Set());
      router.push(`/decks/${result.data!.deckId}`);
    });
  }

  return (
    <div className="grid min-h-[60vh] grid-cols-1 gap-4 lg:grid-cols-[252px_1fr]">
      {/* Sidebar folders */}
      <GlassPanel className="flex h-fit flex-col gap-3 p-4 lg:sticky lg:top-24">
        <div className="section-eyebrow">
          資料夾
        </div>
        <nav className="flex flex-col gap-0.5">
          <FolderNavButton
            active={selectedFolderId === "__all__"}
            onClick={() => setSelectedFolderId("__all__")}
            icon={<BookOpen className="w-3.5 h-3.5" />}
            label="全部筆記"
            count={entries.length}
          />
          <FolderNavButton
            active={selectedFolderId === "__inbox__"}
            onClick={() => setSelectedFolderId("__inbox__")}
            icon={<Inbox className="w-3.5 h-3.5" />}
            label="收件匣"
            count={folderCounts.get(null) ?? 0}
          />
          {folders.map((f) => (
            <div key={f.id} className="group flex items-center gap-1">
              {editingFolderId === f.id ? (
                <input
                  className="glass-input flex-1 text-sm py-1.5"
                  value={editingFolderName}
                  onChange={(e) => setEditingFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveFolderName(f.id);
                    if (e.key === "Escape") setEditingFolderId(null);
                  }}
                  autoFocus
                />
              ) : (
                <FolderNavButton
                  active={selectedFolderId === f.id}
                  onClick={() => setSelectedFolderId(f.id)}
                  label={f.name}
                  count={folderCounts.get(f.id) ?? 0}
                  className="flex-1"
                />
              )}
              <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  className="p-1 text-[var(--text-muted)] hover:text-white"
                  aria-label="重新命名"
                  onClick={() => {
                    setEditingFolderId(f.id);
                    setEditingFolderName(f.name);
                  }}
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--danger)]"
                  aria-label="刪除資料夾"
                  onClick={() => handleDeleteFolder(f.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-1 flex gap-2">
          <input
            className="glass-input flex-1 text-sm py-2"
            placeholder="新資料夾名稱"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
          />
          <button
            type="button"
            className="btn-ghost p-2"
            aria-label="新增資料夾"
            onClick={handleCreateFolder}
            disabled={pending}
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>
      </GlassPanel>

      {/* Main */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              className="glass-input w-full pl-9 text-sm"
              placeholder="搜尋日文、意思、標籤…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            type="button"
            className={clsx(
              "btn-ghost text-sm",
              favoritesOnly && "border-[var(--accent-lime)]/50",
            )}
            onClick={() => setFavoritesOnly((v) => !v)}
          >
            {favoritesOnly ? (
              <Star className="w-4 h-4 text-[var(--accent-amber)]" />
            ) : (
              <StarOff className="w-4 h-4" />
            )}
            最愛
          </button>
          <button
            type="button"
            className="btn-primary text-sm"
            onClick={openCreateEntry}
          >
            <Plus className="w-4 h-4" />
            新增筆記
          </button>
          <button
            type="button"
            className="btn-ghost text-sm"
            disabled={classifyBusy || selectedEntryIds.size === 0}
            onClick={() => runClassify(Array.from(selectedEntryIds))}
          >
            {classifyBusy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            AI 分類
            {selectedEntryIds.size > 0 && ` (${selectedEntryIds.size})`}
          </button>
          {selectedEntryIds.size > 0 && (
            <button
              type="button"
              className="btn-ghost text-sm"
              onClick={() => setShowImport(true)}
            >
              匯入詞庫
            </button>
          )}
        </div>

        {error && (
          <p className="text-sm text-[var(--danger)] px-1">{error}</p>
        )}

        {classifySuggestions && classifySuggestions.length > 0 && (
          <GlassPanel variant="subtle" className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">AI 分類建議</p>
              <button
                type="button"
                className="text-[var(--text-muted)] hover:text-white"
                onClick={() => setClassifySuggestions(null)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {classifySuggestions.map((s) => {
              const entry = entries.find((e) => e.id === s.entryId);
              const folderLabel = s.suggestedFolderId
                ? folderById.get(s.suggestedFolderId)?.name
                : s.suggestedFolderName ?? "收件匣";
              return (
                <div
                  key={s.entryId}
                  className="flex flex-wrap items-start justify-between gap-2 text-sm border-t border-white/10 pt-3 first:border-0 first:pt-0"
                >
                  <div className="min-w-0">
                    <div className="font-jp text-base">
                      {entry?.japanese || entry?.content?.slice(0, 40) || "—"}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      建議資料夾：<span className="text-[var(--text-secondary)]">{folderLabel}</span>
                      {s.tags.length > 0 && (
                        <> · 標籤：{s.tags.join("、")}</>
                      )}
                    </p>
                    {s.reason && (
                      <p className="text-xs text-[var(--text-muted)] mt-0.5 italic">
                        {s.reason}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn-primary text-xs py-1.5 px-3"
                    onClick={() => applySuggestion(s)}
                  >
                    <Check className="w-3.5 h-3.5" />
                    套用
                  </button>
                </div>
              );
            })}
          </GlassPanel>
        )}

        {showImport && (
          <GlassPanel variant="subtle" className="p-4 flex flex-wrap gap-2 items-end">
            <label className="flex-1 min-w-[200px] text-sm">
              <span className="text-[var(--text-muted)] block mb-1">新詞庫名稱</span>
              <input
                className="glass-input w-full"
                value={importTitle}
                onChange={(e) => setImportTitle(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="btn-primary"
              disabled={pending}
              onClick={handleImportToDeck}
            >
              建立並匯入 {selectedEntryIds.size} 條
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setShowImport(false)}
            >
              取消
            </button>
          </GlassPanel>
        )}

        {filteredEntries.length === 0 ? (
          <GlassPanel variant="subtle" className="p-10 text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              {entries.length === 0
                ? "尚未有筆記。按「新增筆記」開始收藏。"
                : "此篩選下沒有筆記。"}
            </p>
          </GlassPanel>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredEntries.map((e) => (
              <EntryCard
                key={e.id}
                entry={e}
                folderName={
                  e.folder_id ? folderById.get(e.folder_id)?.name : null
                }
                selected={selectedEntryIds.has(e.id)}
                onToggleSelect={() => toggleSelect(e.id)}
                onEdit={() => openEditEntry(e)}
                onToggleFavorite={() => {
                  startTransition(async () => {
                    await toggleNotebookFavoriteAction({
                      entryId: e.id,
                      isFavorite: !e.is_favorite,
                    });
                    refresh();
                  });
                }}
                onDelete={() => {
                  if (!confirm("刪除此筆記？")) return;
                  startTransition(async () => {
                    await deleteNotebookEntryAction({ entryId: e.id });
                    refresh();
                  });
                }}
                onMove={(folderId) => {
                  startTransition(async () => {
                    await moveNotebookEntryAction({
                      entryId: e.id,
                      folderId,
                    });
                    refresh();
                  });
                }}
                folders={folders}
              />
            ))}
          </div>
        )}
      </div>

      {formOpen && (
        <EntryFormModal
          form={form}
          folders={folders}
          pending={pending}
          error={error}
          onChange={setForm}
          onClose={() => setFormOpen(false)}
          onSave={handleSaveEntry}
        />
      )}
    </div>
  );
}

function FolderNavButton({
  active,
  onClick,
  label,
  count,
  icon,
  className,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition-all duration-300",
        active
          ? "bg-[var(--accent-lime-bg)] text-[var(--accent-lime)]"
          : "text-[var(--text-secondary)] hover:bg-white/[0.06] hover:text-white",
        className,
      )}
    >
      <span className="flex items-center gap-2 truncate">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      {count !== undefined && (
        <span className="text-xs text-[var(--text-muted)] tabular-nums">
          {count}
        </span>
      )}
    </button>
  );
}

function EntryCard({
  entry,
  folderName,
  selected,
  onToggleSelect,
  onEdit,
  onToggleFavorite,
  onDelete,
  onMove,
  folders,
}: {
  entry: NotebookEntry;
  folderName?: string | null;
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
  onMove: (folderId: string | null) => void;
  folders: NotebookFolder[];
}) {
  const aiMeta = entry.ai_metadata as {
    suggested_folder_name?: string;
    reason?: string;
  } | null;

  return (
    <GlassPanel
      className={clsx(
        "flex flex-col gap-2 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.08]",
        selected && "ring-1 ring-[var(--accent-lime)]/45",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <label className="flex items-center gap-2 cursor-pointer min-w-0">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="rounded border-white/20"
          />
          <span className="chip text-[10px]">{KIND_LABELS[entry.kind]}</span>
          {folderName && (
            <span className="text-[10px] text-[var(--text-muted)] truncate">
              {folderName}
            </span>
          )}
        </label>
        <div className="flex shrink-0 gap-0.5">
          <button
            type="button"
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent-amber)]"
            onClick={onToggleFavorite}
            aria-label={entry.is_favorite ? "取消最愛" : "加入最愛"}
          >
            {entry.is_favorite ? (
              <Star className="w-4 h-4 fill-[var(--accent-amber)] text-[var(--accent-amber)]" />
            ) : (
              <StarOff className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            className="p-1.5 text-[var(--text-muted)] hover:text-white"
            onClick={onEdit}
            aria-label="編輯"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--danger)]"
            onClick={onDelete}
            aria-label="刪除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {entry.japanese && (
        <div className="font-jp text-xl leading-snug">{entry.japanese}</div>
      )}
      {entry.reading && (
        <p className="text-xs text-[var(--text-muted)] font-jp">{entry.reading}</p>
      )}
      {entry.meaning_zh && (
        <p className="text-sm text-[var(--zh-text)]">{entry.meaning_zh}</p>
      )}
      {entry.content && (
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3">
          {entry.content}
        </p>
      )}
      {entry.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {entry.tags.map((t) => (
            <span key={t} className="chip text-[10px]">
              {t}
            </span>
          ))}
        </div>
      )}
      {aiMeta?.suggested_folder_name && (
        <p className="text-[10px] text-[var(--accent-sky)]">
          AI 建議：{aiMeta.suggested_folder_name}
          {aiMeta.reason ? ` — ${aiMeta.reason}` : ""}
        </p>
      )}

      <select
        className="glass-input text-xs py-1.5 mt-1"
        value={entry.folder_id ?? ""}
        onChange={(e) =>
          onMove(e.target.value ? e.target.value : null)
        }
      >
        <option value="">收件匣</option>
        {folders.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
    </GlassPanel>
  );
}

function EntryFormModal({
  form,
  folders,
  pending,
  error,
  onChange,
  onClose,
  onSave,
}: {
  form: EntryFormState;
  folders: NotebookFolder[];
  pending: boolean;
  error: string | null;
  onChange: (f: EntryFormState) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <GlassPanel className="w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {form.id ? "編輯筆記" : "新增筆記"}
          </h2>
          <button type="button" onClick={onClose} className="text-[var(--text-muted)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm col-span-2 sm:col-span-1">
            <span className="text-[var(--text-muted)] block mb-1">類型</span>
            <select
              className="glass-input w-full"
              value={form.kind}
              onChange={(e) =>
                onChange({
                  ...form,
                  kind: e.target.value as NotebookEntryKind,
                })
              }
            >
              {(Object.keys(KIND_LABELS) as NotebookEntryKind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm col-span-2 sm:col-span-1">
            <span className="text-[var(--text-muted)] block mb-1">資料夾</span>
            <select
              className="glass-input w-full"
              value={form.folderId ?? ""}
              onChange={(e) =>
                onChange({
                  ...form,
                  folderId: e.target.value || null,
                })
              }
            >
              <option value="">收件匣</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="text-sm block">
          <span className="text-[var(--text-muted)] block mb-1">日文</span>
          <input
            className="glass-input w-full font-jp"
            value={form.japanese}
            onChange={(e) => onChange({ ...form, japanese: e.target.value })}
          />
        </label>
        <label className="text-sm block">
          <span className="text-[var(--text-muted)] block mb-1">讀音</span>
          <input
            className="glass-input w-full font-jp"
            value={form.reading}
            onChange={(e) => onChange({ ...form, reading: e.target.value })}
          />
        </label>
        <label className="text-sm block">
          <span className="text-[var(--text-muted)] block mb-1">中文意思</span>
          <input
            className="glass-input w-full"
            value={form.meaningZh}
            onChange={(e) => onChange({ ...form, meaningZh: e.target.value })}
          />
        </label>
        <label className="text-sm block">
          <span className="text-[var(--text-muted)] block mb-1">內容／摘抄</span>
          <textarea
            className="glass-input w-full min-h-[80px] resize-y"
            value={form.content}
            onChange={(e) => onChange({ ...form, content: e.target.value })}
          />
        </label>
        <label className="text-sm block">
          <span className="text-[var(--text-muted)] block mb-1">標籤（逗號分隔）</span>
          <input
            className="glass-input w-full"
            value={form.tags}
            onChange={(e) => onChange({ ...form, tags: e.target.value })}
          />
        </label>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={form.isFavorite}
            onChange={(e) =>
              onChange({ ...form, isFavorite: e.target.checked })
            }
          />
          加入最愛
        </label>

        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={pending}
            onClick={onSave}
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            儲存
          </button>
        </div>
      </GlassPanel>
    </div>
  );
}
