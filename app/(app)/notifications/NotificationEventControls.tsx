"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { recordNotificationOutcomeAction } from "@/lib/actions/notifications";

export function NotificationEventControls({
  eventId,
  deepLink,
  opened,
  completedAfterOpen,
  compact = false,
}: {
  eventId?: string | null;
  deepLink: string;
  opened?: boolean;
  completedAfterOpen?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function openReminder() {
    startTransition(async () => {
      if (eventId && !opened) {
        await recordNotificationOutcomeAction({
          eventId,
          outcomeType: "opened",
          deepLink,
          metadata: { source: "notifications_page" },
        });
      }
      router.push(deepLink);
    });
  }

  function completeReminder() {
    if (!eventId || completedAfterOpen) return;
    startTransition(async () => {
      await recordNotificationOutcomeAction({
        eventId,
        outcomeType: "completed_after_open",
        deepLink,
        metadata: { source: "notifications_page" },
      });
    });
  }

  return (
    <div className={compact ? "flex flex-wrap gap-2" : "flex flex-wrap items-center justify-end gap-2"}>
      <button type="button" onClick={openReminder} disabled={pending} className="btn-ghost justify-center px-3 py-2 text-xs disabled:opacity-60">
        打開
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {eventId ? (
        <button
          type="button"
          onClick={completeReminder}
          disabled={pending || completedAfterOpen}
          className="btn-ghost justify-center px-3 py-2 text-xs disabled:opacity-60"
        >
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          {completedAfterOpen ? "已完成" : "標記完成"}
        </button>
      ) : null}
    </div>
  );
}
