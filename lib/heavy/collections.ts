import _ from 'lodash';

export function sumBy<T>(list: T[], key: keyof T): number {
  return _.sumBy(list, key as string);
}

export function meanBy<T>(list: T[], key: keyof T): number {
  return list.length === 0 ? 0 : _.meanBy(list, key as string);
}

export function sortByDesc<T>(list: T[], key: keyof T): T[] {
  return _.orderBy(list, [key as string], ['desc']);
}

export function countBy<T>(list: T[], key: keyof T): Record<string, number> {
  return _.countBy(list, key as string);
}
