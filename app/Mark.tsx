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
      <path d="M77,50 L54.62,48.09 L59.19,40.81 L51.91,45.38 L50,4 L48.09,45.38 L40.81,40.81 L45.38,48.09 L23,50 L45.38,51.91 L40.81,59.19 L48.09,54.62 L50,96 L51.91,54.62 L59.19,59.19 L54.62,51.91 Z" />
    </svg>
  );
}
