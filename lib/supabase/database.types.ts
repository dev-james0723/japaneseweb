export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      adjective_forms: {
        Row: {
          adjective_type: string | null
          adverbial_form: string | null
          created_at: string
          id: string
          negative_form: string | null
          noun_modifying_example: string | null
          past_form: string | null
          past_negative_form: string | null
          vocab_id: string
        }
        Insert: {
          adjective_type?: string | null
          adverbial_form?: string | null
          created_at?: string
          id?: string
          negative_form?: string | null
          noun_modifying_example?: string | null
          past_form?: string | null
          past_negative_form?: string | null
          vocab_id: string
        }
        Update: {
          adjective_type?: string | null
          adverbial_form?: string | null
          created_at?: string
          id?: string
          negative_form?: string | null
          noun_modifying_example?: string | null
          past_form?: string | null
          past_negative_form?: string | null
          vocab_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "adjective_forms_vocab_id_fkey"
            columns: ["vocab_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_items"
            referencedColumns: ["id"]
          },
        ]
      }
      cultural_contents: {
        Row: {
          ai_summary_ja: string | null
          ai_summary_zh: string | null
          body_ja: string | null
          body_paragraphs: Json | null
          body_zh: string | null
          cantonese_lens_image_prompt: string | null
          cantonese_lens_image_url: string | null
          cantonese_lens: string | null
          category: string
          content_type: string
          created_at: string
          cultural_notes: string | null
          daily_pick_date: string | null
          difficulty_jlpt: string | null
          estimated_minutes: number | null
          id: string
          is_daily_pick: boolean
          key_grammar: Json
          key_vocab: Json
          podcast_audio_url: string | null
          podcast_episode_title: string | null
          podcast_show_name: string | null
          source_name: string | null
          source_url: string | null
          thumbnail_url: string | null
          title_ja: string
          title_zh: string
          user_id: string | null
          youtube_channel_title: string | null
          youtube_thumbnail_url: string | null
          youtube_video_id: string | null
        }
        Insert: {
          ai_summary_ja?: string | null
          ai_summary_zh?: string | null
          body_ja?: string | null
          body_paragraphs?: Json | null
          body_zh?: string | null
          cantonese_lens_image_prompt?: string | null
          cantonese_lens_image_url?: string | null
          cantonese_lens?: string | null
          category: string
          content_type: string
          created_at?: string
          cultural_notes?: string | null
          daily_pick_date?: string | null
          difficulty_jlpt?: string | null
          estimated_minutes?: number | null
          id?: string
          is_daily_pick?: boolean
          key_grammar?: Json
          key_vocab?: Json
          podcast_audio_url?: string | null
          podcast_episode_title?: string | null
          podcast_show_name?: string | null
          source_name?: string | null
          source_url?: string | null
          thumbnail_url?: string | null
          title_ja: string
          title_zh: string
          user_id?: string | null
          youtube_channel_title?: string | null
          youtube_thumbnail_url?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          ai_summary_ja?: string | null
          ai_summary_zh?: string | null
          body_ja?: string | null
          body_paragraphs?: Json | null
          body_zh?: string | null
          cantonese_lens_image_prompt?: string | null
          cantonese_lens_image_url?: string | null
          cantonese_lens?: string | null
          category?: string
          content_type?: string
          created_at?: string
          cultural_notes?: string | null
          daily_pick_date?: string | null
          difficulty_jlpt?: string | null
          estimated_minutes?: number | null
          id?: string
          is_daily_pick?: boolean
          key_grammar?: Json
          key_vocab?: Json
          podcast_audio_url?: string | null
          podcast_episode_title?: string | null
          podcast_show_name?: string | null
          source_name?: string | null
          source_url?: string | null
          thumbnail_url?: string | null
          title_ja?: string
          title_zh?: string
          user_id?: string | null
          youtube_channel_title?: string | null
          youtube_thumbnail_url?: string | null
          youtube_video_id?: string | null
        }
        Relationships: []
      }
      cultural_interactions: {
        Row: {
          content_id: string
          created_at: string
          id: string
          interaction_type: string
          journal_entry_id: string | null
          notes: string | null
          rating: number | null
          read_progress: number
          sentences_mined_ids: string[]
          time_spent_seconds: number
          updated_at: string
          user_id: string
          vocab_added_ids: string[]
        }
        Insert: {
          content_id: string
          created_at?: string
          id?: string
          interaction_type: string
          journal_entry_id?: string | null
          notes?: string | null
          rating?: number | null
          read_progress?: number
          sentences_mined_ids?: string[]
          time_spent_seconds?: number
          updated_at?: string
          user_id: string
          vocab_added_ids?: string[]
        }
        Update: {
          content_id?: string
          created_at?: string
          id?: string
          interaction_type?: string
          journal_entry_id?: string | null
          notes?: string | null
          rating?: number | null
          read_progress?: number
          sentences_mined_ids?: string[]
          time_spent_seconds?: number
          updated_at?: string
          user_id?: string
          vocab_added_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "cultural_interactions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "cultural_contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cultural_interactions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      cultural_article_motion_jobs: {
        Row: {
          article_id: string
          completed_at: string | null
          created_at: string
          engine: string
          error_message: string | null
          id: string
          motion_manifest: Json
          outputs: Json
          render_requested_at: string | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          article_id: string
          completed_at?: string | null
          created_at?: string
          engine?: string
          error_message?: string | null
          id?: string
          motion_manifest?: Json
          outputs?: Json
          render_requested_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          article_id?: string
          completed_at?: string | null
          created_at?: string
          engine?: string
          error_message?: string | null
          id?: string
          motion_manifest?: Json
          outputs?: Json
          render_requested_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cultural_article_motion_jobs_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "cultural_contents"
            referencedColumns: ["id"]
          },
        ]
      }
      cultural_preferences: {
        Row: {
          avoided_categories: string[]
          created_at: string
          daily_push_category_rotation: boolean
          daily_push_enabled: boolean
          daily_push_time: string
          language_blend_override: string | null
          last_pushed_category: string | null
          preferred_categories: string[]
          preferred_channels: string[]
          preferred_podcasts: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          avoided_categories?: string[]
          created_at?: string
          daily_push_category_rotation?: boolean
          daily_push_enabled?: boolean
          daily_push_time?: string
          language_blend_override?: string | null
          last_pushed_category?: string | null
          preferred_categories?: string[]
          preferred_channels?: string[]
          preferred_podcasts?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          avoided_categories?: string[]
          created_at?: string
          daily_push_category_rotation?: boolean
          daily_push_enabled?: boolean
          daily_push_time?: string
          language_blend_override?: string | null
          last_pushed_category?: string | null
          preferred_categories?: string[]
          preferred_channels?: string[]
          preferred_podcasts?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      curated_channels: {
        Row: {
          category: string
          channel_id: string
          channel_name: string
          created_at: string
          description: string | null
          has_jp_subs: boolean
          id: string
          recommended_jlpt: string | null
        }
        Insert: {
          category: string
          channel_id: string
          channel_name: string
          created_at?: string
          description?: string | null
          has_jp_subs?: boolean
          id?: string
          recommended_jlpt?: string | null
        }
        Update: {
          category?: string
          channel_id?: string
          channel_name?: string
          created_at?: string
          description?: string | null
          has_jp_subs?: boolean
          id?: string
          recommended_jlpt?: string | null
        }
        Relationships: []
      }
      curated_podcasts: {
        Row: {
          category: string
          created_at: string
          description: string | null
          has_transcript: boolean
          id: string
          podcast_name: string
          recommended_jlpt: string | null
          rss_url: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          has_transcript?: boolean
          id?: string
          podcast_name: string
          recommended_jlpt?: string | null
          rss_url: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          has_transcript?: boolean
          id?: string
          podcast_name?: string
          recommended_jlpt?: string | null
          rss_url?: string
        }
        Relationships: []
      }
      decks: {
        Row: {
          ai_auto_fill_attempts: number
          ai_auto_fill_completed: boolean
          ai_auto_fill_last_error: string | null
          created_at: string
          deck_date: string
          id: string
          raw_input: string | null
          source_type: string
          title: string
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_auto_fill_attempts?: number
          ai_auto_fill_completed?: boolean
          ai_auto_fill_last_error?: string | null
          created_at?: string
          deck_date?: string
          id?: string
          raw_input?: string | null
          source_type: string
          title: string
          topic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_auto_fill_attempts?: number
          ai_auto_fill_completed?: boolean
          ai_auto_fill_last_error?: string | null
          created_at?: string
          deck_date?: string
          id?: string
          raw_input?: string | null
          source_type?: string
          title?: string
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      example_sentences: {
        Row: {
          created_at: string
          deck_id: string | null
          id: string
          japanese_sentence: string
          kana_sentence: string | null
          meaning_en: string | null
          meaning_zh: string | null
          romaji_sentence: string | null
          sentence_type: string | null
          user_id: string
          vocab_id: string | null
        }
        Insert: {
          created_at?: string
          deck_id?: string | null
          id?: string
          japanese_sentence: string
          kana_sentence?: string | null
          meaning_en?: string | null
          meaning_zh?: string | null
          romaji_sentence?: string | null
          sentence_type?: string | null
          user_id: string
          vocab_id?: string | null
        }
        Update: {
          created_at?: string
          deck_id?: string | null
          id?: string
          japanese_sentence?: string
          kana_sentence?: string | null
          meaning_en?: string | null
          meaning_zh?: string | null
          romaji_sentence?: string | null
          sentence_type?: string | null
          user_id?: string
          vocab_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "example_sentences_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "example_sentences_vocab_id_fkey"
            columns: ["vocab_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_items"
            referencedColumns: ["id"]
          },
        ]
      }
      false_friends_reference: {
        Row: {
          chinese_meaning: string
          created_at: string
          example_ja: string | null
          id: string
          japanese_meaning: string
          kanji: string
          severity: string
        }
        Insert: {
          chinese_meaning: string
          created_at?: string
          example_ja?: string | null
          id?: string
          japanese_meaning: string
          kanji: string
          severity?: string
        }
        Update: {
          chinese_meaning?: string
          created_at?: string
          example_ja?: string | null
          id?: string
          japanese_meaning?: string
          kanji?: string
          severity?: string
        }
        Relationships: []
      }
      generated_images: {
        Row: {
          created_at: string
          deck_id: string | null
          id: string
          image_type: string | null
          image_url: string | null
          model: string | null
          prompt: string | null
          storage_path: string | null
          user_id: string
          vocab_id: string | null
        }
        Insert: {
          created_at?: string
          deck_id?: string | null
          id?: string
          image_type?: string | null
          image_url?: string | null
          model?: string | null
          prompt?: string | null
          storage_path?: string | null
          user_id: string
          vocab_id?: string | null
        }
        Update: {
          created_at?: string
          deck_id?: string | null
          id?: string
          image_type?: string | null
          image_url?: string | null
          model?: string | null
          prompt?: string | null
          storage_path?: string | null
          user_id?: string
          vocab_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_images_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_images_vocab_id_fkey"
            columns: ["vocab_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_items"
            referencedColumns: ["id"]
          },
        ]
      }
      grammar_points: {
        Row: {
          active_stage: number
          common_mistake: string | null
          construction: string | null
          core_meaning: string | null
          created_at: string
          difficulty: number | null
          examples: Json
          fsrs_state: Json | null
          id: string
          jlpt_level: string | null
          mnemonic: string | null
          next_review_at: string | null
          pattern: string
          similar_patterns: string[]
          source_reference: string | null
          source_type: string | null
          stability: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_stage?: number
          common_mistake?: string | null
          construction?: string | null
          core_meaning?: string | null
          created_at?: string
          difficulty?: number | null
          examples?: Json
          fsrs_state?: Json | null
          id?: string
          jlpt_level?: string | null
          mnemonic?: string | null
          next_review_at?: string | null
          pattern: string
          similar_patterns?: string[]
          source_reference?: string | null
          source_type?: string | null
          stability?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_stage?: number
          common_mistake?: string | null
          construction?: string | null
          core_meaning?: string | null
          created_at?: string
          difficulty?: number | null
          examples?: Json
          fsrs_state?: Json | null
          id?: string
          jlpt_level?: string | null
          mnemonic?: string | null
          next_review_at?: string | null
          pattern?: string
          similar_patterns?: string[]
          source_reference?: string | null
          source_type?: string | null
          stability?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          ai_corrections: Json | null
          ai_natural_version: string | null
          content_ja: string
          created_at: string
          entry_date: string
          id: string
          notice_gap_learnings: string[]
          sentence_count: number | null
          updated_at: string
          user_id: string
          word_count: number | null
        }
        Insert: {
          ai_corrections?: Json | null
          ai_natural_version?: string | null
          content_ja: string
          created_at?: string
          entry_date: string
          id?: string
          notice_gap_learnings?: string[]
          sentence_count?: number | null
          updated_at?: string
          user_id: string
          word_count?: number | null
        }
        Update: {
          ai_corrections?: Json | null
          ai_natural_version?: string | null
          content_ja?: string
          created_at?: string
          entry_date?: string
          id?: string
          notice_gap_learnings?: string[]
          sentence_count?: number | null
          updated_at?: string
          user_id?: string
          word_count?: number | null
        }
        Relationships: []
      }
      mined_sentences: {
        Row: {
          cloze_target: string | null
          difficulty_jlpt: string | null
          id: string
          kana_reading: string | null
          key_grammar: string[]
          key_vocab: string[]
          mined_at: string
          sentence_ja: string
          source_title: string | null
          source_type: string | null
          source_url: string | null
          translation_zh: string | null
          user_id: string
          vocab_id: string | null
        }
        Insert: {
          cloze_target?: string | null
          difficulty_jlpt?: string | null
          id?: string
          kana_reading?: string | null
          key_grammar?: string[]
          key_vocab?: string[]
          mined_at?: string
          sentence_ja: string
          source_title?: string | null
          source_type?: string | null
          source_url?: string | null
          translation_zh?: string | null
          user_id: string
          vocab_id?: string | null
        }
        Update: {
          cloze_target?: string | null
          difficulty_jlpt?: string | null
          id?: string
          kana_reading?: string | null
          key_grammar?: string[]
          key_vocab?: string[]
          mined_at?: string
          sentence_ja?: string
          source_title?: string | null
          source_type?: string | null
          source_url?: string | null
          translation_zh?: string | null
          user_id?: string
          vocab_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mined_sentences_vocab_id_fkey"
            columns: ["vocab_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_items"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_audits: {
        Row: {
          biggest_bottleneck: string | null
          biggest_progress: string | null
          created_at: string
          cumulative_vocab_count: number | null
          id: string
          jlpt_mock_scores: Json | null
          journal_avg_sentences: number | null
          month_start: string
          next_month_focus: string | null
          os_boot_rate: number | null
          planning_rating: number | null
          self_assessment: Json | null
          talk_me_naturalness: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          biggest_bottleneck?: string | null
          biggest_progress?: string | null
          created_at?: string
          cumulative_vocab_count?: number | null
          id?: string
          jlpt_mock_scores?: Json | null
          journal_avg_sentences?: number | null
          month_start: string
          next_month_focus?: string | null
          os_boot_rate?: number | null
          planning_rating?: number | null
          self_assessment?: Json | null
          talk_me_naturalness?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          biggest_bottleneck?: string | null
          biggest_progress?: string | null
          created_at?: string
          cumulative_vocab_count?: number | null
          id?: string
          jlpt_mock_scores?: Json | null
          journal_avg_sentences?: number | null
          month_start?: string
          next_month_focus?: string | null
          os_boot_rate?: number | null
          planning_rating?: number | null
          self_assessment?: Json | null
          talk_me_naturalness?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notebook_entries: {
        Row: {
          ai_metadata: Json | null
          ai_suggested_folder_id: string | null
          content: string | null
          created_at: string
          folder_id: string | null
          id: string
          is_favorite: boolean
          japanese: string | null
          kind: string
          meaning_en: string | null
          meaning_zh: string | null
          reading: string | null
          source_vocab_id: string | null
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_metadata?: Json | null
          ai_suggested_folder_id?: string | null
          content?: string | null
          created_at?: string
          folder_id?: string | null
          id?: string
          is_favorite?: boolean
          japanese?: string | null
          kind?: string
          meaning_en?: string | null
          meaning_zh?: string | null
          reading?: string | null
          source_vocab_id?: string | null
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_metadata?: Json | null
          ai_suggested_folder_id?: string | null
          content?: string | null
          created_at?: string
          folder_id?: string | null
          id?: string
          is_favorite?: boolean
          japanese?: string | null
          kind?: string
          meaning_en?: string | null
          meaning_zh?: string | null
          reading?: string | null
          source_vocab_id?: string | null
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notebook_entries_ai_suggested_folder_id_fkey"
            columns: ["ai_suggested_folder_id"]
            isOneToOne: false
            referencedRelation: "notebook_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notebook_entries_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "notebook_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notebook_entries_source_vocab_id_fkey"
            columns: ["source_vocab_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_items"
            referencedColumns: ["id"]
          },
        ]
      }
      notebook_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notebook_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "notebook_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      ocr_imports: {
        Row: {
          confirmed: boolean
          created_at: string
          deck_id: string | null
          extracted_json: Json | null
          id: string
          image_storage_path: string | null
          raw_gemini_response: Json | null
          user_id: string
        }
        Insert: {
          confirmed?: boolean
          created_at?: string
          deck_id?: string | null
          extracted_json?: Json | null
          id?: string
          image_storage_path?: string | null
          raw_gemini_response?: Json | null
          user_id: string
        }
        Update: {
          confirmed?: boolean
          created_at?: string
          deck_id?: string | null
          extracted_json?: Json | null
          id?: string
          image_storage_path?: string | null
          raw_gemini_response?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocr_imports_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      os_boot_logs: {
        Row: {
          anki_due_completed: number
          anki_due_total: number
          boot_date: string
          boot_layer_done: boolean
          created_at: string
          debug_layer_done: boolean
          id: string
          input_layer_done: boolean
          journal_sentences: number
          mode: string
          new_cards_added: number
          output_layer_done: boolean
          review_layer_done: boolean
          talk_me_minutes: number
          total_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          anki_due_completed?: number
          anki_due_total?: number
          boot_date: string
          boot_layer_done?: boolean
          created_at?: string
          debug_layer_done?: boolean
          id?: string
          input_layer_done?: boolean
          journal_sentences?: number
          mode: string
          new_cards_added?: number
          output_layer_done?: boolean
          review_layer_done?: boolean
          talk_me_minutes?: number
          total_minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          anki_due_completed?: number
          anki_due_total?: number
          boot_date?: string
          boot_layer_done?: boolean
          created_at?: string
          debug_layer_done?: boolean
          id?: string
          input_layer_done?: boolean
          journal_sentences?: number
          mode?: string
          new_cards_added?: number
          output_layer_done?: boolean
          review_layer_done?: boolean
          talk_me_minutes?: number
          total_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          daily_word_count: number
          default_jlpt_level: string | null
          display_name: string | null
          id: string
          preferred_voice: string | null
          show_romaji: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_word_count?: number
          default_jlpt_level?: string | null
          display_name?: string | null
          id: string
          preferred_voice?: string | null
          show_romaji?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_word_count?: number
          default_jlpt_level?: string | null
          display_name?: string | null
          id?: string
          preferred_voice?: string | null
          show_romaji?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          correct_answer: string | null
          created_at: string
          deck_id: string | null
          explanation: string | null
          id: string
          is_correct: boolean | null
          prompt: string | null
          quiz_type: string
          user_answer: string | null
          user_id: string
          vocab_id: string | null
        }
        Insert: {
          correct_answer?: string | null
          created_at?: string
          deck_id?: string | null
          explanation?: string | null
          id?: string
          is_correct?: boolean | null
          prompt?: string | null
          quiz_type: string
          user_answer?: string | null
          user_id: string
          vocab_id?: string | null
        }
        Update: {
          correct_answer?: string | null
          created_at?: string
          deck_id?: string | null
          explanation?: string | null
          id?: string
          is_correct?: boolean | null
          prompt?: string | null
          quiz_type?: string
          user_answer?: string | null
          user_id?: string
          vocab_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_vocab_id_fkey"
            columns: ["vocab_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_items"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          confidence_level: number | null
          correct_count: number
          created_at: string
          deck_id: string | null
          difficulty: number | null
          ease_score: number | null
          fsrs_state: Json | null
          id: string
          incorrect_count: number
          is_leech: boolean
          lapses: number
          next_review_at: string | null
          next_review_date: string | null
          review_count: number
          review_date: string | null
          stability: number | null
          status: string | null
          updated_at: string
          user_id: string
          vocab_id: string
        }
        Insert: {
          confidence_level?: number | null
          correct_count?: number
          created_at?: string
          deck_id?: string | null
          difficulty?: number | null
          ease_score?: number | null
          fsrs_state?: Json | null
          id?: string
          incorrect_count?: number
          is_leech?: boolean
          lapses?: number
          next_review_at?: string | null
          next_review_date?: string | null
          review_count?: number
          review_date?: string | null
          stability?: number | null
          status?: string | null
          updated_at?: string
          user_id: string
          vocab_id: string
        }
        Update: {
          confidence_level?: number | null
          correct_count?: number
          created_at?: string
          deck_id?: string | null
          difficulty?: number | null
          ease_score?: number | null
          fsrs_state?: Json | null
          id?: string
          incorrect_count?: number
          is_leech?: boolean
          lapses?: number
          next_review_at?: string | null
          next_review_date?: string | null
          review_count?: number
          review_date?: string | null
          stability?: number | null
          status?: string | null
          updated_at?: string
          user_id?: string
          vocab_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_vocab_id_fkey"
            columns: ["vocab_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_items"
            referencedColumns: ["id"]
          },
        ]
      }
      self_talk_progressions: {
        Row: {
          context: string | null
          created_at: string
          id: string
          log_date: string
          sample_phrase: string | null
          stage_level: number
          user_id: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          id?: string
          log_date?: string
          sample_phrase?: string | null
          stage_level: number
          user_id: string
        }
        Update: {
          context?: string | null
          created_at?: string
          id?: string
          log_date?: string
          sample_phrase?: string | null
          stage_level?: number
          user_id?: string
        }
        Relationships: []
      }
      talk_me_sessions: {
        Row: {
          artifact_saved: boolean
          conversation_mode_done: boolean
          created_at: string
          duration_minutes: number | null
          id: string
          lessons_completed: string[]
          most_useful_sentence: string | null
          session_date: string
          shadowing_done: boolean
          user_id: string
        }
        Insert: {
          artifact_saved?: boolean
          conversation_mode_done?: boolean
          created_at?: string
          duration_minutes?: number | null
          id?: string
          lessons_completed?: string[]
          most_useful_sentence?: string | null
          session_date?: string
          shadowing_done?: boolean
          user_id: string
        }
        Update: {
          artifact_saved?: boolean
          conversation_mode_done?: boolean
          created_at?: string
          duration_minutes?: number | null
          id?: string
          lessons_completed?: string[]
          most_useful_sentence?: string | null
          session_date?: string
          shadowing_done?: boolean
          user_id?: string
        }
        Relationships: []
      }
      tts_audio_cache: {
        Row: {
          access_count: number
          audio_url: string | null
          created_at: string
          id: string
          language_code: string
          last_accessed_at: string
          normalized_text: string
          provider: string
          storage_path: string
          text: string
          text_hash: string
          user_id: string | null
          voice_id: string
        }
        Insert: {
          access_count?: number
          audio_url?: string | null
          created_at?: string
          id?: string
          language_code?: string
          last_accessed_at?: string
          normalized_text: string
          provider?: string
          storage_path: string
          text: string
          text_hash: string
          user_id?: string | null
          voice_id: string
        }
        Update: {
          access_count?: number
          audio_url?: string | null
          created_at?: string
          id?: string
          language_code?: string
          last_accessed_at?: string
          normalized_text?: string
          provider?: string
          storage_path?: string
          text?: string
          text_hash?: string
          user_id?: string | null
          voice_id?: string
        }
        Relationships: []
      }
      user_os_settings: {
        Row: {
          created_at: string
          current_phase: number
          daily_mode: string
          phase_started_at: string
          talk_me_integration_enabled: boolean
          target_date: string | null
          target_jlpt: string
          trilingual_leverage_enabled: boolean
          updated_at: string
          user_id: string
          weekly_new_grammar_quota: number
          weekly_new_vocab_quota: number
        }
        Insert: {
          created_at?: string
          current_phase?: number
          daily_mode?: string
          phase_started_at?: string
          talk_me_integration_enabled?: boolean
          target_date?: string | null
          target_jlpt?: string
          trilingual_leverage_enabled?: boolean
          updated_at?: string
          user_id: string
          weekly_new_grammar_quota?: number
          weekly_new_vocab_quota?: number
        }
        Update: {
          created_at?: string
          current_phase?: number
          daily_mode?: string
          phase_started_at?: string
          talk_me_integration_enabled?: boolean
          target_date?: string | null
          target_jlpt?: string
          trilingual_leverage_enabled?: boolean
          updated_at?: string
          user_id?: string
          weekly_new_grammar_quota?: number
          weekly_new_vocab_quota?: number
        }
        Relationships: []
      }
      verb_forms: {
        Row: {
          causative_form: string | null
          causative_passive_form: string | null
          conditional_form: string | null
          created_at: string
          dictionary_form: string | null
          id: string
          imperative_form: string | null
          masu_form: string | null
          nai_form: string | null
          particle_pattern: string | null
          passive_form: string | null
          potential_form: string | null
          ta_form: string | null
          te_form: string | null
          transitivity: string | null
          vocab_id: string
          volitional_form: string | null
        }
        Insert: {
          causative_form?: string | null
          causative_passive_form?: string | null
          conditional_form?: string | null
          created_at?: string
          dictionary_form?: string | null
          id?: string
          imperative_form?: string | null
          masu_form?: string | null
          nai_form?: string | null
          particle_pattern?: string | null
          passive_form?: string | null
          potential_form?: string | null
          ta_form?: string | null
          te_form?: string | null
          transitivity?: string | null
          vocab_id: string
          volitional_form?: string | null
        }
        Update: {
          causative_form?: string | null
          causative_passive_form?: string | null
          conditional_form?: string | null
          created_at?: string
          dictionary_form?: string | null
          id?: string
          imperative_form?: string | null
          masu_form?: string | null
          nai_form?: string | null
          particle_pattern?: string | null
          passive_form?: string | null
          potential_form?: string | null
          ta_form?: string | null
          te_form?: string | null
          transitivity?: string | null
          vocab_id?: string
          volitional_form?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verb_forms_vocab_id_fkey"
            columns: ["vocab_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_items"
            referencedColumns: ["id"]
          },
        ]
      }
      vocabulary_items: {
        Row: {
          active_stage: number
          cantonese_reading: string | null
          common_mistake: string | null
          core_explanation: string | null
          created_at: string
          deck_id: string
          false_friend_warning: string | null
          has_kanji: boolean
          id: string
          is_false_friend: boolean
          japanese: string
          jlpt_level: string | null
          kana: string | null
          kanji: string | null
          meaning_en: string | null
          meaning_zh: string | null
          notes: string | null
          part_of_speech: string | null
          pitch_accent: string | null
          priority_tier: number | null
          register_label: string | null
          romaji: string | null
          source_reference: string | null
          source_type: string | null
          trilingual_mnemonic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_stage?: number
          cantonese_reading?: string | null
          common_mistake?: string | null
          core_explanation?: string | null
          created_at?: string
          deck_id: string
          false_friend_warning?: string | null
          has_kanji?: boolean
          id?: string
          is_false_friend?: boolean
          japanese: string
          jlpt_level?: string | null
          kana?: string | null
          kanji?: string | null
          meaning_en?: string | null
          meaning_zh?: string | null
          notes?: string | null
          part_of_speech?: string | null
          pitch_accent?: string | null
          priority_tier?: number | null
          register_label?: string | null
          romaji?: string | null
          source_reference?: string | null
          source_type?: string | null
          trilingual_mnemonic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_stage?: number
          cantonese_reading?: string | null
          common_mistake?: string | null
          core_explanation?: string | null
          created_at?: string
          deck_id?: string
          false_friend_warning?: string | null
          has_kanji?: boolean
          id?: string
          is_false_friend?: boolean
          japanese?: string
          jlpt_level?: string | null
          kana?: string | null
          kanji?: string | null
          meaning_en?: string | null
          meaning_zh?: string | null
          notes?: string | null
          part_of_speech?: string | null
          pitch_accent?: string | null
          priority_tier?: number | null
          register_label?: string | null
          romaji?: string | null
          source_reference?: string | null
          source_type?: string | null
          trilingual_mnemonic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocabulary_items_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      vocabulary_relationships: {
        Row: {
          created_at: string
          example_sentence: string | null
          explanation: string | null
          id: string
          relationship_type: string
          source_vocab_id: string
          target_vocab_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          example_sentence?: string | null
          explanation?: string | null
          id?: string
          relationship_type: string
          source_vocab_id: string
          target_vocab_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          example_sentence?: string | null
          explanation?: string | null
          id?: string
          relationship_type?: string
          source_vocab_id?: string
          target_vocab_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocabulary_relationships_source_vocab_id_fkey"
            columns: ["source_vocab_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vocabulary_relationships_target_vocab_id_fkey"
            columns: ["target_vocab_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_items"
            referencedColumns: ["id"]
          },
        ]
      }
      vocabulary_sessions: {
        Row: {
          created_at: string
          deck_id: string
          extracted_vocabulary: Json
          id: string
          planning_raw: Json | null
          source_input: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deck_id: string
          extracted_vocabulary?: Json
          id?: string
          planning_raw?: Json | null
          source_input?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deck_id?: string
          extracted_vocabulary?: Json
          id?: string
          planning_raw?: Json | null
          source_input?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocabulary_sessions_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      vocabulary_storyline_groups: {
        Row: {
          created_at: string
          error_message: string | null
          generation_status: string
          group_index: number
          id: string
          image_prompt: string
          image_url: string | null
          model: string | null
          session_id: string
          storage_path: string | null
          storyline_japanese: string
          storyline_traditional_chinese: string
          title_traditional_chinese: string
          updated_at: string
          words: Json
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          generation_status?: string
          group_index: number
          id?: string
          image_prompt: string
          image_url?: string | null
          model?: string | null
          session_id: string
          storage_path?: string | null
          storyline_japanese: string
          storyline_traditional_chinese: string
          title_traditional_chinese: string
          updated_at?: string
          words?: Json
        }
        Update: {
          created_at?: string
          error_message?: string | null
          generation_status?: string
          group_index?: number
          id?: string
          image_prompt?: string
          image_url?: string | null
          model?: string | null
          session_id?: string
          storage_path?: string | null
          storyline_japanese?: string
          storyline_traditional_chinese?: string
          title_traditional_chinese?: string
          updated_at?: string
          words?: Json
        }
        Relationships: [
          {
            foreignKeyName: "vocabulary_storyline_groups_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "vocabulary_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_reviews: {
        Row: {
          ai_generated_quiz: Json | null
          anki_completion_rate: number | null
          boot_days: number
          created_at: string
          id: string
          leech_vocab_ids: string[]
          most_useful_grammar: string[]
          most_useful_vocab: string[]
          new_grammar_added: number
          new_vocab_added: number
          next_week_focus: string | null
          talk_me_days: number
          updated_at: string
          user_id: string
          user_reflection: string | null
          week_start_date: string
        }
        Insert: {
          ai_generated_quiz?: Json | null
          anki_completion_rate?: number | null
          boot_days?: number
          created_at?: string
          id?: string
          leech_vocab_ids?: string[]
          most_useful_grammar?: string[]
          most_useful_vocab?: string[]
          new_grammar_added?: number
          new_vocab_added?: number
          next_week_focus?: string | null
          talk_me_days?: number
          updated_at?: string
          user_id: string
          user_reflection?: string | null
          week_start_date: string
        }
        Update: {
          ai_generated_quiz?: Json | null
          anki_completion_rate?: number | null
          boot_days?: number
          created_at?: string
          id?: string
          leech_vocab_ids?: string[]
          most_useful_grammar?: string[]
          most_useful_vocab?: string[]
          new_grammar_added?: number
          new_vocab_added?: number
          next_week_focus?: string | null
          talk_me_days?: number
          updated_at?: string
          user_id?: string
          user_reflection?: string | null
          week_start_date?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
