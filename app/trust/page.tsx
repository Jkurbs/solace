import { permanentRedirect } from 'next/navigation';

import { OBSERVATORY_HERMES_LEDGER_PATH } from '@/features/observatory/paths';

/** Legacy URL — ledger lives under Observatory → Hermes. */
export default function TrustRedirectPage() {
  permanentRedirect(OBSERVATORY_HERMES_LEDGER_PATH);
}
