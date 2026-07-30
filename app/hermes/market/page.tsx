import { redirect } from 'next/navigation';

import { DOCS_API_APP_PATH } from '@/lib/docs';

/** Legacy path, docs live at docs.solace.fyi/api (app route /docs/api). */
export default function HermesMarketRedirectPage() {
  redirect(DOCS_API_APP_PATH);
}
