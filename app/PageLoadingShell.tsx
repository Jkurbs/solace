import Mark from '@/app/Mark';

type PageLoadingShellProps = {
  label?: string;
};

/** Instant route feedback while the next page's RSC payload is still in flight. */
export default function PageLoadingShell({ label = 'Loading' }: PageLoadingShellProps) {
  return (
    <div className="page-loading-shell" role="status" aria-live="polite" aria-busy="true">
      <div className="page-loading-bar" aria-hidden="true" />
      <div className="page-loading-inner">
        <div className="page-loading-brand">
          <Mark size={20} />
          <span>Solace</span>
        </div>
        <p className="page-loading-label">{label}</p>
        <div className="page-loading-skeleton" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
