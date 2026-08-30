import moment from 'moment';

/** Absolute dates only: relative phrasing would change between runs. */
export function formatDate(iso: string): string {
  return moment(iso).format('D MMM YYYY');
}

export function humanizeHours(hours: number): string {
  return moment.duration(hours, 'hours').humanize();
}
