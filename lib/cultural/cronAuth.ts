/** Vercel Cron and manual invocations (Bearer CRON_SECRET). */
export function authorizeCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth === `Bearer ${secret}`) return true;
  }
  // Vercel Cron also sends this header on scheduled invocations
  if (req.headers.get("x-vercel-cron") === "1") return true;
  return process.env.NODE_ENV === "development";
}
