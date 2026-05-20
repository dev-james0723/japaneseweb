import { z } from "zod";
import { CULTURAL_CATEGORIES } from "@/lib/cultural/categories";

const jlpt = z.enum(["N5", "N4", "N3", "N2", "N1"]);

export const CulturalArticleParagraphSchema = z.object({
  ja: z.string().min(1),
  zh: z.string().min(1),
  kana_ruby: z.string().optional().default(""),
});

export const CulturalKeyVocabSchema = z.object({
  word: z.string().min(1),
  kana: z.string().optional().default(""),
  meaning_zh: z.string().min(1),
  jlpt_level: z.string().optional().default(""),
  example_sentence: z.string().optional().default(""),
});

export const CulturalKeyGrammarSchema = z.object({
  pattern: z.string().min(1),
  meaning_zh: z.string().min(1),
  example_ja: z.string().min(1),
});

export const GeneratedCulturalArticleSchema = z.object({
  title_ja: z.string().min(1),
  title_zh: z.string().min(1),
  summary_ja: z.string().min(1),
  summary_zh: z.string().min(1),
  estimated_minutes: z.number().int().min(1).max(60).optional().default(8),
  difficulty_jlpt: jlpt,
  body_paragraphs: z.array(CulturalArticleParagraphSchema).min(2).max(8),
  cultural_notes: z.string().min(1),
  cantonese_lens: z.string().optional().default(""),
  key_vocab: z.array(CulturalKeyVocabSchema).min(3).max(12),
  key_grammar: z.array(CulturalKeyGrammarSchema).min(1).max(4),
  surprising_fact: z.string().optional().default(""),
});

export type GeneratedCulturalArticle = z.infer<typeof GeneratedCulturalArticleSchema>;

export const TopicSuggestionSchema = z.object({
  topic: z.string().min(1),
  topic_zh: z.string().optional().default(""),
});

export const GenerateArticleRequestSchema = z.object({
  topic: z.string().min(1).max(200),
  category: z.enum(CULTURAL_CATEGORIES).optional(),
  save: z.boolean().optional().default(true),
  as_daily_pick: z.boolean().optional().default(false),
});
