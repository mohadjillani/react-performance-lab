export function StarRating({ rating, count }: { rating: number; count: number }) {
  if (count === 0) {
    return <span className="muted">No reviews yet</span>;
  }
  return (
    <span
      className="rating"
      aria-label={`${rating.toFixed(1)} out of 5 from ${String(count)} reviews`}
    >
      <span aria-hidden="true">{'★'}</span> {rating.toFixed(1)}{' '}
      <span className="muted">({count})</span>
    </span>
  );
}
