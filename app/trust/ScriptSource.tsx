'use client';

import { useState } from 'react';

// Shows the verify script's source inline — fetched from the same public URL
// a verifier downloads, so what you read is byte-for-byte what you'd run.
export default function ScriptSource() {
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const load = async () => {
    if (source !== null) {
      return;
    }

    try {
      const response = await fetch('/verify-ledger.mjs', { cache: 'no-store' });

      if (!response.ok) {
        throw new Error(String(response.status));
      }

      setSource(await response.text());
    } catch {
      setError(true);
    }
  };

  return (
    <details className="trust-verify-source" onToggle={load}>
      <summary>Read the script before you run it</summary>
      {source !== null ? (
        <pre>
          <code>{source}</code>
        </pre>
      ) : error ? (
        <p className="trust-verify-fail">Source could not be loaded — open /verify-ledger.mjs directly.</p>
      ) : (
        <p className="trust-verify-loading">Loading the served file…</p>
      )}
    </details>
  );
}
