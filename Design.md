# 設計規格書 —「日文快上手」Liquid Glass 日文複習學習系統

**產品名稱：** 日文快上手  
**產品類型：** AI 日文詞彙複習與知識連結 Web App  
**平台定位：** Web 應用程式，桌面優先，行動版適配  
**設計語言 / 簽名風格：** Liquid Glass Glassmorphism，疊加於暗系沉浸式日式書房 / 學習空間背景  
**情感基調：** 高端、沉浸、安靜、專注、智能，像在夜晚書房透過磨砂玻璃整理日文知識網絡  
**主要 UI 語言：** 繁體中文  
**學習內容語言：** 日文為主，輔以 Romaji、繁體中文解釋、必要時少量英文輔助  

---

## 1. 執行摘要

「日文快上手」是一款 AI 驅動的日文詞彙複習 Web App。它不是普通 flashcard app，而是一個每日學習系統，幫助使用者將零散的日文單字轉化成有結構、有圖像、有聲音、有例句、有複習節奏、有舊新詞連結的動態知識庫。

核心設計賣點是 **Liquid Glass 日文學習儀表板**：

- 所有學習模組以半透明磨砂玻璃卡片呈現。
- 背景使用暗系高質感日式書房、夜間學習桌、木質空間、暖色檯燈、筆記本、日文教材、鍵盤、咖啡杯等攝影感元素。
- UI 像浮在真實學習空間上的透明知識層。
- 內容以 Bento Grid 組織，讓每日任務、單字卡、複習進度、Calendar、Quiz、TTS、圖像記憶、智能連結都可以清楚呈現。

**三個開發者必須拿捏的核心效果：**

1. **Backdrop-filter 玻璃面板**  
   每張卡片必須有真實磨砂玻璃質感：  
   `backdrop-filter: blur(20–28px) saturate(140%)`，配合極薄白色邊框與內側高光。

2. **全頁沉浸式學習背景**  
   背景不應是純色。必須使用高解析度暗系日式學習空間攝影或高質感 AI 生成背景。背景固定覆蓋整個視窗，讓玻璃效果真正生效。

3. **學習內容載入動畫**  
   儀表板應有「玻璃空殼 → 學習資料逐步填入」的感覺。  
   初始顯示模糊玻璃容器，然後單字、例句、進度、今日任務、舊詞連結以 fade-in / stagger 動畫逐步出現。

**潛在風險：**

- **可讀性與對比度：** 日文、Romaji、繁中解釋、按鈕都不能因玻璃效果而變得難讀。
- **效能：** `backdrop-filter` 在低端裝置上會消耗 GPU，需要降級方案。
- **行動版可用性：** Bento Grid 在手機上必須改為單欄卡片流，不能硬塞桌面版。
- **日文文字排版：** Romaji 預設顯示於日文漢字上方，必須清楚但不能造成版面擠迫。

---

## 2. 版面系統

### Grid

- **基礎單位：** 8px
- **桌面欄數：**
  - 左側邊欄固定 180px
  - 主內容區使用彈性 Bento Grid
  - 右側可選擇顯示「今日複習 / Calendar / 智能連結」摘要欄，寬度約 300px
- **容器最大寬度：** 1280px 至 1360px
- **卡片間距：** 12–16px
- **頁面外邊距：**
  - 桌面：上方 48–64px，左右 32px
  - 平板：24px
  - 手機：16px

### 版面結構

```text
┌──────────────────────────────────────────────┐
│ TopBar：搜尋單字 / 今日進度 / Settings / User │
├──────────┬───────────────────────────────────┤
│ Sidebar  │  Dashboard Bento Grid             │
│ 180px    │ ┌──────────────┬────────────────┐ │
│          │ │ 今日任務      │ 今日單字摘要     │ │
│          │ ├──────────────┼────────────────┤ │
│          │ │ 複習進度      │ 智能連結建議     │ │
│          │ ├──────────────┴────────────────┤ │
│          │ │ Daily Deck / Quiz / Calendar   │ │
│          │ ├───────────────────────────────┤ │
│          │ │ Learning History / Review Queue│ │
└──────────┴───────────────────────────────────┘
```

### 主要頁面

```text
/
  Landing page

/login
/signup

/dashboard
  今日學習總覽

/decks/new
  建立今日詞庫：手動輸入 / 圖片 OCR / AI 生成

/decks/[id]
  每日詞庫詳細頁

/review
  今日待複習

/calendar
  學習日曆

/vocab/[id]
  單字智能卡

/settings
  Romaji 顯示、TTS 聲音、學習偏好
```

### 斷點

| 名稱 | 寬度 | 用途 |
|---|---:|---|
| mobile | < 768px | 單欄卡片流，側邊欄變底部導覽或抽屜 |
| tablet | 768px | 兩欄 Bento Grid |
| desktop | 1024px | 完整側邊欄 + Bento Grid |
| wide | 1440px+ | 內容置中，max-width 約束 |

### 間距比例

使用 Tailwind spacing scale：

```text
4, 8, 12, 16, 20, 24, 32, 40, 48, 64
```

---

## 3. 色彩系統

### 主色板

| Token | Hex / RGBA | 角色 | 備註 |
|---|---|---|---|
| `--bg-photo` | 攝影背景 | 全頁背景 | 暗系日式書房、夜間學習桌、暖燈、木質元素 |
| `--surface-glass-1` | `rgba(255,255,255,0.07)` | 主玻璃面板 | 最常用卡片背景 |
| `--surface-glass-2` | `rgba(255,255,255,0.12)` | 高層玻璃面板 | 用於 active card / modal / sidebar |
| `--surface-dark` | `rgba(12,10,9,0.58)` | 深色玻璃區塊 | 用於 Quiz、Review、重點單字 |
| `--border-glass` | `rgba(255,255,255,0.18)` | 玻璃邊框 | 1px |
| `--border-subtle` | `rgba(255,255,255,0.08)` | 次要分隔線 | 表格、列表分隔 |
| `--accent-lime` | `#C8E53A` | 主要 CTA / Active 狀態 | 保留 Liquid Glass 的鮮明科技感 |
| `--accent-lime-bg` | `rgba(200,229,58,0.15)` | Active 背景 | 導覽 / 選中項目 |
| `--accent-sakura` | `#F9A8D4` | 日文學習輔助色 | 用於記憶圖像、柔和提示 |
| `--accent-amber` | `#FBBF24` | 暖色提示 | Streak、Calendar、提醒 |
| `--accent-sky` | `#7DD3FC` | 聽力 / TTS | Speaker button 或音訊狀態 |
| `--success` | `#4ADE80` | 答對 / 已掌握 | Quiz feedback |
| `--danger` | `#F87171` | 答錯 / 弱項 | Quiz feedback |
| `--warning` | `#FACC15` | 待複習 | Review queue |
| `--text-primary` | `#FFFFFF` | 主要文字 | 中文、標題、重要數字 |
| `--text-secondary` | `rgba(255,255,255,0.72)` | 次要文字 | 說明、caption |
| `--text-muted` | `rgba(255,255,255,0.45)` | 輔助文字 | placeholder、meta |
| `--text-romaji` | `rgba(255,255,255,0.60)` | Romaji | 必須細但清楚 |
| `--jp-text` | `#FFFFFF` | 日文主要文字 | 單字、句子 |
| `--zh-text` | `rgba(255,255,255,0.82)` | 繁中解釋 | 意思、說明 |

### 學習狀態色

| 狀態 | 顏色 | 用途 |
|---|---|---|
| New | `#7DD3FC` | 新單字 |
| Learning | `#FBBF24` | 學習中 |
| Reviewing | `#C8E53A` | 正在複習 |
| Weak | `#F87171` | 弱項 |
| Mastered | `#4ADE80` | 已掌握 |

### 漸層

- **學習進度圖表填充：**  
  `linear-gradient(180deg, rgba(200,229,58,0.28) 0%, rgba(200,229,58,0) 100%)`

- **背景暗角：**  
  在背景圖片上加 overlay：  
  `radial-gradient(circle at center, rgba(0,0,0,0.10), rgba(0,0,0,0.55))`

- **卡片頂部玻璃高光：**  
  `inset 0 1px 0 rgba(255,255,255,0.10)`

---

## 4. 字型排版

### 字型家族

- **主要 UI 字型：** Inter 或 Noto Sans TC
- **繁體中文建議：** `Noto Sans TC`
- **日文建議：** `Noto Sans JP`
- **數字：** Inter with `font-variant-numeric: tabular-nums`
- **備選：** IBM Plex Sans TC、Source Han Sans TC / JP

### 字型比例

| 角色 | 大小 | 字重 | Line-height | 用途 |
|---|---:|---:|---:|---|
| Display / Hero | 32–40px | 700 | 1.1 | Landing page 標題 |
| Page Title | 24–28px | 650 | 1.2 | Dashboard / Deck title |
| Card Title | 16–18px | 600 | 1.25 | 今日任務、單字卡標題 |
| Japanese Word | 24–32px | 600 | 1.25 | 單字主體 |
| Japanese Sentence | 16–20px | 500 | 1.65 | 例句、會話 |
| Romaji Annotation | 10–12px | 500 | 1.0 | 日文漢字上方註音 |
| Body | 14–15px | 400 | 1.55 | 中文解釋、內容 |
| Caption | 11–12px | 400 | 1.4 | JLPT、詞性、日期 |
| Badge | 11–12px | 600 | 1.0 | Tier、狀態、Quiz feedback |

### 文字語言規則

- 全站 UI 以繁體中文為主。
- 日文只用於：
  - 單字
  - 假名
  - 例句
  - 會話
  - 小故事
  - Quiz 題目與答案
- 英文只可作為輔助標籤，不應成為主 UI 語言。
- 所有使用者提示、錯誤訊息、按鈕、導覽、設定說明必須使用繁體中文。

---

## 5. 日文顯示與 Romaji 規格

### 核心要求

所有日文漢字預設要在上方顯示 Romaji。

例如：

```html
<ruby>
  神社
  <rt>jinja</rt>
</ruby>
```

視覺上應呈現為：

```text
jinja
神社
```

### 預設行為

- `show_romaji = true`
- Romaji 預設顯示於所有日文漢字上方。
- 使用者可在 Settings 關閉。
- 關閉後，全站日文不再顯示 Romaji annotation。
- 此設定必須儲存於 Supabase，並跨裝置同步。

### 套用範圍

Romaji annotation 應用於：

- 單字卡
- 例句
- 會話
- Story Chain
- Quiz 題目
- Quiz 答案
- Review cards
- Calendar 中的詞庫 preview
- Connections tab 的混合例句
- Vocabulary detail page

### 設計要求

- Romaji 必須比日文字小。
- Romaji 使用 `--text-romaji`。
- Romaji 不應太亮，以免干擾主文字。
- 行高要足夠，避免 annotation 擠壓句子。
- 長句中的 Romaji 不應造成嚴重換行混亂。
- 可用可重用元件 `JapaneseText` 或 `RubyText` 管理。

### 注意

- Romaji 不等於 kana。
- App 仍然要儲存 kana reading。
- 未來可以擴展 kana furigana mode，但目前預設是 Romaji mode。

---

## 6. 圖示系統

- **風格：** 細線、圓角、輕盈，適合玻璃 UI。
- **推薦來源：** Lucide React。
- **尺寸：**
  - Sidebar icon：20×20
  - Card action icon：18×18
  - Speaker button：18–22×22
  - Main CTA icon：20×20
- **容器：**
  - Active icon 使用 32–36px 圓角玻璃容器。
  - Speaker button 使用透明玻璃圓形按鈕。
- **狀態色：**
  - Active：`--accent-lime`
  - TTS：`--accent-sky`
  - Correct：`--success`
  - Incorrect：`--danger`

### 建議圖示對應

| 功能 | Icon |
|---|---|
| Dashboard | LayoutDashboard |
| 今日詞庫 | BookOpen |
| 新增詞庫 | PlusCircle |
| AI 生成 | Sparkles |
| 圖片 OCR | ImageUp |
| 複習 | RefreshCw |
| Calendar | CalendarDays |
| Quiz | CircleHelp |
| 智能連結 | Network |
| TTS | Volume2 |
| Settings | Settings |
| User | UserCircle |
| Logout | LogOut |

---

## 7. 核心元件清單

### 7.1 `GlassPanel`

**用途：** 所有卡片基礎容器。

**樣式：**

```css
.glass-panel {
  background: rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(24px) saturate(140%);
  -webkit-backdrop-filter: blur(24px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 20px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.10);
}
```

**要求：**

- 必須有非純色背景。
- hover 時可微亮。
- 支援 `variant="default" | "dark" | "highlight" | "subtle"`。

---

### 7.2 `AppBackground`

**用途：** 全頁沉浸式背景。

**背景方向：**

- 暗系日式書房
- 深色木材
- 暖色檯燈
- 日文教材
- 筆記本
- 鋼筆
- 咖啡杯
- 電腦螢幕微光
- 可加入柔和窗外夜景

**樣式：**

```css
.app-background {
  position: fixed;
  inset: 0;
  background-image: url('/backgrounds/japanese-study-room.webp');
  background-size: cover;
  background-position: center;
  z-index: -1;
  animation: subtlePan 30s ease-in-out infinite alternate;
}

.app-background::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at center, rgba(0,0,0,0.12), rgba(0,0,0,0.58)),
    linear-gradient(180deg, rgba(0,0,0,0.10), rgba(0,0,0,0.35));
}
```

---

### 7.3 `Sidebar`

**用途：** 主要導覽。

**寬度：** 180px desktop。

**導覽項目：**

- 今日總覽
- 今日詞庫
- 建立詞庫
- AI 生成
- 圖片 OCR
- 待複習
- 學習日曆
- 智能連結
- 小測紀錄
- 設定

**底部：**

- 使用者資訊
- 登出

**Active 狀態：**

- 黃綠色 icon container
- 背景 `rgba(200,229,58,0.15)`
- 文字白色或 lime

---

### 7.4 `TopBar`

**用途：** 全站搜尋、快速操作、使用者入口。

**內容：**

- 搜尋欄：`搜尋單字、例句、日期或主題...`
- 快捷鍵提示：`⌘K`
- 今日 streak
- 今日待複習數量
- Settings icon
- User avatar

**樣式：**

- 輕量玻璃背景
- sticky top
- 高度約 56px
- 搜尋欄本身也是 glass input

---

### 7.5 `TodayStudySummaryCard`

**用途：** Dashboard 上方今日任務摘要。

**內容：**

- 今日日期
- 今日新單字數
- 今日待複習字數
- 今日完成度
- Study streak
- CTA：`開始今日複習`

**視覺：**

- 大數字使用 tabular nums。
- 狀態 badge 使用 lime / amber / sky。
- 需要清楚表達「今天要做什麼」。

---

### 7.6 `DailyDeckCard`

**用途：** 顯示今日詞庫或某日詞庫摘要。

**內容：**

- Deck title
- 日期
- 來源：
  - 手動輸入
  - 圖片 OCR
  - AI 生成
- Topic
- 單字數
- Tier 1 / Tier 2 / Tier 3 分布
- CTA：`打開詞庫`

---

### 7.7 `WordIntelligenceCard`

**用途：** 單字詳細卡片，是整個產品的核心元件。

**內容：**

- Romaji annotation
- Japanese word
- Kana
- 詞性
- JLPT level
- 中文意思
- English meaning optional
- 常見助詞
- 常見搭配
- 例句
- Speaker button
- Tier badge
- Review status
- Mnemonic
- Related words
- Confusing words

**設計重點：**

- 日文主字要大。
- Romaji 預設顯示在上方。
- Speaker button 必須易按。
- 中文解釋清楚，不要被視覺效果淹沒。
- 資訊要分區，不要全部塞成一大段。

---

### 7.8 `SpeakerButton`

**用途：** 播放日文單字或句子的 TTS。

**狀態：**

- idle
- loading
- playing
- error

**樣式：**

- 小型圓形 glass button
- icon 使用 `Volume2`
- playing 時可有 subtle pulse ring
- error 時顯示紅色提示

---

### 7.9 `CreateDeckCard`

**用途：** 建立詞庫入口。

**三個入口：**

1. 手動輸入
2. 圖片 OCR
3. AI 生成 10 個單字

**設計：**

- 三張橫向或直向 glass cards
- 每張有 icon、標題、短說明、CTA
- AI 生成可使用 `Sparkles` icon
- OCR 使用 `ImageUp`
- 手動輸入使用 `Keyboard`

---

### 7.10 `AIVocabularyGenerator`

**用途：** 讓使用者選 Topic，AI 生成今日單字。

**內容：**

- Topic chip group
- 自訂 topic input
- 難度選擇：
  - 初級
  - 中級
  - 高級
- 生成數量預設 10
- CTA：`生成今日單字`

**Topic chips：**

- 音樂
- 藝術
- 運動
- 食物
- 甜品
- 建築
- 國家
- 旅行
- 學校
- 工作
- 日常生活
- 感情
- 天氣
- 交通
- 家庭
- 健康
- 科技
- 電影
- 日本文化
- 鋼琴
- 音樂會
- 工作室
- 錄音

---

### 7.11 `ImageUploadOCR`

**用途：** 上載日文教材、筆記、課本照片，交由 Gemini OCR。

**流程 UI：**

1. 拖放 / 上載圖片
2. 顯示圖片 preview
3. 按 `開始識別`
4. loading glass skeleton
5. 顯示 OCR extracted table
6. 使用者確認 / 修改 / 刪除
7. 儲存為今日詞庫

**注意：**

- Gemini OCR 結果未確認前，不應直接存為正式詞庫。
- 錯誤訊息使用繁體中文。

---

### 7.12 `SmartGroupingView`

**用途：** 將一課單字重組成有意義的群組。

**群組模式：**

- 主題分組
- 詞性分組
- 使用場景分組
- 助詞搭配分組
- 易混詞分組
- 舊新詞連結分組

**設計：**

- 每個群組是一張小 glass panel。
- 群組標題使用 badge。
- 可展開 / 收合。

---

### 7.13 `StoryChainView`

**用途：** 用今日詞彙生成一段短故事。

**內容：**

- 日文故事
- Romaji annotation
- 繁中翻譯
- Speaker buttons
- 高亮今日單字
- 可切換：
  - 簡單版
  - 搞笑版
  - 生活化版

---

### 7.14 `ConversationPracticeView`

**用途：** 用今日單字生成對話練習。

**內容：**

- A / B 對話
- 日文
- Romaji
- 繁中翻譯
- Speaker button per line
- Practice prompt：使用者可嘗試回答

**設計：**

- Chat bubble style，但仍保持 glass effect。
- A/B 氣泡可用 subtle accent 區分。

---

### 7.15 `QuizCard`

**用途：** 小測驗。

**題型：**

- 日文 → 中文
- 中文 → 日文
- Kanji → Kana
- 助詞填空
- 聽力題
- 句子填空
- 情境回答

**Feedback：**

- 答對：green glow
- 答錯：red subtle border
- 顯示正確答案和繁中解釋
- 更新 review schedule

---

### 7.16 `ReviewQueue`

**用途：** 顯示今天需要複習的舊詞。

**內容：**

- due today
- weak words
- recently missed
- mastered
- review CTA

**設計：**

- 類似任務清單
- 每個詞有 status badge
- 支援 quick review

---

### 7.17 `CalendarView`

**用途：** 學習日曆。

**標記：**

- 有學習紀錄
- 已完成
- 未完成
- 有待複習
- 今日

**點擊日期後：**

- 顯示當日 deck
- 當日單字
- Quiz 成績
- 圖像記憶
- 舊新詞連結
- 可重新複習

---

### 7.18 `ConnectionGraph`

**用途：** 顯示新詞與舊詞的智能連結。

**節點類型：**

- 今日新詞
- 舊詞
- 主題
- 助詞 pattern
- 場景
- 易混詞

**視覺：**

- Glass panel 裡的簡化 network graph
- 不需要過度複雜
- 點擊節點可展開例句
- 連線類型用顏色或 label 表示

---

### 7.19 `GeneratedImageCard`

**用途：** 顯示 AI 生成的圖像記憶。

**類型：**

- 今日詞庫場景圖
- 單字 mnemonic 圖
- 故事圖

**內容：**

- 圖片
- prompt 摘要
- 相關單字 chips
- 重新生成 button
- 儲存 button

---

### 7.20 `LearningHistoryTable`

**用途：** 顯示學習歷史，不是交易歷史。

**欄位：**

- 日期
- 詞庫主題
- 來源
- 新單字數
- 複習完成率
- Quiz 正確率
- 弱項數
- 操作

**篩選：**

- 全部
- 今日
- 本週
- 本月
- 已完成
- 未完成

**樣式：**

- 無傳統厚邊框
- 行間使用淡白分隔線
- 操作按鈕為小型 glass icon button

---

## 8. 互動與動畫

### 微互動

| 元素 | 觸發 | 行為 | 時長 | 緩動 |
|---|---|---|---:|---|
| 玻璃卡片 | hover | 邊框微亮 + 上移 2px | 200ms | ease-out |
| Sidebar item | hover | 背景填入 `rgba(255,255,255,0.05)` | 150ms | ease-out |
| CTA button | hover | 亮度 +12%，scale 1.02 | 120ms | ease-out |
| Speaker button | click | pulse ring + loading spinner | 180ms | ease-out |
| Quiz option | click | selected glow | 150ms | ease-out |
| Tab 切換 | click | active pill sliding animation | 250ms | cubic-bezier |
| Calendar day | hover | subtle glass highlight | 150ms | ease-out |

### 頁面載入簽名動畫

1. 玻璃 panel 先出現。
2. Skeleton 區塊顯示。
3. 學習資料 stagger fade-in。
4. 今日任務 / 單字 / Review / Calendar 逐步填入。
5. 背景有極輕微 parallax pan。

建議 Framer Motion：

```tsx
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.25 }
  }
}

const card = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: 'easeOut' } }
}
```

### 背景視差

```css
@keyframes subtlePan {
  from { background-position: 48% 50%; }
  to   { background-position: 52% 50%; }
}
```

使用者開啟 reduced motion 時必須停用。

---

## 9. 簽名效果實作配方

### 9.1 標準玻璃面板

```css
.glass-panel {
  background: rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(24px) saturate(140%);
  -webkit-backdrop-filter: blur(24px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 20px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.10);
}
```

### 9.2 深色玻璃面板

```css
.glass-panel-dark {
  background: rgba(10, 8, 8, 0.55);
  backdrop-filter: blur(20px) saturate(120%);
  -webkit-backdrop-filter: blur(20px) saturate(120%);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 18px;
}
```

### 9.3 Lime CTA Button

```css
.btn-primary {
  background: #C8E53A;
  color: #0D0D0D;
  font-weight: 650;
  font-size: 14px;
  padding: 8px 18px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  transition: filter 120ms ease-out, transform 120ms ease-out;
}

.btn-primary:hover {
  filter: brightness(1.12);
  transform: scale(1.02);
}
```

### 9.4 Speaker Button

```css
.speaker-button {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: rgba(125, 211, 252, 0.12);
  border: 1px solid rgba(125, 211, 252, 0.24);
  backdrop-filter: blur(16px) saturate(140%);
  color: #7DD3FC;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 120ms ease-out, background 120ms ease-out;
}

.speaker-button:hover {
  transform: scale(1.04);
  background: rgba(125, 211, 252, 0.20);
}
```

### 9.5 Romaji Ruby Text

```css
.japanese-ruby {
  ruby-align: center;
  line-height: 1.75;
}

.japanese-ruby rt {
  color: rgba(255,255,255,0.60);
  font-size: 0.55em;
  font-weight: 500;
  letter-spacing: 0.02em;
}
```

### 9.6 Review Progress Area Chart

```jsx
<defs>
  <linearGradient id="reviewProgressFill" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor="rgba(200,229,58,0.28)" />
    <stop offset="100%" stopColor="rgba(200,229,58,0)" />
  </linearGradient>
</defs>
```

### 9.7 Backdrop-filter 降級方案

```css
@supports not (backdrop-filter: blur(1px)) {
  .glass-panel {
    background: rgba(20, 18, 16, 0.88);
  }

  .glass-panel-dark {
    background: rgba(10, 8, 8, 0.92);
  }
}
```

---

## 10. 無障礙設計備註

### 對比度

- 小字、Romaji、caption 必須保持可讀。
- 如果背景太亮，卡片需自動加深 overlay。
- `--text-secondary` 不應低於 `rgba(255,255,255,0.65)`。

### Focus Ring

```css
*:focus-visible {
  outline: 2px solid #C8E53A;
  outline-offset: 2px;
  border-radius: 6px;
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }

  .app-background {
    animation: none;
  }
}
```

### Keyboard Navigation

必須支援鍵盤操作：

- Sidebar
- Top search
- Topic chips
- Quiz options
- Speaker buttons
- Calendar day cells
- Settings toggles
- Modal close buttons

### ARIA

所有 icon-only buttons 必須有 `aria-label`：

- Speaker button
- Settings button
- Delete word
- Edit word
- Regenerate image
- Start OCR
- Calendar previous / next

---

## 11. 推薦技術堆疊

| 層級 | 技術 | 理由 |
|---|---|---|
| 框架 | Next.js App Router | 適合 Web App 和 Vercel 部署 |
| 語言 | TypeScript | 保持資料結構穩定 |
| 樣式 | Tailwind CSS + CSS variables | 快速實作 Liquid Glass token |
| UI 基礎 | shadcn/ui + Radix UI | Tabs、Dialog、Dropdown、Switch、Calendar |
| 動畫 | Framer Motion | stagger、layout animation、fade-in |
| 圖示 | Lucide React | 清晰、輕量、適合學習 app |
| 圖表 | Recharts | Review progress、streak、quiz stats |
| 字型 | next/font/google | Noto Sans TC、Noto Sans JP、Inter |
| 狀態 | Zustand 或 React state | UI 偏好、Romaji toggle |
| 資料 | Supabase | Auth、Postgres、Storage |
| AI OCR | Gemini | 圖片 / 筆記 / 教材文字識別 |
| 圖像生成 | GPT Image 2 | 生成單字記憶圖像 |
| TTS | Amazon Polly | 日文單字與句子發音 |
| Cache | Supabase Storage + DB | TTS 音訊和生成圖片儲存 |

---

## 12. 頁面詳細設計

### 12.1 Landing Page

**目的：** 介紹「日文快上手」不是普通背單字工具，而是 AI 詞彙記憶系統。

**內容：**

- Hero title：`日文快上手`
- Subtitle：`將零散單字織成一張真正記得住的知識網`
- CTA：
  - `開始今日複習`
  - `建立免費帳戶`
- Feature cards：
  - AI 生成今日單字
  - 圖片 OCR 匯入教材
  - Romaji 預設輔助閱讀
  - TTS 發音
  - Spaced Repetition
  - 舊詞新詞智能連結

---

### 12.2 Dashboard

**核心卡片：**

- 今日任務
- 今日新單字
- 今日待複習
- 學習 streak
- 最近詞庫
- 智能連結建議
- 弱項提醒
- Calendar preview

**設計：**

- Bento Grid
- 今日任務卡最大
- CTA 明顯
- 避免太多表格

---

### 12.3 Create Deck Page

**三大入口：**

1. 手動輸入
2. 圖片 OCR
3. AI 生成

每個入口都是大型 glass card。

---

### 12.4 Daily Deck Page

使用 tabs：

- 單字
- 分組
- 圖像記憶
- 例句
- 會話
- 小測
- 連結

每個 tab 必須有清楚空狀態和 loading 狀態。

---

### 12.5 Review Page

**流程：**

1. 顯示今日 due words。
2. 開始複習 session。
3. 一題一題回答。
4. 顯示 feedback。
5. 更新 review schedule。
6. 結尾 summary。

**視覺：**

- Focus mode
- 單題大卡片
- 少干擾
- Speaker button 明顯

---

### 12.6 Calendar Page

**設計：**

- 月曆 glass panel
- 日期有學習狀態標記
- 右側或底部顯示 selected date deck summary
- 支援跳回該日詞庫

---

### 12.7 Settings Page

**必須有：**

- Romaji 顯示開關
- TTS voice 選擇
- 預設學習難度
- 每日生成單字數
- 主題偏好
- Account settings

**Romaji toggle UI：**

```text
顯示 Romaji
預設開啟。關閉後，全站日文漢字上方不再顯示 Romaji。
[ On / Off ]
```

---

## 13. 資產清單

開發者需準備或生成以下素材：

- [ ] 背景圖片：暗系日式書房 / 夜晚學習桌 / 高級木質空間
- [ ] App Logo：日文快上手，可結合「日」「本」「語」或書本 / 光點 / 網絡節點元素
- [ ] Glass UI token CSS
- [ ] Noto Sans TC
- [ ] Noto Sans JP
- [ ] Inter
- [ ] Lucide React icons
- [ ] Empty state illustration optional
- [ ] AI mnemonic image placeholder
- [ ] TTS loading animation
- [ ] Calendar status indicators

---

## 14. 不應保留的加密貨幣元素

這份設計已轉換為日文學習 app。

開發時不得保留以下內容：

- CryptoNest
- cryptocurrency
- wallet
- BTC
- ETH
- SOL
- BNB
- token price
- Dex
- trade history
- market statistics
- dominance chart
- buy / sell / exchange
- crypto asset sidebar
- coin logo
- trading bots
- price chart
- portfolio value

任何原本屬於加密貨幣 dashboard 的元件，都必須改成日文學習用途。

---

## 15. 對應轉換表

| 原 Crypto Dashboard 元件 | 「日文快上手」對應元件 |
|---|---|
| CryptoNest | 日文快上手 |
| BTC Price Card | 今日學習摘要卡 |
| Wallet Card | 今日詞庫卡 |
| Buy / Sell / Exchange | 建立詞庫 / 開始複習 / 生成單字 |
| Trading Bots | 智能複習 / AI 生成 / OCR |
| Assets | 詞庫分類 / Topic |
| Overview Chart | 複習進度圖 |
| General Statistics | 學習統計 |
| Dominance Chart | 詞彙類別分布 / 掌握狀態圖 |
| History Table | 學習歷史表 |
| Token Price | Quiz 正確率 / Review 狀態 |
| Dex | 詞庫來源 |
| Qty | 單字數 |
| ETH / BTC / SOL | Noun / Verb / Adjective / Adverb |

---

## 16. 實作優先級

### Phase 1：視覺基礎

- AppBackground
- GlassPanel
- Sidebar
- TopBar
- Dashboard shell
- Design tokens
- Responsive layout

### Phase 2：核心學習 UI

- TodayStudySummaryCard
- DailyDeckCard
- WordIntelligenceCard
- JapaneseText / Romaji rendering
- SpeakerButton UI

### Phase 3：功能頁面

- Create Deck
- AI Generate
- OCR Upload
- Daily Deck Tabs
- Review Page
- Calendar Page
- Settings Page

### Phase 4：進階視覺

- ConnectionGraph
- GeneratedImageCard
- Review progress chart
- Loading skeleton
- Page transition
- Reduced motion support

---

## 17. 最終設計原則

這個 app 的視覺不應像普通學習平台，也不應像兒童語言 app。

它應該像：

> 一個高級、安靜、沉浸式的 AI 日文學習控制台。

核心感覺：

- 學習是有秩序的
- 單字是有連結的
- 每日複習是可追蹤的
- 日文閱讀是被輔助的
- AI 是背後整理知識的智能系統
- 使用者一打開網站，就知道今天要學什麼、複習什麼、哪裡還弱

最重要的一句產品精神：

```text
單字唔係一粒粒記。
單字要織成一張網，先真正入到腦。
```

所有 UI 和互動都要服務這個核心。
