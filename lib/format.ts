/**
 * Formatting that used to go through moment. The catalogue shows dates as
 * "5 Nov 2024" and durations as moment's humanize() did ("3 hours", "a day",
 * "2 days"); both are a few lines, and neither needs a date library.
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getDate())} ${MONTHS[date.getMonth()] ?? ''} ${String(date.getFullYear())}`;
}

/** Same thresholds moment.duration(...).humanize() uses for the 2–40 hour range. */
export function humanizeHours(hours: number): string {
  if (hours < 2) return 'an hour';
  if (hours < 22) return `${String(hours)} hours`;
  const days = Math.round(hours / 24);
  return days <= 1 ? 'a day' : `${String(days)} days`;
}

const currency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
const integer = new Intl.NumberFormat('en-GB');

export const formatPrice = (cents: number): string => currency.format(cents / 100);
export const formatInteger = (value: number): string => integer.format(value);
