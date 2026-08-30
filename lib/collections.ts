import orderBy from 'lodash-es/orderBy';

/**
 * What lib/heavy/collections.ts wrapped from the whole of lodash. Three of the
 * four are a reduce; orderBy's stable multi-key sort is worth the cherry-pick
 * from lodash-es, which is ESM and tree-shakes to the one function.
 */
export function sumBy<T>(list: T[], key: keyof T): number {
  return list.reduce((sum, item) => sum + Number(item[key]), 0);
}

export function meanBy<T>(list: T[], key: keyof T): number {
  return list.length === 0 ? 0 : sumBy(list, key) / list.length;
}

export function sortByDesc<T>(list: T[], key: keyof T): T[] {
  return orderBy(list, [key], ['desc']);
}

export function countBy<T>(list: T[], key: keyof T): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of list) {
    const bucket = String(item[key]);
    counts[bucket] = (counts[bucket] ?? 0) + 1;
  }
  return counts;
}
