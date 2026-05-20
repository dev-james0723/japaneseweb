/**
 * Run async work over `items` with at most `limit` concurrent executions.
 * Preserves result order (same index as `items`).
 */
export async function mapConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Math.max(1, Math.min(limit, items.length));

  const worker = async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) break;
      results[i] = await fn(items[i]!, i);
    }
  };

  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}
