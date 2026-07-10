'use client';

import { useState } from 'react';

// The verify commands with a one-tap copy — the whole point of the block is
// that a stranger can run it, so getting it into their clipboard should not
// require careful triple-click selection.
export default function CopyCommands({ commands }: { commands: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(commands);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (old browser, permissions): selection fallback
      // is the pre itself; do nothing loud.
    }
  };

  return (
    <pre className="trust-verify-pre">
      <code>{commands}</code>
      <button type="button" onClick={copy} aria-label="Copy commands">
        {copied ? 'Copied ✓' : 'Copy'}
      </button>
    </pre>
  );
}
