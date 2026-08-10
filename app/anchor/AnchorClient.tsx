'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Copy, Download, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';

import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';
import { Button } from '@/components/ui/button';
import type { AnchorChain, ChainAnchor } from '@/features/anchor/types';
import {
  formatAnchorDate,
  formatDateTime,
  formatHash,
  formatRelativeTime,
  isStale,
} from '@/features/anchor/format';

import AnchorVerifyPanel from './AnchorVerifyPanel';

const CLI_COMMAND =
  'curl -sL https://raw.githubusercontent.com/Solacefyi/anchor/main/verify/verify.sh | bash';

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number];

const fade = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: easeOut } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.06 } },
};

export default function AnchorClient({ chain }: { chain: AnchorChain }) {
  const reduceMotion = useReducedMotion();
  const heroInitial = reduceMotion ? false : 'hidden';
  const verifyRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const head = chain.head;
  const verified = chain.verified && head !== null;
  const stale = head ? isStale(head.sealedAt, 48) : false;
  const continuousDays = useMemo(() => {
    if (!chain.anchors.length) return 0;
    const anchorDate = (d: string) =>
      d.includes('T') ? new Date(d).getTime() : new Date(`${d}T00:00:00Z`).getTime();
    const first = anchorDate(chain.anchors[0].date);
    const last = anchorDate(chain.anchors[chain.anchors.length - 1].date);
    if (!Number.isFinite(first) || !Number.isFinite(last)) return chain.anchors.length;
    return Math.max(1, Math.round((last - first) / (1000 * 60 * 60 * 24)) + 1);
  }, [chain.anchors]);

  const scrollToVerify = () => {
    verifyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(CLI_COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <main className="min-h-screen bg-background pt-16 text-foreground antialiased selection:bg-foreground/10">
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-border px-5 pb-16 pt-12 md:pb-24 md:pt-20">
        <motion.div
          initial={heroInitial}
          animate="show"
          variants={stagger}
          className="mx-auto max-w-3xl"
        >
          <motion.p
            variants={fade}
            className="text-xs uppercase tracking-[0.18em] text-muted"
          >
            Anchor
          </motion.p>

          <motion.h1
            variants={fade}
            className="mt-4 font-serif text-3xl font-medium leading-tight md:text-5xl"
          >
            Verify the chain.
          </motion.h1>

          <motion.p variants={fade} className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
            Every Hermes decision is a canonical record, SHA-256 hashed, and chained to the record
            before it. This page publishes the chain head almost instantly so anyone can check
            integrity without trusting Solace infrastructure.
          </motion.p>

          {head && (
            <motion.div
              variants={fade}
              className="mt-8 rounded-[1.1rem] border border-[var(--border)] bg-[var(--card)] p-6 md:p-8"
            >
              <div className="flex items-center gap-2 text-sm">
                {verified && !stale ? (
                  <>
                    <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">
                      Chain verified
                    </span>
                  </>
                ) : stale ? (
                  <>
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="font-medium text-amber-700 dark:text-amber-400">
                      Last anchor older than expected
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-muted" />
                    <span className="font-medium text-muted">No anchor loaded</span>
                  </>
                )}
              </div>

              <div className="mt-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Today's chain head</p>
                <p className="mt-2 break-all font-mono text-lg md:text-xl">{head.chainHead}</p>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted">
                <span>Row {head.rowNumber}</span>
                <span>·</span>
                <span>Sealed {formatDateTime(head.sealedAt)}</span>
                <span>·</span>
                <span>{formatRelativeTime(head.sealedAt)}</span>
                {continuousDays > 1 && (
                  <>
                    <span>·</span>
                    <span>{continuousDays} days of continuous verification</span>
                  </>
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={scrollToVerify}>
                  <ShieldCheck className="h-4 w-4" />
                  Verify This Hash
                </Button>
                <Button variant="secondary" asChild>
                  <a href={`/api/anchor/proof?date=${head.date}`} download>
                    <Download className="h-4 w-4" />
                    Download Proof
                  </a>
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* Verify any hash */}
      <section ref={verifyRef} className="px-5 py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-serif text-2xl font-medium md:text-3xl">Verify any hash</h2>
          <p className="mt-3 max-w-xl text-muted">
            Paste any chain head hash to see when it was anchored and whether the chain stays
            continuous.
          </p>
          <AnchorVerifyPanel />
        </div>
      </section>

      {/* Recent anchors */}
      <section className="border-t border-border px-5 py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-serif text-2xl font-medium md:text-3xl">Recent anchors</h2>

          {chain.anchors.length === 0 ? (
            <p className="mt-4 text-muted">No anchors published yet.</p>
          ) : (
            <ul className="mt-6 divide-y divide-[var(--border)] rounded-[1.1rem] border border-[var(--border)] bg-[var(--card)]">
              {[...chain.anchors].reverse().map((anchor) => (
                <li
                  key={anchor.date}
                  className="flex flex-col gap-2 px-5 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium">{formatAnchorDate(anchor.date)}</p>
                    <p className="mt-1 font-mono text-sm text-muted">
                      {formatHash(anchor.chainHead)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted">Row {anchor.rowNumber}</span>
                    <Link
                      href={`/api/anchor?date=${anchor.date}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm underline underline-offset-4 transition-colors hover:text-muted-foreground"
                    >
                      view
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-6 text-sm text-muted">
            <a
              href="https://github.com/Solacefyi/anchor"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 underline underline-offset-4 transition-colors hover:text-foreground"
            >
              View all anchors on GitHub
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      </section>

      {/* How to verify yourself */}
      <section className="border-t border-border px-5 py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-serif text-2xl font-medium md:text-3xl">Verify yourself</h2>
          <p className="mt-3 max-w-xl text-muted">
            No account, no permission, no trust. Run the verifier anywhere and see the same result.
          </p>

          <div className="mt-6 flex items-center gap-3 rounded-[1.1rem] border border-[var(--border)] bg-[var(--card)] p-4 font-mono text-xs md:text-sm">
            <code className="flex-1 break-all">{CLI_COMMAND}</code>
            <Button variant="ghost" size="sm" onClick={copyCommand} aria-label="Copy command">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
