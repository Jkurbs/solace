'use client';

import CopyCommands from './CopyCommands';
import VerifyInBrowser from './VerifyInBrowser';

const VERIFY_COMMANDS = `curl -sL https://solace.fyi/verify-ledger.mjs -o verify-ledger.mjs
node verify-ledger.mjs`;

/**
 * Proof ritual at the top of the Hermes chain: verify first, then read history.
 * Emotional job: a careful stranger knows they can check without trusting our UI.
 */
export default function LedgerVerifyStrip() {
  return (
    <div className="ledger-verify-strip" id="verify-ledger">
      <div className="ledger-verify-strip-primary">
        <div className="ledger-verify-strip-copy">
          <p className="ledger-verify-strip-kicker">Independent check</p>
          <p className="ledger-verify-strip-title">Verify the chain on your machine</p>
          <p className="ledger-verify-strip-dek">
            Every sealed row is hashed before the outcome is known. Recompute the hashes here, or offline with the
            public script — no account required.
          </p>
        </div>
        <VerifyInBrowser variant="primary" />
      </div>

      <details className="ledger-verify-offline">
        <summary>Prefer the terminal?</summary>
        <p className="ledger-verify-offline-dek">
          Same rules as the browser check. Fetches the public JSON and walks every hash link.
        </p>
        <CopyCommands commands={VERIFY_COMMANDS} />
      </details>

      <div className="ledger-contract" aria-label="What this ledger promises">
        <p className="ledger-contract-kicker">Public contract</p>
        <ul className="ledger-contract-list">
          <li>
            <strong>Sealed fields</strong> enter the hash: decision, posture, note, record id, sealed time, and the
            previous row’s hash. Outcome and PnL get a separate resolution hash after the fact.
          </li>
          <li>
            <strong>Backfill</strong> rows are labeled and do not carry the sealed-before-outcome claim. System rows are
            operational, not path decisions.
          </li>
          <li>
            <strong>Young sample</strong> — founder capital, a record not a performance claim. Version and event type
            are write-once metadata, not part of the hash.
          </li>
        </ul>
      </div>
    </div>
  );
}
