// The Solace mark: an eight-point compass-star with an elongated vertical
// axis — a north star for navigating uncertainty. Pure vector so it stays
// crisp at any size and works in one flat color (inherits currentColor).
export default function Mark({
  size = 22,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M77,50 L53.51,48.55 L59.19,40.81 L51.45,46.49 L50,4 L48.55,46.49 L40.81,40.81 L46.49,48.55 L23,50 L46.49,51.45 L40.81,59.19 L48.55,53.51 L50,96 L51.45,53.51 L59.19,59.19 L53.51,51.45 Z" />
    </svg>
  );
}
