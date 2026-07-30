'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const LEDGER_PATH = '/observatory/hermes/ledger';
const SHARE_TITLE = 'Hermes Decision Ledger — Solace';
const SHARE_TEXT =
  'Public sealed record of Hermes decisions before outcomes are known. Founder capital · checkable chain.';

export default function ShareLedger() {
  const [origin, setOrigin] = useState('https://solace.fyi');
  const [copied, setCopied] = useState<'link' | 'image' | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
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
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: SHARE_TITLE,
          text: SHARE_TEXT,
          url: pageUrl,
        });
        return;
      } catch {
        // cancelled
      }
    }

    await copy(pageUrl, 'link');
  }, [copy, pageUrl]);

  return (
    <div className="trust-share">
      <p className="trust-share-kicker">Share</p>
      <p className="trust-share-dek">
        Social posts open a card image of the public process metrics and link back to this ledger.
      </p>
      <div className="trust-share-actions">
        <a href={xIntent} target="_blank" rel="noreferrer" className="trust-share-btn">
          Share on X
        </a>
        <a href={linkedInIntent} target="_blank" rel="noreferrer" className="trust-share-btn">
          Share on LinkedIn
        </a>
        <button type="button" className="trust-share-btn" onClick={shareNative}>
          {copied === 'link' ? 'Link copied' : 'Share / copy link'}
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
