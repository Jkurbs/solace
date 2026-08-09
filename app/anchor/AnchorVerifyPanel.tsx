'use client';

import { useState } from 'react';
import { Search, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatAnchorDate, formatDateTime, formatHash } from '@/features/anchor/format';

export default function AnchorVerifyPanel() {
  const [hash, setHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    found: boolean;
    continuity: boolean;
    anchor: {
      date: string;
      chain_head: string;
      row_number: number;
      sealed_at: string;
    } | null;
  } | null>(null);

  const verify = async () => {
    const trimmed = hash.trim();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/anchor?hash=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      setResult({
        found: data.verification?.found ?? false,
        continuity: data.chain?.verified ?? false,
        anchor: data.verification?.anchor ?? null,
      });
    } catch {
      setResult({ found: false, continuity: false, anchor: null });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-3 md:flex-row">
        <input
          type="text"
          value={hash}
          onChange={(e) => setHash(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && verify()}
          placeholder="Paste any chain head hash"
          className="flex-1 rounded-md border border-[var(--border)] bg-background px-4 py-2.5 font-mono text-sm outline-none ring-foreground/20 transition-all placeholder:text-muted focus:ring-2"
        />
        <Button onClick={verify} disabled={loading || !hash.trim()} className="shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Verify
        </Button>
      </div>

      {result && (
        <div
          className={`mt-4 rounded-[1.1rem] border p-5 ${
            result.found && result.continuity
              ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20'
              : 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20'
          }`}
        >
          {result.found && result.continuity ? (
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-medium text-emerald-800 dark:text-emerald-300">
                  Hash found in a continuous chain
                </p>
                {result.anchor && (
                  <div className="mt-2 space-y-1 text-sm text-emerald-900/80 dark:text-emerald-300/80">
                    <p>Date: {formatAnchorDate(result.anchor.date)}</p>
                    <p>Row: {result.anchor.row_number}</p>
                    <p>Sealed: {formatDateTime(result.anchor.sealed_at)}</p>
                    <p className="break-all font-mono">
                      Hash: {formatHash(result.anchor.chain_head, 16, 16)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : result.found && !result.continuity ? (
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-300">
                  Hash found, but chain continuity is broken
                </p>
                <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-300/80">
                  The hash exists in the anchor set, but the daily chain does not link correctly.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-300">
                  Hash not found in chain
                </p>
                <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-300/80">
                  That hash is not in any published Solace anchor. Check the hash or try a
                  different date.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
