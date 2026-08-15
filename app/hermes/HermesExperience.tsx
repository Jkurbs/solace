'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

/** Legacy flag; still cleared for older clients. */
const SIM_STARTED_KEY = 'hermes_sim_started';
/** Durable device-local sim identity (no credentials). Keep in sync with server. */
export const SIM_SESSION_STORAGE_KEY = 'hermes_sim_session_v1';

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number];

const sheetVariants = {
  hidden: { y: '100%' },
  visible: { y: 0, transition: { duration: 0.4, ease: easeOut } },
  exit: { y: '100%', transition: { duration: 0.3, ease: easeOut } },
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const contentVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, delay: 0.12 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

export const SIM_ALLOCATIONS = [
  { label: '$10K', value: 10_000 },
  { label: '$50K', value: 50_000 },
  { label: '$100K', value: 100_000 },
] as const;

export type SimAllocation = (typeof SIM_ALLOCATIONS)[number]['value'];

type StoredSimSession = {
  version: 1;
  sessionId: string;
  startedAt: string;
  depositAmount: number;
  riskProfile: string;
};

type OnboardingContextValue = {
  open: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useHermesOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error('useHermesOnboarding must be used within HermesOnboardingProvider');
  }
  return ctx;
}

function readStoredSimSession(): StoredSimSession | null {
  try {
    const raw = window.localStorage.getItem(SIM_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSimSession>;
    if (
      parsed?.version !== 1 ||
      typeof parsed.sessionId !== 'string' ||
      typeof parsed.startedAt !== 'string' ||
      typeof parsed.depositAmount !== 'number' ||
      typeof parsed.riskProfile !== 'string'
    ) {
      return null;
    }
    return parsed as StoredSimSession;
  } catch {
    return null;
  }
}

export function persistSimSession(session: StoredSimSession) {
  try {
    window.localStorage.setItem(SIM_SESSION_STORAGE_KEY, JSON.stringify(session));
    window.localStorage.setItem(SIM_STARTED_KEY, '1');
  } catch {
    // storage blocked
  }
}

export function clearPersistedSimSession() {
  try {
    window.localStorage.removeItem(SIM_SESSION_STORAGE_KEY);
    window.localStorage.removeItem(SIM_STARTED_KEY);
  } catch {
    // ignore
  }
}

/** Opens the simulation onboarding sheet. Use on every Experience Hermes entry. */
export function ExperienceHermesButton({
  className,
  children = (
    <>
      Experience Hermes
      <span aria-hidden="true">→</span>
    </>
  ),
  onClick,
  type = 'button',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open } = useHermesOnboarding();

  return (
    <button
      type={type}
      className={className}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          open();
        }
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

function allocationLabel(value: number) {
  if (value >= 1000) {
    return `$${(value / 1000).toLocaleString('en-US')}K`;
  }
  return `$${value.toLocaleString('en-US')}`;
}

export function HermesOnboardingProvider({ children }: { children: ReactNode }) {
  const titleId = useId();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'explain' | 'success' | 'returning'>('explain');
  const [selectedAllocation, setSelectedAllocation] = useState<SimAllocation>(50_000);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDeposit, setActiveDeposit] = useState<number>(50_000);

  const close = useCallback(() => {
    setIsOpen(false);
    window.setTimeout(() => {
      setStep('explain');
      setError(null);
      setSubmitting(false);
    }, 300);
  }, []);

  const restoreSession = useCallback(async (stored: StoredSimSession) => {
    const response = await fetch('/api/dashboard/onboarding/open-simulation', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ restore: true, session: stored }),
      credentials: 'same-origin',
    });

    if (!response.ok) {
      return false;
    }

    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      session?: StoredSimSession;
    } | null;

    if (payload?.ok === false) {
      return false;
    }

    if (payload?.session) {
      persistSimSession(payload.session);
    } else {
      persistSimSession(stored);
    }

    return true;
  }, []);

  const open = useCallback(async () => {
    setError(null);
    setSubmitting(false);

    const stored = readStoredSimSession();
    if (stored) {
      setActiveDeposit(stored.depositAmount);
      setSubmitting(true);
      setStep('returning');
      setIsOpen(true);

      try {
        const ok = await restoreSession(stored);
        setSubmitting(false);
        if (ok) {
          router.push('/dashboard');
          close();
          return;
        }
        // Stored session rejected: clear and offer a fresh start.
        clearPersistedSimSession();
        setStep('explain');
        setError('Your previous simulation could not be restored on this device. Start again below.');
      } catch {
        setSubmitting(false);
        setStep('explain');
        setError('We could not reach your simulation just now. Try again in a moment.');
      }
      return;
    }

    try {
      if (window.localStorage.getItem(SIM_STARTED_KEY) === '1') {
        router.push('/dashboard');
        return;
      }
    } catch {
      // storage blocked
    }

    setStep('explain');
    setIsOpen(true);
  }, [close, restoreSession, router]);

  useEffect(() => {
    if (!isOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) {
        close();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, close, submitting]);

  const startTracking = useCallback(async () => {
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/dashboard/onboarding/open-simulation', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          simAcknowledged: true,
          riskProfile: 'Balanced',
          depositAmount: selectedAllocation,
        }),
        credentials: 'same-origin',
      });

      if (response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          ok?: boolean;
          session?: StoredSimSession;
          depositAmount?: number;
        } | null;

        if (payload?.ok !== false) {
          if (payload?.session) {
            persistSimSession(payload.session);
            setActiveDeposit(payload.session.depositAmount);
          } else {
            persistSimSession({
              version: 1,
              sessionId: `local_${Date.now()}`,
              startedAt: new Date().toISOString(),
              depositAmount: selectedAllocation,
              riskProfile: 'Balanced',
            });
            setActiveDeposit(selectedAllocation);
          }
          setStep('success');
          setSubmitting(false);
          return;
        }
      }

      setError('We could not start the simulation just now. Try again in a moment.');
      setSubmitting(false);
    } catch {
      setError('Something interrupted the connection. Your money was never at risk. Try again.');
      setSubmitting(false);
    }
  }, [selectedAllocation, submitting]);

  const motionOff = Boolean(reduceMotion);

  return (
    <OnboardingContext.Provider value={{ open }}>
      {children}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="hermes-onboard-backdrop"
            variants={motionOff ? undefined : backdropVariants}
            initial={motionOff ? false : 'hidden'}
            animate="visible"
            exit="exit"
            onClick={() => {
              if (!submitting) close();
            }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="hermes-onboard-sheet-root"
            variants={motionOff ? undefined : sheetVariants}
            initial={motionOff ? false : 'hidden'}
            animate="visible"
            exit="exit"
          >
          <div
            className="hermes-onboard-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div className="hermes-onboard-handle" aria-hidden="true" />

            <AnimatePresence mode="wait">
              {step === 'returning' ? (
                <motion.div
                  key="returning"
                  variants={motionOff ? undefined : contentVariants}
                  initial={motionOff ? false : 'hidden'}
                  animate="visible"
                  exit="exit"
                  className="hermes-onboard-success"
                >
                  <div className="hermes-onboard-success-ring" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                  </div>
                  <h3 id={titleId} className="hermes-onboard-success-title">
                    Welcome back
                  </h3>
                  <p className="hermes-onboard-success-text">
                    Opening your simulation ({allocationLabel(activeDeposit)}) on this device. No sign-in
                    needed.
                  </p>
                  {submitting ? (
                    <p className="hermes-onboard-note" role="status">
                      Restoring…
                    </p>
                  ) : null}
                </motion.div>
              ) : step === 'explain' ? (
                <motion.div
                  key="explain"
                  variants={motionOff ? undefined : contentVariants}
                  initial={motionOff ? false : 'hidden'}
                  animate="visible"
                  exit="exit"
                >
                  <div className="hermes-onboard-header">
                    <span className="hermes-onboard-badge">
                      <span className="hermes-onboard-dot" />
                      Simulation
                    </span>
                    <h2 id={titleId} className="hermes-onboard-title">
                      Watch Hermes with pretend money.
                    </h2>
                    <p className="hermes-onboard-sub">
                      No real money. No account. Just pick a pretend bankroll and see what Hermes does.
                    </p>
                  </div>

                  <div className="hermes-onboard-steps">
                    <div className="hermes-onboard-step">
                      <div className="hermes-onboard-step-icon hermes-onboard-step-icon-green">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </div>
                      <div className="hermes-onboard-step-text">
                        <strong>Watch the same moves.</strong>
                        <span>Hermes trades with its own money. You just watch with pretend money—the moves are identical.</span>
                      </div>
                    </div>
                    <div className="hermes-onboard-step">
                      <div className="hermes-onboard-step-icon hermes-onboard-step-icon-blue">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <line x1="3" y1="9" x2="21" y2="9" />
                          <line x1="3" y1="15" x2="21" y2="15" />
                          <line x1="9" y1="21" x2="9" y2="9" />
                        </svg>
                      </div>
                      <div className="hermes-onboard-step-text">
                        <strong>See everything.</strong>
                        <span>Every decision is public. You can check wins, losses, and why Hermes decided to sit out.</span>
                      </div>
                    </div>
                    <div className="hermes-onboard-step">
                      <div className="hermes-onboard-step-icon hermes-onboard-step-icon-gray">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                          <polyline points="17 21 17 13 7 13 7 21" />
                          <polyline points="7 3 7 8 15 8" />
                        </svg>
                      </div>
                      <div className="hermes-onboard-step-text">
                        <strong>Come back anytime.</strong>
                        <span>We don't need your email. We save your progress on this device so you can pick up where you left off.</span>
                      </div>
                    </div>
                  </div>

                  <div className="hermes-onboard-capital">
                    <span className="hermes-onboard-capital-label">Pick a pretend bankroll to track.</span>
                    <div className="hermes-onboard-capital-options" role="group" aria-label="Starting allocation">
                      {SIM_ALLOCATIONS.map((a) => (
                        <button
                          key={a.value}
                          type="button"
                          className={`hermes-onboard-capital-btn${selectedAllocation === a.value ? ' is-selected' : ''}`}
                          aria-pressed={selectedAllocation === a.value}
                          onClick={() => setSelectedAllocation(a.value)}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted mt-1">This is just a test. None of this is real.</p>
                  </div>

                  {error ? (
                    <p className="hermes-onboard-error" role="alert">
                      {error}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    className="hermes-onboard-cta"
                    onClick={startTracking}
                    disabled={submitting}
                  >
                    {submitting ? 'Starting…' : 'Try it now'}
                    {!submitting ? (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    ) : null}
                  </button>
                  <p className="hermes-onboard-note">
                    This is a simulation. Hermes trades with its own real money. Your pretend balance follows Hermes from now on. You can check it anytime on your dashboard.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="success"
                  variants={motionOff ? undefined : contentVariants}
                  initial={motionOff ? false : 'hidden'}
                  animate="visible"
                  exit="exit"
                  className="hermes-onboard-success"
                >
                  <div className="hermes-onboard-success-ring" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                  <h3 id={titleId} className="hermes-onboard-success-title">
                    You are now tracking Hermes
                  </h3>
                  <p className="hermes-onboard-success-text">
                    Your simulated portfolio ({allocationLabel(activeDeposit)}) is live. Closed results
                    scale to your capital. You will not join trades that were already open when you entered.
                  </p>
                  <Link href="/dashboard" className="hermes-onboard-cta" onClick={close}>
                    Open dashboard
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </OnboardingContext.Provider>
  );
}