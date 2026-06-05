繁體中文頁面文案掃描 receipt

日期：2026-06-05

範圍
- 掃描 `app/(app)`、`app/(auth)`、`app/page.tsx`、`components`、`lib/appNav.ts` 的可見 UI 文案。
- 針對頁面標題、按鈕、狀態 chip、empty state、form placeholder、提醒/資料表提示、OS Buddy 選單與遊戲標籤做繁中化。
- 保留品牌/技術詞：AI、JLPT、OCR、SRS、RSS、Podcast、YouTube、Google、Gemini、Anki、Talk Me、Can-Do、Remotion、HyperFrames、GSAP、MP4、API path、資料表/遷移檔名。

主要更改區域
- Repair / Daily Feed / Grammar Map / Dashboard / Review / Quizzes / Stats / Notifications / Goals / Grammar / Library / Motion / Professor / Quick Output / Roleplay / Settings / Shadowing / Self-talk / Talk Me / Weekly Review。
- 共用元件：TopBar、Sidebar、AI feedback、Quick save/mine、Daily feed pulse、motion panels、Remotion recap、OS Buddy UI。
- Auth / landing：login、signup、home hero 的品牌副標。

驗證
- `npm run typecheck`：通過。
- `npm run lint`：通過，0 errors，保留既有 warnings。
- `npm run build`：通過。
- Targeted search confirmed old screenshot strings are gone:
  `Leech repair lane|Start repair|highest-risk pattern|Repair protocol|Grammar map|Output proof|Quick output|Conversation OS|Shadowing queue clear|Nihongo Quick Start|Daily learner OS`

修正中額外處理
- `components/os-buddy/OSBuddyDock.tsx` 的 `touchDistance` 型別由 DOM `TouchList` 改成結構型別，修復 React `TouchList` typecheck failure。

未做 / 風險
- 未做 browser screenshot，因為本輪沒有可用 Browser/Playwright 工具；已用 Next production build 作替代驗證。
- 資料庫或 AI 生成內容若本身回傳英文，仍可能在 UI 中動態出現英文；本輪主要清理硬編 UI 文案。
