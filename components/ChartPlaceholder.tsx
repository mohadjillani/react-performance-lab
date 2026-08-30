/**
 * Reserves the chart's box while its chunk loads. Same class and therefore the
 * same height as the real chart, so deferring the library costs no layout shift.
 */
export function ChartPlaceholder({ small = false }: { small?: boolean }) {
  return (
    <div className={small ? 'chart chart-small' : 'chart'} aria-busy="true">
      <span className="muted">Loading chart…</span>
    </div>
  );
}
