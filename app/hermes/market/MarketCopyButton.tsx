'use client';

import { useState } from 'react';

export default function MarketCopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="hm-copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        } catch {
          // Clipboard blocked — silent; user can still select the pre.
        }
      }}
    >
      {copied ? 'Copied' : label}
    </button>
  );
}
