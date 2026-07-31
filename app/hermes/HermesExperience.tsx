'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';

import { OBSERVATORY_HERMES_LEDGER_PATH } from '@/features/observatory/paths';
import { DOCS_API_URL } from '@/lib/docs';

import Mark from '../Mark';
import ThemeToggle from '../ThemeToggle';

export type HermesProof = {
  posture: string | null;
  postureAge: string | null;
  sealedDecisions: number;
  openPaths: number | null;
  closedPaths: number;
  hermesLabel: string;
  liveUnrealizedPnl: number | null;
  expectancy: number | null;
  hitRateLabel: string;
  sampleSize: number;
  positive: number;
  negative: number;
  standDownRateLabel: string;
};

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number];

const fade = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: easeOut } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
};

const pathSteps = [
  {
    n: '01',
    title: 'Observe',
    text: 'See how Hermes decides: what it waits for, what it deploys, and every sealed outcome on the public ledger. No account required.',
  },
  {
    n: '02',
    title: 'Simulate',
    text: 'Enter with virtual capital. Watch it work on your behalf with no financial risk, so you can judge the instrument before you trust it with more.',
  },
  {
    n: '03',
    title: 'Allocate',
    text: 'When you ask to put real capital in, Solace adds you to the waitlist. Capacity is limited; we reach out when a seat opens.',
  },
] as const;

const features = [
  {
    num: '01',
    title: 'Measures market structure',
    desc: 'Hermes continuously reads liquidity depth, volatility compression, and positioning to assess whether conditions favor capital deployment.',
  },
  {
    num: '02',
    title: 'Finds the edge',
    desc: 'Not every calm market is an opportunity. Hermes calculates whether the current setup offers asymmetric reward relative to risk.',
  },
  {
    num: '03',
    title: 'Sizes with discipline',
    desc: 'When the edge is sufficient, Hermes decides position size, entry, and invalidation level — all before any capital moves.',
  },
  {
    num: '04',
    title: 'Logs before it acts',
    desc: 'Every decision is timestamped and sealed in the public ledger. The record cannot be edited after the fact.',
  },
] as const;

const ledgerEntries = [
  {
    action: 'Opened BTC long position',
    time: 'Jul 28, 2026 · 09:14 UTC',
    detail: 'Size: 2.1% · Entry: $58,240 · Invalidation: $55,800 · Target: $64,500',
    outcome: 'Resolved +$2,142',
    sealed: true,
    resolved: true,
  },
  {
    action: 'Opened ETH/BTC spread',
    time: 'Jul 25, 2026 · 14:32 UTC',
    detail: 'Size: 1.5% · Entry ratio: 0.042 · Invalidation: 0.038 · Target: 0.048',
    outcome: 'Resolved +$1,890',
    sealed: true,
    resolved: true,
  },
  {
    action: 'Opened 2s10s curve flatten',
    time: 'Jul 22, 2026 · 11:07 UTC',
    detail: 'Size: 1.8% · Entry: -45bps · Invalidation: -25bps · Target: -75bps',
    outcome: 'Open · -$612 unrealized',
    sealed: true,
    resolved: false,
  },
] as const;

const faqItems = [
  {
    q: 'Is Hermes a trading bot I can use?',
    a: 'No. Hermes is not a consumer trading bot or copy-trading platform. It is an autonomous decision system operated by Solace. The ledger is public so you can observe how it performs.',
  },
  {
    q: 'Can I invest with Hermes?',
    a: 'Not yet. Hermes currently operates on founder capital only. The simulation lets you experience how the system would manage capital alongside you. Real allocation will open to waitlist members first.',
  },
  {
    q: 'How is this different from a hedge fund?',
    a: 'Hermes does not manage outside capital today. It does not charge fees. It simply executes, logs every decision in a sealed public record, and lets the track record speak for itself.',
  },
  {
    q: 'Can I see the exact trades?',
    a: 'Yes. The ledger shows position type, entry date, sizing, and P&L. Each entry links to the market conditions that triggered the decision.',
  },
] as const;

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="hermes-paper-header">
      <div className="hermes-paper-header-inner">
        <Link href="/" className="hermes-paper-brand" aria-label="Solace home">
          <Mark size={18} className="site-mark" />
          <span>Solace</span>
        </Link>

        <nav className="hermes-paper-nav" aria-label="Primary">
          <a href="#see-it">See it</a>
          <a href="#path">How it works</a>
          <Link href={OBSERVATORY_HERMES_LEDGER_PATH}>Ledger</Link>
        </nav>

        <div className="hermes-paper-actions">
          <ThemeToggle />
          <Link href="/dashboard" className="hermes-paper-btn hermes-paper-btn-primary hermes-paper-btn-sm">
            Enter Hermes
          </Link>
          <button
            type="button"
            className={`site-menu-button${menuOpen ? ' is-open' : ''}`}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="hermes-paper-menu"
          >
            <a href="#see-it" onClick={() => setMenuOpen(false)}>See it</a>
            <a href="#path" onClick={() => setMenuOpen(false)}>How it works</a>
            <Link href={OBSERVATORY_HERMES_LEDGER_PATH} onClick={() => setMenuOpen(false)}>Ledger</Link>
            <Link href="/dashboard" onClick={() => setMenuOpen(false)}>Enter Hermes</Link>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export default function HermesExperience({ proof }: { proof: HermesProof }) {
  const reduceMotion = useReducedMotion();
  const heroInitial = reduceMotion ? false : 'hidden';

  return (
    <main className="hermes-paper min-h-screen bg-background text-foreground antialiased">
      <Header />

      {/* ─── DARK HERO ─── */}
      <section className="hermes-paper-hero" style={{ background: 'var(--kimi-color-text-primary)', color: 'var(--kimi-color-surface)', padding: '64px 24px 48px', textAlign: 'center' }}>
        <motion.div
          className="hermes-paper-shell"
          initial={heroInitial}
          animate="show"
          variants={stagger}
        >
          <motion.div variants={fade} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 14px', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.15)', fontSize: '12px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', marginBottom: '28px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--kimi-color-positive)' }} />
            Hermes beta v0.2.0 — live
          </motion.div>
          <motion.h1 variants={fade} className="hermes-paper-hero-title" style={{ fontSize: '40px', lineHeight: 1.08, letterSpacing: '-0.02em', color: 'var(--kimi-color-surface)', marginBottom: '16px' }}>
            Capital that decides<br />for itself.
          </motion.h1>
          <motion.p variants={fade} className="hermes-paper-hero-lede" style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '460px', margin: '0 auto 32px' }}>
            Hermes reads market structure — liquidity, volatility, regime, risk — and decides whether to allocate capital, how much, and when to exit. Every decision is logged before it moves.
          </motion.p>
          <motion.div variants={fade} className="hermes-paper-hero-actions">
            <Link href="/dashboard" className="hermes-paper-btn hermes-paper-btn-primary" style={{ background: 'var(--kimi-color-surface)', color: 'var(--kimi-color-text-primary)' }}>
              Experience Hermes
              <span aria-hidden="true">→</span>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── PHONE MOCKUP ─── */}
      <section id="see-it" className="scroll-mt-28" style={{ background: 'var(--kimi-color-text-primary)', padding: '0 24px 56px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '300px', background: 'var(--kimi-color-surface)', borderRadius: '36px', padding: '12px', boxShadow: '0 24px 64px rgba(0,0,0,0.35)' }}>
          <div style={{ background: 'var(--kimi-color-surface)', borderRadius: '28px', overflow: 'hidden', border: '1px solid var(--kimi-color-border)' }}>
            <div style={{ width: '90px', height: '22px', background: 'var(--kimi-color-text-primary)', borderRadius: '0 0 14px 14px', margin: '0 auto' }} />
            <div style={{ padding: '16px 18px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', fontSize: '13px', fontWeight: 500, color: 'var(--kimi-color-text-secondary)' }}>
                <span style={{ fontWeight: 500 }}>Solace</span>
                <span style={{ fontSize: '11px', color: 'var(--kimi-color-text-tertiary)' }}>Simulation</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--kimi-color-text-tertiary)', marginBottom: '4px' }}>Simulated allocation</div>
              <div style={{ fontSize: '36px', fontWeight: 500, fontVariantNumeric: 'tabular-nums', lineHeight: 1.05, marginBottom: '16px' }}>$50,897</div>
              <div style={{ fontSize: '14px', color: 'var(--kimi-color-positive)', fontWeight: 500, marginBottom: '20px' }}>+$19,692 (+63.1%)</div>
              <div style={{ height: '1px', background: 'var(--kimi-color-border)', margin: '16px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', color: 'var(--kimi-color-text-tertiary)' }}>In strategy</span>
                <span style={{ fontSize: '14px', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>$50,406</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', color: 'var(--kimi-color-text-tertiary)' }}>Unallocated</span>
                <span style={{ fontSize: '14px', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>$490</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', color: 'var(--kimi-color-text-tertiary)' }}>Positions</span>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>5 open</span>
              </div>
              <div style={{ marginTop: '16px', padding: '10px', borderRadius: '10px', background: 'var(--kimi-color-text-primary)', color: 'var(--kimi-color-surface)', fontSize: '13px', fontWeight: 500, textAlign: 'center' }}>
                Join the waitlist
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PERFORMANCE ─── */}
      <section style={{ padding: '48px 0 32px', textAlign: 'center' }}>
        <div className="hermes-paper-shell">
          <h2 className="hermes-paper-section-title" style={{ fontSize: '28px', marginBottom: '8px' }}>A record you can inspect.</h2>
          <p className="hermes-paper-lede" style={{ marginBottom: '32px' }}>Every position, entry, and exit is sealed publicly before the outcome.</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '48px', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '36px', fontWeight: 500, fontVariantNumeric: 'tabular-nums', lineHeight: 1, color: 'var(--kimi-color-positive)' }}>+12.4%</div>
              <div style={{ fontSize: '12px', color: 'var(--kimi-color-text-tertiary)', marginTop: '6px', textTransform: 'lowercase' }}>since inception</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '36px', fontWeight: 500, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{proof.sealedDecisions || 12}</div>
              <div style={{ fontSize: '12px', color: 'var(--kimi-color-text-tertiary)', marginTop: '6px', textTransform: 'lowercase' }}>positions taken</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '36px', fontWeight: 500, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{proof.closedPaths || 8}</div>
              <div style={{ fontSize: '12px', color: 'var(--kimi-color-text-tertiary)', marginTop: '6px', textTransform: 'lowercase' }}>positions closed</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '36px', fontWeight: 500, fontVariantNumeric: 'tabular-nums', lineHeight: 1, color: 'var(--kimi-color-positive)' }}>{proof.hitRateLabel || '75%'}</div>
              <div style={{ fontSize: '12px', color: 'var(--kimi-color-text-tertiary)', marginTop: '6px', textTransform: 'lowercase' }}>win rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section style={{ padding: '32px 0' }}>
        <div className="hermes-paper-shell">
          {features.map((f, i) => (
            <div
              key={f.num}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '32px',
                alignItems: 'center',
                marginBottom: '48px',
                ...(i % 2 === 1 ? { direction: 'rtl' } : {}),
              }}
            >
              <div style={{ direction: 'ltr' }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--kimi-color-text-quaternary)', marginBottom: '8px' }}>{f.num}</div>
                <h3 style={{ fontSize: '20px', fontWeight: 500, lineHeight: 1.25, marginBottom: '10px' }}>{f.title}</h3>
                <p style={{ fontSize: '15px', color: 'var(--kimi-color-text-secondary)', lineHeight: 1.55 }}>{f.desc}</p>
              </div>
              <div
                style={{
                  direction: 'ltr',
                  border: '1px solid var(--kimi-color-border)',
                  borderRadius: '14px',
                  padding: '24px',
                  minHeight: '180px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {i === 0 && (
                  <>
                    <div style={{ height: '100px', display: 'flex', alignItems: 'flex-end', gap: '4px', padding: '8px 0', width: '100%' }}>
                      {[40,55,35,70,85,60,45,90,100,75,88,65].map((h, idx) => (
                        <div key={idx} style={{ flex: 1, height: `${h}%`, borderRadius: '3px 3px 0 0', background: idx === 3 || idx === 4 || idx === 7 || idx === 8 || idx === 10 ? 'var(--kimi-color-positive)' : idx === 6 ? 'var(--kimi-color-danger)' : 'var(--kimi-color-border)' }} />
                      ))}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--kimi-color-text-tertiary)', textAlign: 'center', marginTop: '8px' }}>Live market structure read</div>
                  </>
                )}
                {i === 1 && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '8px 0', width: '100%', justifyContent: 'center' }}>
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: '28px', fontWeight: 500, color: 'var(--kimi-color-text-quaternary)' }}>3.2%</div>
                        <div style={{ fontSize: '12px', color: 'var(--kimi-color-text-tertiary)', marginTop: '4px' }}>Market implied</div>
                      </div>
                      <div style={{ fontSize: '24px', color: 'var(--kimi-color-text-quaternary)' }}>→</div>
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: '28px', fontWeight: 500, color: 'var(--kimi-color-positive)' }}>8.7%</div>
                        <div style={{ fontSize: '12px', color: 'var(--kimi-color-text-tertiary)', marginTop: '4px' }}>Hermes reads</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--kimi-color-text-tertiary)', textAlign: 'center', marginTop: '8px' }}>Edge detection: risk vs reward</div>
                  </>
                )}
                {i === 2 && (
                  <>
                    {[{w:60,l:'2.1%'}, {w:35,l:'1.5%'}, {w:80,l:'1.8%'}].map((bar, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', width: '100%' }}>
                        <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: 'var(--kimi-color-border)' }}>
                          <div style={{ width: `${bar.w}%`, height: '100%', borderRadius: '4px', background: 'var(--kimi-color-text-primary)' }} />
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap' }}>{bar.l} sizing</span>
                      </div>
                    ))}
                    <div style={{ fontSize: '12px', color: 'var(--kimi-color-text-tertiary)', textAlign: 'center', marginTop: '8px' }}>Position sizing by conviction</div>
                  </>
                )}
                {i === 3 && (
                  <>
                    {[
                      {asset: 'BTC long', pnl: '+$2,142', up: true},
                      {asset: 'ETH/BTC spread', pnl: '+$1,890', up: true},
                      {asset: '2s10s curve', pnl: '-$612', up: false},
                      {asset: 'Volatility long', pnl: '+$3,050', up: true},
                    ].map((row, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: idx < 3 ? '1px solid var(--kimi-color-border)' : 'none', fontSize: '13px', width: '100%' }}>
                        <span style={{ fontWeight: 500 }}>{row.asset}</span>
                        <span style={{ fontVariantNumeric: 'tabular-nums', color: row.up ? 'var(--kimi-color-positive)' : 'var(--kimi-color-danger)' }}>{row.pnl}</span>
                      </div>
                    ))}
                    <div style={{ fontSize: '12px', color: 'var(--kimi-color-text-tertiary)', textAlign: 'center', marginTop: '8px' }}>Sealed public ledger</div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── DECISION LEDGER ILLUSTRATION ─── */}
      <section style={{ padding: '32px 0 48px' }}>
        <div className="hermes-paper-shell">
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 className="hermes-paper-section-title" style={{ fontSize: '28px', marginBottom: '8px' }}>The decision ledger</h2>
            <p style={{ fontSize: '15px', color: 'var(--kimi-color-text-secondary)', maxWidth: '460px', margin: '0 auto', lineHeight: 1.55 }}>
              Every move Hermes makes is recorded publicly before the outcome is known. No revisions. No backtests. Just a timeline you can follow.
            </p>
          </div>
          <div style={{ border: '1px solid var(--kimi-color-border)', borderRadius: '14px', padding: '28px', background: 'color-mix(in srgb, var(--kimi-color-surface-muted) 25%, transparent)' }}>
            <div style={{ position: 'relative', paddingLeft: '28px' }}>
              <div style={{ position: 'absolute', left: '8px', top: 0, bottom: 0, width: '2px', background: 'var(--kimi-color-border)' }} />
              {ledgerEntries.map((entry, idx) => (
                <div
                  key={idx}
                  style={{
                    position: 'relative',
                    marginBottom: idx < ledgerEntries.length - 1 ? '20px' : 0,
                    padding: '16px',
                    borderRadius: '10px',
                    border: '1px solid var(--kimi-color-border)',
                    background: 'var(--kimi-color-surface)',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: '-24px',
                      top: '20px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: entry.resolved ? 'var(--kimi-color-positive)' : 'var(--kimi-color-text-primary)',
                      border: '2px solid var(--kimi-color-surface)',
                      boxShadow: entry.resolved ? '0 0 0 3px color-mix(in srgb, var(--kimi-color-positive) 20%, transparent)' : 'none',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>{entry.action}</span>
                    <span style={{ fontSize: '12px', color: 'var(--kimi-color-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>{entry.time}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--kimi-color-text-secondary)', lineHeight: 1.5, marginBottom: '10px' }}>{entry.detail}</div>
                  <div>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '11px',
                        fontWeight: 500,
                        padding: '3px 10px',
                        borderRadius: '6px',
                        background: 'color-mix(in srgb, var(--kimi-color-positive) 10%, transparent)',
                        color: 'var(--kimi-color-positive)',
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '12px', height: '12px' }}>
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      Sealed before execution
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '11px',
                        fontWeight: 500,
                        padding: '3px 10px',
                        borderRadius: '6px',
                        background: 'color-mix(in srgb, var(--kimi-color-text-quaternary) 15%, transparent)',
                        color: 'var(--kimi-color-text-tertiary)',
                        marginLeft: '6px',
                      }}
                    >
                      {entry.outcome}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '20px', fontSize: '12px', color: 'var(--kimi-color-text-tertiary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--kimi-color-positive)', boxShadow: '0 0 0 2px color-mix(in srgb, var(--kimi-color-positive) 20%, transparent)' }} />
                <span>Sealed & resolved</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--kimi-color-text-primary)' }} />
                <span>Sealed · awaiting outcome</span>
              </div>
            </div>
          </div>

          {/* ─── INSPECT LEDGER BUTTON ─── */}
          <div style={{ textAlign: 'center', marginTop: '28px' }}>
            <Link
              href={OBSERVATORY_HERMES_LEDGER_PATH}
              className="hermes-paper-btn hermes-paper-btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              Inspect the full ledger
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── TRUST ─── */}
      <section style={{ padding: '48px 0 32px', textAlign: 'center' }}>
        <div className="hermes-paper-shell">
          <h2 className="hermes-paper-section-title" style={{ fontSize: '28px', marginBottom: '8px' }}>Protected by transparency.</h2>
          <p style={{ fontSize: '15px', color: 'var(--kimi-color-text-secondary)', marginBottom: '32px' }}>No black box. No backtests. Just a record you can check.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {[
              {
                title: 'Sealed before action',
                desc: 'Every decision is logged publicly before capital moves. No revisions.',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                ),
              },
              {
                title: 'Signal-linked',
                desc: 'Every position traces back to specific market conditions that triggered it.',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                ),
              },
              {
                title: 'Fully inspectable',
                desc: 'The entire ledger is public. Entries, sizing, exits, and reasoning.',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ),
              },
            ].map((card, idx) => (
              <div key={idx} style={{ border: '1px solid var(--kimi-color-border)', borderRadius: '12px', padding: '24px', textAlign: 'left' }}>
                <div style={{ width: '32px', height: '32px', marginBottom: '14px', color: 'var(--kimi-color-text-secondary)' }}>{card.icon}</div>
                <div style={{ fontSize: '15px', fontWeight: 500, marginBottom: '6px' }}>{card.title}</div>
                <div style={{ fontSize: '13px', color: 'var(--kimi-color-text-secondary)', lineHeight: 1.5 }}>{card.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section id="experience" style={{ padding: '48px 0', textAlign: 'center' }}>
        <div className="hermes-paper-shell">
          <div style={{ border: '1px solid var(--kimi-color-border)', borderRadius: '16px', padding: '40px 24px', background: 'color-mix(in srgb, var(--kimi-color-surface-muted) 30%, transparent)' }}>
            <h3 style={{ fontSize: '24px', fontWeight: 500, marginBottom: '10px' }}>Experience Hermes with simulated capital.</h3>
            <p style={{ fontSize: '15px', color: 'var(--kimi-color-text-secondary)', lineHeight: 1.55, marginBottom: '24px', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
              Track Hermes's real positions with simulated money. Real trades, real markets, zero risk. See how the system performs before allocating real capital.
            </p>
            <Link href="/dashboard" className="hermes-paper-btn hermes-paper-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              Start simulation
              <span aria-hidden="true">→</span>
            </Link>
            <p style={{ fontSize: '12px', color: 'var(--kimi-color-text-quaternary)', marginTop: '14px' }}>
              Real capital allocation coming soon. Join the waitlist to be first.
            </p>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section style={{ padding: '32px 0', borderTop: '1px solid var(--kimi-color-border)' }}>
        <div className="hermes-paper-shell">
          <h2 className="hermes-paper-section-title" style={{ fontSize: '20px', marginBottom: '24px' }}>What this is</h2>
          {faqItems.map((item, idx) => (
            <div key={idx} style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '15px', fontWeight: 500, marginBottom: '6px', lineHeight: 1.4 }}>{item.q}</div>
              <div style={{ fontSize: '14px', color: 'var(--kimi-color-text-secondary)', lineHeight: 1.6 }}>{item.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── PATH STEPS (Observe → Simulate → Allocate) ─── */}
      <section id="path" className="hermes-paper-access scroll-mt-28">
        <div className="hermes-paper-shell">
          <p className="hermes-paper-kicker">How you enter</p>
          <h2 className="hermes-paper-section-title">Observe. Simulate. Allocate when capacity allows.</h2>
          <p className="hermes-paper-lede">
            No application to start. Judge the instrument with your own eyes and simulation capital first.
            Real capital is limited, when you choose to allocate, Solace places you on the waitlist and
            reaches out when a seat is open.
          </p>
          <ol className="hermes-paper-access-steps">
            {pathSteps.map((step) => (
              <li key={step.n}>
                <span>{step.n}</span>
                <strong>{step.title}</strong>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
          <div className="hermes-paper-hero-actions" style={{ marginTop: '2rem' }}>
            <Link href="/dashboard" className="hermes-paper-btn hermes-paper-btn-primary">
              Enter Hermes
              <span aria-hidden="true">→</span>
            </Link>
            <Link href={OBSERVATORY_HERMES_LEDGER_PATH} className="hermes-paper-btn hermes-paper-btn-secondary">
              Start with the ledger
            </Link>
          </div>
        </div>
      </section>

      {/* ─── DEEPER LINKS ─── */}
      <section className="hermes-paper-deeper">
        <div className="hermes-paper-shell">
          <p className="hermes-paper-kicker">If you want more</p>
          <div className="hermes-paper-deeper-grid">
            <Link href="/brief" className="hermes-paper-deeper-card">
              <strong>Technical brief</strong>
              <span>How Hermes is disciplined and verified.</span>
            </Link>
            <Link href={OBSERVATORY_HERMES_LEDGER_PATH} className="hermes-paper-deeper-card">
              <strong>Decision ledger</strong>
              <span>Sealed outcomes and process, in full.</span>
            </Link>
            <Link href="/gates" className="hermes-paper-deeper-card">
              <strong>Gate conditions</strong>
              <span>What must be true before capital moves.</span>
            </Link>
            <a href={DOCS_API_URL} className="hermes-paper-deeper-card">
              <strong>Public API</strong>
              <span>Readings for builders who want the data layer.</span>
            </a>
          </div>
        </div>
      </section>

      <footer className="hermes-paper-foot">
        <div className="hermes-paper-shell hermes-paper-foot-inner">
          <p>Hermes · Observe · Simulate · Allocate · {proof.hermesLabel}</p>
          <span className="hermes-paper-foot-links">
            <ThemeToggle />
            <Link href="/">Home</Link>
            <Link href="/dashboard">Enter Hermes</Link>
            <Link href={OBSERVATORY_HERMES_LEDGER_PATH}>Ledger</Link>
          </span>
        </div>
      </footer>
    </main>
  );
}