# 日文快上手 — Japanese Vocabulary Review System

AI-driven Japanese vocabulary review web app — daily decks, Romaji-assisted reading, smart grouping, image memory, TTS, spaced repetition, and a growing old/new vocabulary connection graph.

> 單字唔係一粒粒記。單字要織成一張網，先真正入到腦。

## Status

Phase 1–3 scaffolded:

- ✅ Next.js 15 + TS + Tailwind + Liquid Glass design tokens (`Design.md`)
- ✅ Supabase Auth (login / signup) + middleware-protected app routes
- ✅ Database schema with RLS (12 tables, see `supabase/migrations/0001_init.sql`)
- ✅ Dashboard + Sidebar + TopBar shell, Traditional Chinese UI
- ✅ `JapaneseText` ruby renderer with `show_romaji` cookie/profile toggle
- ✅ `SpeakerButton` (UI only — Phase 6 wires Amazon Polly + cache)
- ✅ Manual deck creation (`/decks/new?mode=manual`)
- ✅ AI vocabulary generation (`/api/ai/generate-vocabulary`, OpenAI Chat Completions, Zod-validated)
- ✅ Settings (Romaji toggle, TTS voice, default JLPT level, daily word count)

Pending phases (4–10): Gemini OCR · AI word enrichment · Polly TTS + cache · Review engine · Calendar · Connection graph · GPT Image 2 mnemonic generation.

## Setup

1. **Install deps** — already done by the scaffold:
   ```bash
   npm install
   ```

2. **Copy env file**:
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY` (Phase 3 AI generation)
   - `GEMINI_API_KEY`, AWS Polly creds (later phases)

3. **Create the Supabase schema**:
   - In Supabase dashboard → SQL editor, paste & run `supabase/migrations/0001_init.sql`.
   - Disable email confirmation in Auth settings if you want one-step signup during local dev.

4. **Run**:
   ```bash
   npm run dev
   ```
   Open http://localhost:3001.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 App Router, React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + CSS variables (Liquid Glass tokens) |
| Auth & DB | Supabase (Postgres + RLS + `@supabase/ssr`) |
| AI text | OpenAI Chat Completions (configurable via `OPENAI_TEXT_MODEL`) |
| AI image | GPT Image 2 (configurable via `OPENAI_IMAGE_MODEL`) — Phase 10 |
| OCR | Gemini — Phase 4 |
| TTS | Amazon Polly — Phase 6 |
| Icons | lucide-react |
| Validation | Zod |

## Key files

- `Design.md` — single source of visual truth (Liquid Glass design system).
- `app/(app)/layout.tsx` — authenticated shell, redirects to `/login` if no session.
- `components/JapaneseText.tsx` — server-component ruby renderer honoring `show_romaji` cookie.
- `lib/supabase/server.ts` / `lib/supabase/client.ts` — SSR + browser clients.
- `lib/ai/prompts/` — reusable AI prompt builders (Zod schemas in `lib/ai/schemas.ts`).
- `supabase/migrations/0001_init.sql` — schema + RLS + auto-profile trigger.

## Security notes

- All Supabase service-role usage and AI provider calls are server-only (server actions or `/api/*` routes). No API keys are exposed to the browser.
- RLS policies restrict every table to `auth.uid() = user_id`.
- The `/api/tts` route currently returns 501 by design — see `app/api/tts/route.ts`.
