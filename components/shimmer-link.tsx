'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  forwardRef,
  useEffect,
  useState,
  type ComponentProps,
  type MouseEvent,
} from 'react';

import { cn } from '@/lib/utils';

function destinationPath(href: ComponentProps<typeof Link>['href']) {
  const raw = typeof href === 'string' ? href : href.pathname ?? '';
  return raw.split('#')[0].split('?')[0] || '/';
}

function shouldIgnoreClick(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey
  );
}

export type ShimmerLinkProps = ComponentProps<typeof Link> & {
  /** Underlined / text CTAs. Default is filled or pill buttons. */
  tone?: 'fill' | 'ink';
};

/** Next/Link that gloss-shimmers while the destination is still coming. */
export const ShimmerLink = forwardRef<HTMLAnchorElement, ShimmerLinkProps>(function ShimmerLink(
  { className, tone = 'fill', onClick, href, ...props },
  ref,
) {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPending(false);
  }, [pathname]);

  useEffect(() => {
    if (!pending) return undefined;
    const timer = window.setTimeout(() => setPending(false), 8000);
    return () => window.clearTimeout(timer);
  }, [pending]);

  return (
    <Link
      ref={ref}
      href={href}
      {...props}
      className={cn(tone === 'ink' ? 'btn-shimmer-ink' : 'btn-shimmer', pending && 'is-shimmering', className)}
      aria-busy={pending || undefined}
      onClick={(event) => {
        onClick?.(event);
        if (shouldIgnoreClick(event)) return;
        if (destinationPath(href) === pathname) return;
        setPending(true);
      }}
    />
  );
});

ShimmerLink.displayName = 'ShimmerLink';
