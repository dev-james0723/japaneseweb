# Japanese Learning Professor Audit

## Diagnosis

The app already has the right raw ingredients: decks, review, audio, sentence mining, roleplay, journal, grammar, culture, and weekly/monthly reflection. The missing structure was not "more pages." It was a stronger learning spine.

My professor-level model for this app is:

1. Retrieve before you reread.
2. Connect sound, script, and meaning every time.
3. Move words into sentences quickly.
4. Produce a tiny output daily.
5. Rescue weak cards immediately instead of letting them become shame cards.

## First Wave Implemented

### Adaptive Review

The old scheduler used fixed buckets: D0, D1, D3, D7, D14, D30, D60. It now accepts four memory ratings: Again, Hard, Good, Easy. Each review updates stability, difficulty, lapses, leech status, and next review timestamps while preserving the existing legacy date field.

This is FSRS-ready rather than a full imported FSRS engine. The database already had FSRS-style columns, so the first wave uses them without a migration.

### Interleaved Review Modes

The review session now rotates through:

- 看字認義: see Japanese, recall reading and meaning.
- 看義產出: see Chinese meaning, produce Japanese.
- 聽音辨義: hear audio first, recall kana, kanji, and meaning.

This directly targets recognition, production, and listening instead of only passive recognition.

### Weak-Card Rescue

Again and Hard no longer simply move on. The app now shows a short rescue panel:

- Read the kana.
- Map it back to highlighted kanji.
- Say the meaning.
- Say the Japanese again.

This turns a failed card into a repair moment.

### Kana-Kanji Bridge

I added a reusable reading bridge component:

音 → 字 → 義

It appears in review answers, weak-card rescue, deck word cards, and quiz reveals. This is the core hiragana/kanji association surface the app needed.

### Professor Route Dashboard

The dashboard now gives a clear daily path:

1. 主動回想
2. 弱點救援
3. 採一句真日文
4. 輸出一句

The app should feel less like a menu and more like a teacher saying: "Do this next."

## Next Best Upgrades

### True FSRS Calibration

Once real review history accumulates, replace the lightweight adaptive scheduler with a full FSRS implementation and persist the exact card state. The natural candidate is the Open Spaced Repetition ecosystem and `ts-fsrs`.

### Per-Word Furigana Alignment

The current bridge highlights kanji and shows whole-word kana. The next level is segmentation:

- tokenize with Kuromoji/Kuroshiro
- attach readings per lexical unit
- show furigana only where it teaches something
- hide furigana during recall, reveal it during rescue

This would make kanji learning feel surgical instead of decorative.

### Sentence Mining To Review Queue

Every mined sentence should generate:

- one cloze card
- one listening card
- one production prompt
- links back to the vocabulary items it reinforces

Words should graduate into sentences as quickly as possible.

### Can-Do Progress

Add ACTFL-style can-do statements so progress is not only "cards reviewed" but "things I can now do":

- I can introduce my day in 3 sentences.
- I can order at a cafe.
- I can explain why I like a show.
- I can ask for clarification politely.

### Teacher Analytics

The app should show a weekly professor note:

- strongest skill
- weakest skill
- kanji families causing trouble
- words remembered in recognition but failing in production
- one precise assignment for the week

## References Used For Direction

- [Open Spaced Repetition](https://github.com/open-spaced-repetition)
- [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)
- [Anki FSRS deck options](https://docs.ankiweb.net/deck-options)
- [Busuu Conversations](https://www.busuu.com/en/languages/language-learning-with-busuu-conversations)
- [LingQ Japanese app](https://apps.apple.com/us/app/learn-japanese-with-lingq/id1218125335)
- [NCSSFL-ACTFL Can-Do Statements](https://www.actfl.org/educator-resources/ncssfl-actfl-can-do-statements)
