# Research-to-feature mapping

## Retrieval practice / testing effect

- `app/(app)/review/ReviewSession.tsx` requires active recall before reveal across vocabulary and sentence prompts.
- Review modes now include recognition, listening, production, cloze, and shadowing.
- Weak answers trigger a rescue panel before the learner continues.

## Spacing effect / distributed practice

- `app/api/review/sentence-submit/route.ts` uses the existing adaptive scheduler from `lib/srs.ts`.
- Sentence prompts store stability, difficulty, lapses, leech state, next review date, and FSRS-like state in `sentence_review_prompts`.
- Existing vocabulary review scheduling remains intact.

## Cumulative L2 vocabulary testing

- `app/(app)/review/page.tsx` mixes due vocabulary, fresh vocabulary, weak items, and due sentence prompts into one review queue.
- Saved mined sentences generate cloze, listening, production, and shadowing prompts, so old vocabulary appears inside sentences rather than only as isolated words.

## Task-based language teaching

- `lib/learning/communicationGoals.ts` defines phase-level Can-Do tasks with scenario, required phrases, success criteria, and proof.
- `app/(app)/roleplay/RoleplayClient.tsx` uses task missions instead of loose presets.
- `app/api/ai/roleplay/route.ts` asks the AI to return task completion, rubric evidence, reusable patterns, and a next assignment.

## ACTFL / Can-Do style goals

- Dashboard now surfaces a daily Can-Do mission and proof of ability.
- Can-Do goals link into review, mining, journal, roleplay, Talk Me, and related support routes.
- Roleplay tracks whether the communicative task is complete, not only whether the learner sent messages.

## Shadowing for Japanese pronunciation

- Mined and Talk Me sentences generate `shadowing` prompts.
- Review displays a listen, repeat with text, repeat without text sequence.
- Talk Me logging includes the same three-step shadowing checklist and saves useful phrases into review.
