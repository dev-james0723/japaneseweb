import type { SupabaseClient } from "@supabase/supabase-js";

export type AiFeedbackReportType =
  | "wrong_japanese"
  | "wrong_translation"
  | "wrong_explanation"
  | "bad_source_claim"
  | "unsafe_or_sensitive"
  | "copyright_or_policy"
  | "other";

export type AiFeedbackSummary = {
  available: boolean;
  days: number;
  total: number;
  open: number;
  highSeverity: number;
  latestAt: string | null;
  buckets: AiFeedbackBucket[];
  error?: string;
};

export type AiFeedbackBucket = {
  reportType: AiFeedbackReportType;
  label: string;
  total: number;
  open: number;
  highSeverity: number;
  latestAt: string | null;
};

type AiFeedbackRow = {
  report_type: AiFeedbackReportType;
  severity: "low" | "medium" | "high";
  status: "open" | "reviewed" | "resolved" | "dismissed";
  created_at: string;
};

const REPORT_LABELS: Record<AiFeedbackReportType, string> = {
  wrong_japanese: "Japanese",
  wrong_translation: "Translation",
  wrong_explanation: "Explanation",
  bad_source_claim: "Source claim",
  unsafe_or_sensitive: "Safety",
  copyright_or_policy: "Policy",
  other: "Other",
};

export async function fetchAiFeedbackSummary({
  supabase,
  userId,
  days = 30,
}: {
  supabase: SupabaseClient;
  userId: string;
  days?: number;
}): Promise<AiFeedbackSummary> {
  const safeDays = Math.max(1, Math.min(180, days));
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (safeDays - 1));
  since.setUTCHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("ai_feedback_reports")
    .select("report_type, severity, status, created_at")
    .eq("user_id", userId)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return emptySummary({
      available: false,
      days: safeDays,
      error: isMissingAiFeedbackSchemaError(error) ? undefined : error.message,
    });
  }

  return buildSummary((data ?? []) as AiFeedbackRow[], safeDays);
}

function buildSummary(rows: AiFeedbackRow[], days: number): AiFeedbackSummary {
  const buckets = new Map<AiFeedbackReportType, AiFeedbackBucket>();
  for (const row of rows) {
    const bucket = buckets.get(row.report_type) ?? makeBucket(row.report_type);
    bucket.total += 1;
    bucket.open += row.status === "open" ? 1 : 0;
    bucket.highSeverity += row.severity === "high" ? 1 : 0;
    bucket.latestAt = latestIso(bucket.latestAt, row.created_at);
    buckets.set(row.report_type, bucket);
  }

  return {
    available: true,
    days,
    total: rows.length,
    open: rows.filter((row) => row.status === "open").length,
    highSeverity: rows.filter((row) => row.severity === "high").length,
    latestAt: rows[0]?.created_at ?? null,
    buckets: Array.from(buckets.values()).sort((a, b) => b.total - a.total),
  };
}

function makeBucket(reportType: AiFeedbackReportType): AiFeedbackBucket {
  return {
    reportType,
    label: REPORT_LABELS[reportType],
    total: 0,
    open: 0,
    highSeverity: 0,
    latestAt: null,
  };
}

function emptySummary({
  available,
  days,
  error,
}: {
  available: boolean;
  days: number;
  error?: string;
}): AiFeedbackSummary {
  return {
    available,
    days,
    total: 0,
    open: 0,
    highSeverity: 0,
    latestAt: null,
    buckets: [],
    error,
  };
}

function latestIso(left: string | null, right: string) {
  if (!left) return right;
  return left >= right ? left : right;
}

function isMissingAiFeedbackSchemaError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.code === "PGRST204" ||
    (message.includes("ai_feedback_reports") && (
      message.includes("does not exist") ||
      message.includes("schema cache") ||
      message.includes("could not find")
    ))
  );
}
