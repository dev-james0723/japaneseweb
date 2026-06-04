# Playwright authenticated test plan

## Current blocker

Authenticated routes redirect to `/login?next=...` without a valid Supabase test user/session. The smoke pass verified public pages and auth redirects on desktop and mobile, but could not inspect protected flows after login.

Screenshots from the smoke pass are in `artifacts/playwright/`.

## Credentials required

Set these environment variables before running the authenticated pass:

```bash
PLAYWRIGHT_TEST_EMAIL="test@example.com"
PLAYWRIGHT_TEST_PASSWORD="password"
```

Use a disposable Supabase user with seeded data for decks, due reviews, mined sentences, Talk Me sessions, journal entries, roleplay history, and notebook entries.

## Routes to inspect after login

- `/dashboard`: Can-Do mission, daily layers, Professor route, quick links, mobile nav.
- `/review`: recognition, listening, production, cloze, shadowing, reveal, rating buttons, weak rescue, completion summary.
- `/mining`: source controls, textarea, AI mine button, candidate selection, save, review-prompt count.
- `/roleplay`: mission selection, scenario edit, required phrases, send, correction, rubric, next assignment.
- `/talk-me`: duration, lessons, useful sentence, shadowing/conversation toggles, add-to-mined path.
- `/journal`: entry editor, AI correction, saved entries.
- `/notebook`: folders, entries, search/selection interactions.
- `/decks`: deck list, deck detail, review entry points.
- `/grammar`, `/cultural`, `/weekly-review`, `/monthly-audit`, `/stats`, `/settings`.

## Core assertions

- No route has console errors or uncaught page errors.
- Desktop and mobile screenshots show no overlapping text or clipped controls.
- All forms have reachable labels, visible focus, disabled/loading states, and useful empty states.
- Review submission updates the card and advances the queue.
- Weak review ratings show rescue flow and schedule the card sooner.
- Sentence mining save creates four prompt types per saved sentence.
- Roleplay response includes rubric status and task completion.
- Talk Me useful sentence can become review prompts.
