'use client';

import type { ReactNode } from 'react';
import { ShimmerLink } from '@/components/shimmer-link';
import { OBSERVATORY_HERMES_LEDGER_PATH } from '@/features/observatory/paths';

import HermesBoardArt from './HermesBoardArt';
import LedgerBoardArt from './LedgerBoardArt';

function ProductWindow({
  url,
  children,
}: {
  url: string;
  children: ReactNode;
}) {
  return (
    <div className="hx-window hermes-product-window">
      <div className="hx-window-bar">
        <span className="hx-window-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="hx-window-url">{url}</span>
        <span className="hx-window-spacer" />
      </div>
      <div className="hx-window-view is-static hermes-product-window-view">{children}</div>
    </div>
  );
}

/**
 * The only product illustrations on /hermes: ledger + dashboard.
 * Static frames, no multi-step walkthrough.
 */
export default function ProductShots() {
  return (
    <section className="hermes-product-shots" aria-label="Ledger and dashboard">
      <div className="hermes-paper-shell">
        <p className="hermes-paper-kicker">See it</p>
        <h2 className="hermes-paper-section-title">Two surfaces. That is the product.</h2>
        <p className="hermes-paper-lede">
          The ledger is where every decision is sealed before the outcome is known, so you can verify rather
          than merely trust. The dashboard is where capital is watched and managed.
        </p>
      </div>

      <div className="hermes-product-shots-list">
        <figure className="hermes-product-shot">
          <div className="hermes-paper-shell hermes-product-shot-copy">
            <figcaption>
              <span>01 · Ledger</span>
              <strong>Where every decision is sealed</strong>
            </figcaption>
            <p>
              Wins, losses, and waits get rows before outcomes are known. Public, hash-chained, and checkable
              without an account.
            </p>
          </div>
          <div className="hermes-product-shot-frame">
            <ProductWindow url="solace.fyi/observatory/hermes/ledger">
              <LedgerBoardArt />
            </ProductWindow>
          </div>
          <div className="hermes-paper-shell hermes-product-shot-cta">
            <ShimmerLink
              href={OBSERVATORY_HERMES_LEDGER_PATH}
              className="hermes-paper-btn hermes-paper-btn-primary"
            >
              Inspect the ledger
              <span aria-hidden="true">→</span>
            </ShimmerLink>
          </div>
        </figure>

        <figure className="hermes-product-shot">
          <div className="hermes-paper-shell hermes-product-shot-copy">
            <figcaption>
              <span>02 · Dashboard</span>
              <strong>Where your capital is managed</strong>
            </figcaption>
            <p>
              Portfolio, posture, outlook, and recent decisions, one surface so you can see what Hermes is
              doing without becoming the operator.
            </p>
          </div>
          <div className="hermes-product-shot-frame">
            <ProductWindow url="app.solace.fyi/dashboard">
              <HermesBoardArt />
            </ProductWindow>
          </div>
          <div className="hermes-paper-shell hermes-product-shot-cta">
            <ShimmerLink href="/dashboard" className="hermes-paper-btn hermes-paper-btn-primary">
              Enter Hermes
              <span aria-hidden="true">→</span>
            </ShimmerLink>
          </div>
        </figure>
      </div>
    </section>
  );
}
