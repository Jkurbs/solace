'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const LEDGER_PATH = '/observatory/hermes/ledger';
const SHARE_TITLE = 'Hermes Decision Ledger · Solace';
const SHARE_TEXT =
  'Public sealed record of Hermes decisions before outcomes are known. Founder capital · checkable chain.';

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3v11M8.5 6.5 12 3l3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 13v5.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V13"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Ledger share control.
 * - Phone: one button beside “Public record” opens the system share sheet (navigator.share).
 * - Desktop: full set of share actions under the title.
 */
export default function ShareLedger() {
  const [origin, setOrigin] = useState('https://solace.fyi');
  const [copied, setCopied] = useState<'link' | 'image' | null>(null);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    setCanNativeShare(typeof navigator.share === 'function');
  }, []);

  const pageUrl = useMemo(() => `${origin}${LEDGER_PATH}`, [origin]);
  const imageUrl = useMemo(() => `${origin}${LEDGER_PATH}/opengraph-image`, [origin]);

  const xIntent = useMemo(
    () => `https://x.com/intent/post?text=${encodeURIComponent(`${SHARE_TEXT}\n\n${pageUrl}`)}`,
    [pageUrl],
  );
  const linkedInIntent = useMemo(
    () => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`,
    [pageUrl],
  );

  const copy = useCallback(async (value: string, kind: 'link' | 'image') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }, []);

  const shareNative = useCallback(async () => {
    // iOS / Android system share sheet when the browser supports Web Share API.
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: SHARE_TITLE,
          text: SHARE_TEXT,
          url: pageUrl,
        });
        return;
      } catch {
        // User dismissed the sheet.
        return;
      }
    }

    await copy(pageUrl, 'link');
  }, [copy, pageUrl]);

  return (
    <div className="ledger-share">
      <button
        type="button"
        className="ledger-share-trigger"
        onClick={shareNative}
        aria-label={canNativeShare ? 'Share this ledger' : 'Copy ledger link'}
        title={canNativeShare ? 'Share' : 'Copy link'}
      >
        <ShareIcon />
        <span className="ledger-share-trigger-label">
          {copied === 'link' ? 'Copied' : 'Share'}
        </span>
      </button>

      <div className="ledger-share-desktop" aria-label="Share this ledger">
        <a href={xIntent} target="_blank" rel="noreferrer" className="trust-share-btn">
          Share on X
        </a>
        <a href={linkedInIntent} target="_blank" rel="noreferrer" className="trust-share-btn">
          Share on LinkedIn
        </a>
        <button type="button" className="trust-share-btn" onClick={shareNative}>
          {copied === 'link' ? 'Link copied' : canNativeShare ? 'System share' : 'Copy link'}
        </button>
        <button
          type="button"
          className="trust-share-btn trust-share-btn-secondary"
          onClick={() => copy(imageUrl, 'image')}
        >
          {copied === 'image' ? 'Image URL copied' : 'Copy card image URL'}
        </button>
        <a href={imageUrl} target="_blank" rel="noreferrer" className="trust-share-btn trust-share-btn-secondary">
          Preview card image
        </a>
      </div>
    </div>
  );
}
