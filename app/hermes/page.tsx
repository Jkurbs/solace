import type { Metadata } from 'next';

import HermesExperience from './HermesExperience';

export const metadata: Metadata = {
  title: 'Solace — Hermes · Capital Allocation',
  description:
    'Hermes evaluates opportunity, posture, and conviction before allocating capital. Direct deposits through Solace. No performance claims.',
};

export default function HermesPage() {
  return <HermesExperience />;
}
