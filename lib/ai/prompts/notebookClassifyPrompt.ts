type FolderRef = { id: string; name: string };
type EntryRef = {
  id: string;
  kind: string;
  japanese: string | null;
  reading: string | null;
  meaning_zh: string | null;
  content: string | null;
  tags: string[];
};

export function buildNotebookClassifyPrompt(
  folders: FolderRef[],
  entries: EntryRef[],
): string {
  const folderLines =
    folders.length > 0
      ? folders.map((f) => `- id: ${f.id} | name: ${f.name}`).join("\n")
      : "（用戶尚未建立資料夾，可建議新資料夾名稱）";

  const entryLines = entries
    .map((e) => {
      const parts = [
        `id: ${e.id}`,
        `kind: ${e.kind}`,
        e.japanese ? `japanese: ${e.japanese}` : null,
        e.reading ? `reading: ${e.reading}` : null,
        e.meaning_zh ? `meaning_zh: ${e.meaning_zh}` : null,
        e.content ? `content: ${e.content}` : null,
        e.tags.length ? `tags: ${e.tags.join(", ")}` : null,
      ].filter(Boolean);
      return `- ${parts.join(" | ")}`;
    })
    .join("\n");

  return `你是日文學習筆記本的分類助手。根據每條筆記的內容，建議最合適的資料夾與標籤。

## 現有資料夾
${folderLines}

## 待分類筆記
${entryLines}

## 規則
1. 若現有資料夾名稱語意相符，請用其 id 作為 suggested_folder_id。
2. 若無合適資料夾，suggested_folder_id 設為 null，並在 suggested_folder_name 提供簡短繁體中文資料夾名（2–8 字）。
3. tags 為 0–5 個簡短繁體中文標籤，方便搜尋（例如：敬語、動詞、旅遊）。
4. 每條筆記必須在 suggestions 陣列中有一筆，entry_id 與輸入 id 一致。
5. confidence 為 0–1 的小數；reason 用一句繁體中文說明。

## 輸出 JSON 格式
{
  "suggestions": [
    {
      "entry_id": "uuid",
      "suggested_folder_id": "uuid 或 null",
      "suggested_folder_name": "字串或 null",
      "tags": ["標籤"],
      "confidence": 0.85,
      "reason": "簡短說明"
    }
  ]
}`;
}
