'use client';

import { useCallback, useEffect, useState } from 'react';

type Props = {
  question: string;
  probability: number;
  id: string;
};

/**
 * Share one Oracle belief. On phones, opens the system share sheet when
 * available; otherwise copies a short citation to the clipboard.
 */
export default function ShareBelief({ question, probability, id }: Props) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('https://solace.fyi');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const pct = Math.round(probability * 100);
  const pageUrl = `${origin}/oracle#${id}`;
  const text = `Oracle believes ${pct}%: ${question}`;

  const share = useCallback(async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'Oracle · Solace',
          text,
          url: pageUrl,
        });
        return;
      } catch {
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(`${text}\n${pageUrl}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [pageUrl, text]);

  return (
    <button type="button" className="oracle-share-belief" onClick={share}>
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
      {copied ? 'Copied' : 'Share this belief'}
    </button>
  );
}
