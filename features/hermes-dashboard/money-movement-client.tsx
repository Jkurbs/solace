'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownToLine, ArrowLeft, ArrowUpFromLine, Clock3, LogOut, Moon, Sun, Wallet } from 'lucide-react';

import Mark from '@/app/Mark';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import {
  getHermesDashboardSnapshot,
  hermesDashboardQueryKey,
  logoutUser,
  startMoneyMovement,
} from './queries';
import type { HermesDashboardSnapshot, MoneyMovementType } from './types';

type MoneyMovementPageProps = {
  initialSnapshot: HermesDashboardSnapshot;
};

type DashboardTheme = 'dark' | 'light';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: 'currency',
});

const wholeCurrencyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  maximumFractionDigits: 0,
  style: 'currency',
});

const liveRefreshIntervalMs = 5_000;

function formatCurrency(value: number, options: { signed?: boolean; whole?: boolean } = {}) {
  const sign = options.signed && value > 0 ? '+' : value < 0 ? '-' : '';
  const formatter = options.whole ? wholeCurrencyFormatter : currencyFormatter;

  return `${sign}${formatter.format(Math.abs(value))}`;
}

function parseCapitalAmountInput(value: string) {
  const amount = Number(value.replace(/[$,\s]/g, ''));

  if (!Number.isFinite(amount)) {
    return null;
  }

  const rounded = Math.round(amount * 100) / 100;

  return rounded >= 1 ? rounded : null;
}

function MoneyMetric({
  label,
  tone = 'default',
  value,
}: {
  label: string;
  tone?: 'default' | 'green' | 'muted';
  value: string;
}) {
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
      <span className="block text-sm text-neutral-500 dark:text-neutral-400">{label}</span>
      <strong
        className={cn(
          'mt-2 block text-2xl font-semibold text-neutral-950 dark:text-neutral-50',
          tone === 'green' && 'text-emerald-700 dark:text-emerald-300',
          tone === 'muted' && 'text-neutral-600 dark:text-neutral-300',
        )}
      >
        {value}
      </strong>
    </div>
  );
}

function FundingStep({
  detail,
  label,
  state,
}: {
  detail: string;
  label: string;
  state: 'complete' | 'pending';
}) {
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'grid h-9 w-9 shrink-0 place-items-center rounded-full border',
            state === 'complete'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
              : 'border-neutral-300 bg-white text-neutral-500 dark:border-neutral-700 dark:bg-[#181715] dark:text-neutral-400',
          )}
        >
          {state === 'complete' ? <ArrowDownToLine size={17} aria-hidden="true" /> : <Clock3 size={17} aria-hidden="true" />}
        </span>
        <div>
          <strong className="block text-sm font-semibold text-neutral-950 dark:text-neutral-50">{label}</strong>
          <span className="mt-1 block text-sm leading-5 text-neutral-500 dark:text-neutral-400">{detail}</span>
        </div>
      </div>
    </div>
  );
}

function getFundingCopy(data: HermesDashboardSnapshot) {
  const isAwaitingDeposit = data.account.lifecycle === 'AWAITING_DEPOSIT';
  const isSimulationMode = data.account.mode === 'SIMULATION';
  const equityState = data.portfolio.equityState;

  if (isAwaitingDeposit) {
    return {
      badge: 'SETUP',
      title: 'Awaiting first deposit',
      body: 'Complete setup and add capital before Hermes begins allocation.',
    };
  }

  if (equityState.code === 'PENDING_SETTLEMENT') {
    return {
      badge: 'PENDING',
      title: 'Settlement pending',
      body: 'Capital has been received and is waiting for Stripe availability before treasury allocation.',
    };
  }

  if (equityState.code === 'TREASURY_QUEUED') {
    return {
      badge: 'PENDING',
      title: 'Treasury queued',
      body: isSimulationMode
        ? 'Simulation capital is posted and waiting for Solace treasury routing.'
        : 'Capital is posted and waiting for Solace treasury allocation before Hermes deployment.',
    };
  }

  if (equityState.code === 'NAV_PENDING') {
    return {
      badge: 'PENDING',
      title: 'NAV mark pending',
      body: 'Treasury routing has cleared. Hermes projection updates after the next pool NAV mark.',
    };
  }

  return {
    badge: 'ACTIVE',
    title: 'Capital movement open',
    body: isSimulationMode
      ? 'Simulation mode uses Stripe sandbox when configured. No real money moves.'
      : 'Deposits and withdrawal requests run through the approved Solace account rails.',
  };
}

export function MoneyMovementPage({ initialSnapshot }: MoneyMovementPageProps) {
  const [actionStatus, setActionStatus] = useState('');
  const [depositAmount, setDepositAmount] = useState(() => String(initialSnapshot.account.depositIntent?.amount ?? 1000));
  const [logoutStatus, setLogoutStatus] = useState('');
  const [theme, setTheme] = useState<DashboardTheme>('dark');
  const queryClient = useQueryClient();
  const { data, isFetching } = useQuery({
    queryKey: hermesDashboardQueryKey,
    queryFn: getHermesDashboardSnapshot,
    initialData: initialSnapshot,
    refetchInterval: liveRefreshIntervalMs,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const moneyMovement = useMutation({
    mutationFn: ({ amount, type }: { amount?: number; type: MoneyMovementType }) => startMoneyMovement(type, amount),
    onMutate() {
      setActionStatus('');
    },
    onError(error) {
      setActionStatus(error.message);
    },
    onSuccess(payload) {
      setActionStatus(payload.message ?? '');
      queryClient.invalidateQueries({ queryKey: hermesDashboardQueryKey });
    },
  });

  const logout = useMutation({
    mutationFn: logoutUser,
    onMutate() {
      setLogoutStatus('');
    },
    onError(error) {
      setLogoutStatus(error.message);
    },
  });

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('hermes_dashboard_theme');

    if (storedTheme === 'dark' || storedTheme === 'light') {
      setTheme(storedTheme);
    }
  }, []);

  function toggleTheme() {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      window.localStorage.setItem('hermes_dashboard_theme', next);
      return next;
    });
  }

  function handleDeposit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amount = parseCapitalAmountInput(depositAmount);

    if (!amount) {
      setActionStatus('Enter a deposit amount of at least $1.');
      return;
    }

    moneyMovement.mutate({ amount, type: 'deposit' });
  }

  const isAwaitingDeposit = data.account.lifecycle === 'AWAITING_DEPOSIT';
  const isSimulationMode = data.account.mode === 'SIMULATION';
  const equityState = data.portfolio.equityState;
  const isFundingPending =
    !isAwaitingDeposit &&
    (equityState.code === 'PENDING_SETTLEMENT' ||
      equityState.code === 'TREASURY_QUEUED' ||
      equityState.code === 'NAV_PENDING');
  const accountReviewSubmitted = data.account.review?.status === 'SUBMITTED';
  const setupIncomplete = isAwaitingDeposit && (!accountReviewSubmitted || !data.account.depositIntent?.amount);
  const availableBalance = data.portfolio.availableBalance ?? data.portfolio.availableToWithdraw;
  const withdrawable = data.portfolio.withdrawable ?? data.portfolio.availableToWithdraw;
  const allocatedCapital = data.portfolio.allocatedCapital ?? 0;
  const fundingCopy = getFundingCopy(data);
  const depositDisabled = moneyMovement.isPending || setupIncomplete;
  const withdrawalDisabled = moneyMovement.isPending || isAwaitingDeposit || isFundingPending || withdrawable <= 0;

  return (
    <main
      className={cn(
        theme === 'dark' && 'dark',
        'min-h-screen transition-colors',
        theme === 'dark' ? 'bg-[#10100e] text-neutral-50' : 'bg-[#f7f5ef] text-neutral-950',
      )}
    >
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-[#f7f5ef]/90 backdrop-blur dark:border-neutral-800 dark:bg-[#10100e]/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-950 dark:text-neutral-50">
            <Mark size={22} />
            Solace
          </Link>
          <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 sm:gap-4">
            <Link
              href="/dashboard"
              className="hidden text-neutral-700 transition-colors hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-neutral-50 sm:inline"
            >
              Dashboard
            </Link>
            <span className="hidden sm:inline">{data.account.label}</span>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              <span
                className={cn('mr-1.5 h-1.5 w-1.5 rounded-full', isFetching ? 'bg-amber-300' : 'bg-emerald-300')}
                aria-hidden="true"
              />
              {isFetching ? 'Syncing' : 'Live 5s'}
            </Badge>
            <Badge variant={isSimulationMode ? 'secondary' : 'success'}>{isSimulationMode ? 'Simulation' : 'Live'}</Badge>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="px-2 sm:px-3"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              aria-pressed={theme === 'dark'}
            >
              {theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
              <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="px-2 sm:px-3"
              disabled={logout.isPending}
              onClick={() => logout.mutate()}
              aria-label="Logout"
            >
              <LogOut size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
            <p className="sr-only" aria-live="polite">
              {logoutStatus}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <Button asChild variant="ghost" className="-ml-3">
              <Link href="/dashboard">
                <ArrowLeft size={16} aria-hidden="true" />
                Dashboard
              </Link>
            </Button>
            <p className="mt-4 text-sm font-medium uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
              Capital movement
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-normal text-neutral-950 dark:text-neutral-50 sm:text-5xl">
              Move capital
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-600 dark:text-neutral-400">
              Deposit capital, request withdrawals, and track where funding sits before Hermes allocation.
            </p>
          </div>
          <Card className="md:min-w-[21rem]">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="block text-sm text-neutral-500 dark:text-neutral-400">Funding status</span>
                  <strong className="mt-1 block text-xl font-semibold text-neutral-950 dark:text-neutral-50">
                    {fundingCopy.title}
                  </strong>
                </div>
                <Badge variant={fundingCopy.badge === 'ACTIVE' ? 'success' : 'secondary'}>{fundingCopy.badge}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MoneyMetric label="Portfolio Value" value={isAwaitingDeposit ? 'Pending' : formatCurrency(data.portfolio.value)} />
          <MoneyMetric label="Available Balance" value={isAwaitingDeposit ? 'Pending' : formatCurrency(availableBalance)} />
          <MoneyMetric label="In Strategy" value={isAwaitingDeposit ? '-' : formatCurrency(allocatedCapital)} />
          <MoneyMetric label="Withdrawable" tone={withdrawable > 0 ? 'green' : 'muted'} value={isAwaitingDeposit ? 'Pending' : formatCurrency(withdrawable)} />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Deposit</p>
                  <CardTitle>{isSimulationMode ? 'Add simulation capital' : 'Add capital'}</CardTitle>
                </div>
                <Badge variant={isSimulationMode ? 'secondary' : 'success'}>{isSimulationMode ? 'Sandbox' : 'Live rail'}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={handleDeposit}>
                <label htmlFor="capital-deposit-amount" className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">
                  Amount
                </label>
                <div className="grid grid-cols-[auto_1fr] overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 focus-within:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950/40 dark:focus-within:border-neutral-600">
                  <span className="grid h-12 place-items-center border-r border-neutral-200 px-4 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                    $
                  </span>
                  <input
                    id="capital-deposit-amount"
                    inputMode="decimal"
                    min="1"
                    name="depositAmount"
                    onChange={(event) => setDepositAmount(event.target.value)}
                    placeholder="1000"
                    type="text"
                    value={depositAmount}
                    className="h-12 min-w-0 bg-transparent px-4 text-lg font-semibold text-neutral-950 outline-none placeholder:text-neutral-400 dark:text-neutral-50 dark:placeholder:text-neutral-600"
                  />
                </div>
                <Button type="submit" disabled={depositDisabled} size="lg" className="w-full sm:w-auto">
                  <ArrowDownToLine size={16} aria-hidden="true" />
                  {moneyMovement.isPending ? 'Opening' : isSimulationMode ? 'Add simulated capital' : 'Deposit capital'}
                </Button>
                {setupIncomplete ? (
                  <p className="text-sm leading-6 text-neutral-500 dark:text-neutral-400">
                    Complete onboarding before deposits open.
                  </p>
                ) : (
                  <p className="text-sm leading-6 text-neutral-500 dark:text-neutral-400">
                    {isSimulationMode
                      ? 'Simulation deposits use Stripe sandbox when configured and still pass through the Solace treasury record.'
                      : 'Deposits are recorded to the ledger before treasury allocation and Hermes deployment.'}
                  </p>
                )}
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Withdraw</p>
                  <CardTitle>Request withdrawal</CardTitle>
                </div>
                <Wallet size={20} className="text-neutral-500 dark:text-neutral-400" aria-hidden="true" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
                  <span className="block text-sm text-neutral-500 dark:text-neutral-400">Currently withdrawable</span>
                  <strong className="mt-2 block text-3xl font-semibold text-neutral-950 dark:text-neutral-50">
                    {isAwaitingDeposit ? 'Pending' : formatCurrency(withdrawable)}
                  </strong>
                  {allocatedCapital > 0 ? (
                    <p className="mt-2 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
                      Capital in strategy is not counted as withdrawable until it is released.
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={withdrawalDisabled}
                  onClick={() => moneyMovement.mutate({ type: 'withdraw' })}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  <ArrowUpFromLine size={16} aria-hidden="true" />
                  Request withdrawal
                </Button>
                <p className="text-sm leading-6 text-neutral-500 dark:text-neutral-400">
                  Withdrawal requests are reviewed before funds leave Solace treasury.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Funding Status</p>
                <CardTitle>{fundingCopy.title}</CardTitle>
              </div>
              <Badge variant={fundingCopy.badge === 'ACTIVE' ? 'success' : 'secondary'}>{fundingCopy.badge}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              <FundingStep
                detail={data.portfolio.deposited > 0 ? formatCurrency(data.portfolio.deposited, { whole: true }) : 'No capital posted'}
                label={isSimulationMode ? 'Simulation capital' : 'Capital received'}
                state={data.portfolio.deposited > 0 ? 'complete' : 'pending'}
              />
              <FundingStep
                detail={
                  equityState.code === 'PENDING_SETTLEMENT'
                    ? 'Waiting for Stripe availability'
                    : equityState.code === 'TREASURY_QUEUED'
                      ? 'Treasury routing pending'
                      : data.portfolio.deposited > 0
                        ? 'Treasury state recorded'
                        : 'Begins after deposit'
                }
                label="Solace treasury"
                state={!isAwaitingDeposit && equityState.code !== 'PENDING_SETTLEMENT' && equityState.code !== 'TREASURY_QUEUED' ? 'complete' : 'pending'}
              />
              <FundingStep
                detail={equityState.code === 'LIVE_EQUITY' ? 'Live equity projection active' : 'Begins after treasury clears'}
                label="Hermes allocation"
                state={equityState.code === 'LIVE_EQUITY' ? 'complete' : 'pending'}
              />
            </div>
            <p className="mt-5 border-t border-neutral-200 pt-4 text-sm leading-6 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
              {actionStatus || fundingCopy.body}
            </p>
          </CardContent>
        </Card>

        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Live refresh every 5s. Capital movement is separated from portfolio oversight so the dashboard stays focused.
        </p>
      </div>
    </main>
  );
}
