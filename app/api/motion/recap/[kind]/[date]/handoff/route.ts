import { NextResponse } from "next/server";
import {
  fetchLearnerRecapHandoff,
  isMissingLearnerRecapSchemaError,
  type LearnerRecapKind,
} from "@/lib/motion/learnerRecapJobs";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string; date: string }> },
) {
  const { kind, date } = await params;
  if (kind !== "daily" && kind !== "weekly") {
    return NextResponse.json({ error: "Invalid recap kind" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid recap date" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { recap, renderJob, error } = await fetchLearnerRecapHandoff({
    supabase,
    userId: session.user.id,
    kind: kind as LearnerRecapKind,
    dateKey: date,
  });

  if (error) {
    return NextResponse.json(
      {
        error: isMissingLearnerRecapSchemaError(error)
          ? "Recap motion tables are not ready."
          : error.message,
      },
      { status: isMissingLearnerRecapSchemaError(error) ? 503 : 500 },
    );
  }

  if (!recap) {
    return NextResponse.json({ error: "Recap not found" }, { status: 404 });
  }

  return NextResponse.json({
    recap: {
      id: recap.id,
      kind: recap.kind,
      status: recap.status,
      title: recap.title,
      date_label: recap.dateLabel,
      render_requested_at: recap.renderRequestedAt,
      updated_at: recap.updatedAt,
      outputs: recap.outputs,
    },
    render_job: renderJob,
    payload: recap.payload,
    manifest: recap.manifest,
    handoff: {
      remotion: recap.outputs.remotion,
      hyperframes: recap.outputs.hyperframes,
    },
  });
}
