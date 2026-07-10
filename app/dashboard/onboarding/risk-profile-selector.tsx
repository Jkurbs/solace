'use client';

import { useState } from 'react';
import { Scale, ShieldCheck, Zap } from 'lucide-react';

import {
  betaLiveRiskProfile,
  betaUnavailableRiskProfileMessage,
  isRiskProfileAvailableForBeta,
  riskProfileDescriptions,
  riskProfileValues,
} from '@/features/hermes-dashboard/contract';
import type { RiskProfile } from '@/features/hermes-dashboard/types';
import { cn } from '@/lib/utils';

const riskProfileIcons: Record<RiskProfile, typeof ShieldCheck> = {
  Balanced: Scale,
  Preservation: ShieldCheck,
  Velocity: Zap,
};

type RiskProfileSelectorProps = {
  initialRiskProfile: RiskProfile;
};

export default function RiskProfileSelector({ initialRiskProfile }: RiskProfileSelectorProps) {
  const [selectedRiskProfile, setSelectedRiskProfile] = useState<RiskProfile>(
    isRiskProfileAvailableForBeta(initialRiskProfile) ? initialRiskProfile : betaLiveRiskProfile,
  );
  const [message, setMessage] = useState('');

  return (
    <div>
      <input type="hidden" name="riskProfile" value={selectedRiskProfile} />
      <div className="mt-5 grid gap-3" role="radiogroup" aria-label="Risk profile">
        {riskProfileValues.map((riskProfile) => {
          const Icon = riskProfileIcons[riskProfile];
          const selected = selectedRiskProfile === riskProfile;
          const available = isRiskProfileAvailableForBeta(riskProfile);

          return (
            <button
              key={riskProfile}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={!available}
              onClick={() => {
                if (!available) {
                  setMessage(betaUnavailableRiskProfileMessage);
                  return;
                }

                setSelectedRiskProfile(riskProfile);
                setMessage('');
              }}
              className={cn(
                'rounded-md border p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-400 dark:focus-visible:outline-neutral-200',
                selected
                  ? 'border-neutral-950 bg-neutral-100 text-neutral-950 dark:border-neutral-200 dark:bg-neutral-50'
                  : 'border-neutral-200 bg-white text-neutral-950 dark:border-neutral-800 dark:bg-neutral-950/30 dark:text-neutral-50',
                available
                  ? 'cursor-pointer hover:border-neutral-400 dark:hover:border-neutral-600'
                  : 'cursor-not-allowed text-neutral-500 opacity-70 hover:border-neutral-200 dark:hover:border-neutral-800',
              )}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} aria-hidden="true" />
                <strong className="text-sm font-semibold">{riskProfile}</strong>
                {!available ? (
                  <span className="ml-auto rounded border border-neutral-700 px-2 py-0.5 text-xs font-medium text-neutral-500">
                    Unavailable
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-6 text-inherit opacity-70">{riskProfileDescriptions[riskProfile]}</p>
            </button>
          );
        })}
      </div>
      {message ? (
        <p className="mt-3 text-sm leading-6 text-amber-200" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
