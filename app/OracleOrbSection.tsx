'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

import { calibration } from './calibration';

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number];

function OrbStarfield() {
  const stars = Array.from({ length: 90 }, (_, i) => ({
    id: i,
    top: `${(i * 17.3) % 100}%`,
    left: `${(i * 31.7) % 100}%`,
    size: 1 + ((i * 13) % 3),
    opacity: 0.2 + ((i * 7) % 50) / 100,
    delay: (i * 0.07) % 3,
  }));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
      {stars.map((star) => (
        <span
          key={star.id}
          className="absolute rounded-full bg-foreground"
          style={{
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            ['--star-opacity' as string]: star.opacity,
            animation: `oracleStarTwinkle 3s ease-in-out ${star.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export default function OracleOrbSection() {
  return (
    <section className="border-t border-border px-5 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <motion.div
          className="grid items-center gap-8 overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl shadow-black/5 md:grid-cols-2 md:gap-10 md:p-10"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: easeOut }}
        >
          {/* Copy side */}
          <div className="order-2 md:order-1">
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 font-mono text-[0.6rem] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-600 dark:bg-emerald-400" />
              Live · BTC / ETH
            </p>

            <h2 className="font-serif text-4xl font-medium tracking-[-0.03em] text-foreground md:text-5xl">
              Oracle
            </h2>
            <p className="mt-3 max-w-sm text-muted-foreground [text-wrap:balance]">
              Estimates the probability of real events, records each estimate before the outcome is known,
              and scores it against what actually happened.
            </p>

            {/* Stats */}
            <div className="mt-8 flex items-start gap-8 md:gap-10">
              <div>
                <strong className="block font-serif text-2xl font-medium tracking-[-0.02em] text-foreground md:text-3xl">
                  {calibration.resolved}
                </strong>
                <span className="mt-1 block font-mono text-[0.65rem] lowercase tracking-[0.06em] text-muted-foreground">
                  resolved
                </span>
              </div>
              <div>
                <strong className="block font-serif text-2xl font-medium tracking-[-0.02em] text-foreground md:text-3xl">
                  {calibration.brier.toFixed(2)}
                </strong>
                <span className="mt-1 block font-mono text-[0.65rem] lowercase tracking-[0.06em] text-muted-foreground">
                  brier score
                </span>
              </div>
              <div>
                <strong className="block font-serif text-2xl font-medium tracking-[-0.02em] text-foreground md:text-3xl">
                  —
                </strong>
                <span className="mt-1 block font-mono text-[0.65rem] lowercase tracking-[0.06em] text-muted-foreground">
                  active
                </span>
              </div>
            </div>

            <Link
              href="/oracle"
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-full border border-foreground bg-foreground px-5 py-2.5 font-mono text-[0.65rem] font-medium uppercase tracking-[0.12em] text-background transition-opacity hover:opacity-90"
            >
              Check the ledger
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          {/* Orb side */}
          <div className="relative order-1 flex min-h-[280px] items-center justify-center md:order-2 md:min-h-[380px]">
            <div className="pointer-events-none absolute inset-0 rounded-full bg-emerald-500/5 blur-[80px]" />

            <div className="oracle-orb relative aspect-square w-56 md:w-72">
              {/* Glass shell */}
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.75),rgba(255,255,255,0.25)_35%,rgba(255,255,255,0.05)_60%,rgba(0,0,0,0.22)_100%)] shadow-[inset_0_-16px_48px_rgba(0,0,0,0.2),inset_0_8px_32px_rgba(255,255,255,0.45),0_0_48px_rgba(16,185,129,0.1)] dark:shadow-[inset_0_-16px_48px_rgba(0,0,0,0.5),inset_0_8px_32px_rgba(255,255,255,0.08),0_0_48px_rgba(16,185,129,0.12)]" />

              {/* Inner core */}
              <div className="absolute inset-[6%] overflow-hidden rounded-full bg-card">
                {/* Slow-rotating nebula layer */}
                <div className="oracle-orb-nebula absolute inset-[-50%] rounded-full opacity-60" />

                {/* Starfield layer */}
                <div className="oracle-orb-stars absolute inset-0">
                  <OrbStarfield />
                </div>

                {/* Center glow */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.12),transparent_60%)]" />

                {/* Rim light */}
                <div className="absolute inset-0 rounded-full shadow-[inset_0_0_32px_rgba(255,255,255,0.5),inset_-6px_-6px_24px_rgba(16,185,129,0.06)] dark:shadow-[inset_0_0_32px_rgba(0,0,0,0.6),inset_-6px_-6px_24px_rgba(16,185,129,0.08)]" />
              </div>

              {/* Chromatic edge specks */}
              <div className="pointer-events-none absolute inset-[-8%] animate-pulse">
                <span className="absolute left-[18%] top-[12%] h-1 w-1 rounded-full bg-emerald-500/70 blur-[1px]" />
                <span className="absolute right-[22%] top-[18%] h-1 w-1 rounded-full bg-indigo-400/70 blur-[1px]" />
                <span className="absolute bottom-[20%] left-[14%] h-1 w-1 rounded-full bg-rose-400/60 blur-[1px]" />
                <span className="absolute bottom-[16%] right-[18%] h-1 w-1 rounded-full bg-amber-400/60 blur-[1px]" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <style jsx>{`
        @keyframes oracleStarTwinkle {
          0%,
          100% {
            opacity: var(--star-opacity, 0.35);
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.4);
          }
        }

        .oracle-orb-nebula {
          background: radial-gradient(
              circle at 35% 30%,
              rgba(120, 113, 108, 0.14) 0%,
              transparent 45%
            ),
            radial-gradient(circle at 70% 60%, rgba(16, 185, 129, 0.16) 0%, transparent 40%),
            radial-gradient(circle at 55% 75%, rgba(99, 102, 241, 0.1) 0%, transparent 35%);
          animation: oracleNebulaSpin 60s linear infinite;
        }

        @keyframes oracleNebulaSpin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </section>
  );
}
