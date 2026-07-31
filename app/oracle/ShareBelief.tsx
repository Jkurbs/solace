'use client';

import { useCallback, useEffect, useState } from 'react';

type Props = {
  question: string;
  probability: number;
  id: string;
};

/**
 * Share one Oracle belief.
 * Links to /oracle/belief/[ticker] which carries a large OG platter image so
 * X, LinkedIn, iMessage, etc. show the full card. On capable phones we also
 * attach the PNG to the system share sheet when files are supported.
 */
export default function ShareBelief({ question, probability, id }: Props) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('https://solace.fyi');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const pct = Math.round(probability * 100);
  const beliefPath = `/oracle/belief/${encodeURIComponent(id)}`;
  const pageUrl = `${origin}${beliefPath}`;
  const imageUrl = `${pageUrl}/opengraph-image`;
  const text = `Oracle believes ${pct}%: ${question}`;

  const share = useCallback(async () => {
    setBusy(true);
    try {
      // Prefer attaching the platter image when the platform supports file share.
      try {
        const res = await fetch(imageUrl, { mode: 'cors' });
        if (res.ok) {
          const blob = await res.blob();
          const file = new File([blob], 'oracle-belief.png', { type: blob.type || 'image/png' });
          const payload: ShareData = {
            title: 'Oracle · Solace',
            text,
            url: pageUrl,
            files: [file],
          };
          if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
            if (typeof navigator.canShare === 'function' && navigator.canShare(payload)) {
              await navigator.share(payload);
              return;
            }
          }
        }
      } catch {
        // Fall through to URL-only share.
      }

      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: 'Oracle · Solace',
            text,
            url: pageUrl,
          });
          return;
        } catch {
          // User cancelled or share failed.
          return;
        }
      }

      await navigator.clipboard.writeText(`${text}\n${pageUrl}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } finally {
      setBusy(false);
    }
  }, [imageUrl, pageUrl, text]);

  return (
    <button type="button" className="oracle-share-belief" onClick={share} disabled={busy}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
      {busy ? 'Preparing…' : copied ? 'Copied' : 'Share this belief'}
    </button>
  );
}
