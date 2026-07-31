'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type Props = {
  question: string;
  probability: number;
  id: string;
};

/**
 * Share one Oracle belief the Hermes ledger way: the page URL carries
 * summary_large_image OG/Twitter tags, so platforms unfurl the platter card
 * from the link (not an attached file).
 */
export default function ShareBelief({ question, probability, id }: Props) {
  const [copied, setCopied] = useState<'link' | 'image' | null>(null);
  const [origin, setOrigin] = useState('https://solace.fyi');
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    setCanNativeShare(typeof navigator.share === 'function');
  }, []);

  const pct = Math.round(probability * 100);
  const pageUrl = useMemo(
    () => `${origin}/oracle/belief/${encodeURIComponent(id)}`,
    [origin, id],
  );
  const imageUrl = useMemo(() => `${pageUrl}/opengraph-image`, [pageUrl]);
  const shareText = useMemo(
    () => `Oracle believes ${pct}%: ${question}`,
    [pct, question],
  );

  const xIntent = useMemo(
    () =>
      `https://x.com/intent/post?text=${encodeURIComponent(`${shareText}\n\n${pageUrl}`)}`,
    [pageUrl, shareText],
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
    // URL only, same as Hermes ledger. Platforms pull opengraph-image from the link.
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'Oracle · Solace',
          text: shareText,
          url: pageUrl,
        });
        return;
      } catch {
        return;
      }
    }

    await copy(pageUrl, 'link');
  }, [copy, pageUrl, shareText]);

  return (
    <div className="oracle-share-belief-wrap">
      <button type="button" className="oracle-share-belief" onClick={shareNative}>
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
        {copied === 'link' ? 'Link copied' : canNativeShare ? 'Share this belief' : 'Copy belief link'}
      </button>

      <div className="oracle-share-belief-desktop" aria-label="Share this belief">
        <a href={xIntent} target="_blank" rel="noreferrer" className="oracle-share-chip">
          Share on X
        </a>
        <a href={linkedInIntent} target="_blank" rel="noreferrer" className="oracle-share-chip">
          LinkedIn
        </a>
        <button type="button" className="oracle-share-chip" onClick={() => copy(pageUrl, 'link')}>
          {copied === 'link' ? 'Link copied' : 'Copy link'}
        </button>
        <a href={imageUrl} target="_blank" rel="noreferrer" className="oracle-share-chip is-secondary">
          Preview card
        </a>
      </div>
    </div>
  );
}
