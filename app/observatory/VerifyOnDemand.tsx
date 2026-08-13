'use client';

import { useState } from 'react';

import LedgerVerifyStrip from '@/app/trust/LedgerVerifyStrip';

export default function VerifyOnDemand() {
  const [open, setOpen] = useState(false);

  return (
    <details
      className="home-verify"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>Verify this chain</summary>
      {open ? (
        <div className="home-verify-body">
          <LedgerVerifyStrip />
        </div>
      ) : null}
    </details>
  );
}
