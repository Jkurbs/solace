import 'server-only';

import { listPersistedAccountBundles } from '@/features/accounts/store';

import { ledgerSeedData } from './seed-data';
import type {
  LedgerAccount,
  LedgerDataset,
  LedgerDeposit,
  LedgerEntry,
  LedgerReadModel,
  LedgerWithdrawal,
  PortfolioSnapshot,
  TreasuryTransfer,
} from './types';

function cloneDataset(dataset: LedgerDataset): LedgerDataset {
  return {
    users: dataset.users.map((user) => ({ ...user })),
    accounts: dataset.accounts.map((account) => ({ ...account })),
    deposits: dataset.deposits.map((deposit) => ({ ...deposit })),
    withdrawals: dataset.withdrawals.map((withdrawal) => ({ ...withdrawal })),
    entries: dataset.entries.map((entry) => ({ ...entry })),
    activities: dataset.activities.map((activity) => ({ ...activity })),
    portfolioSnapshots: dataset.portfolioSnapshots.map((snapshot) => ({
      ...snapshot,
      allocations: snapshot.allocations.map((allocation) => ({ ...allocation })),
    })),
    treasuryTransfers: dataset.treasuryTransfers.map((transfer) => ({ ...transfer })),
  };
}

function getAccountLabel(accountId: string) {
  return `Account ending ${accountId.replace(/[^a-z0-9]/gi, '').slice(-4).toUpperCase()}`;
}

async function getApprovedAccountDataset(): Promise<LedgerDataset> {
  const accountBundles = await listPersistedAccountBundles();

  return accountBundles.reduce<LedgerDataset>(
    (dataset, bundle) => {
      const accountId = bundle.ledgerAccount.id;
      const userId = bundle.user.id;

      if (!accountId || !userId || dataset.accounts.some((account) => account.id === accountId)) {
        return dataset;
      }

      const createdAt = bundle.ledgerAccount.createdAt;

      dataset.users.push({
        createdAt,
        email: bundle.user.email,
        id: userId,
        name: bundle.user.name,
        riskProfile: bundle.onboarding?.riskProfile ?? bundle.hermesAccount.riskProfile,
      });
      dataset.accounts.push({
        createdAt,
        currency: bundle.ledgerAccount.currency,
        id: accountId,
        label: bundle.ledgerAccount.label || getAccountLabel(accountId),
        status: bundle.ledgerAccount.status,
        userId,
      });
      dataset.activities.push({
        accountId,
        createdAt,
        id: `act_${accountId}_created`,
        message: 'Solace account approved',
        type: 'account_created',
      });

      return dataset;
    },
    {
      accounts: [],
      activities: [],
      deposits: [],
      entries: [],
      portfolioSnapshots: [],
      treasuryTransfers: [],
      users: [],
      withdrawals: [],
    },
  );
}

function sortByNewest<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function sumAmounts<T extends { amount: number }>(items: T[]) {
  return items.reduce((total, item) => total + item.amount, 0);
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function roundPercent(value: number) {
  return Math.round(value * 100) / 100;
}

function getPostedDeposits(deposits: LedgerDeposit[]) {
  return deposits.filter((deposit) => deposit.status === 'posted');
}

function getPaidWithdrawals(withdrawals: LedgerWithdrawal[]) {
  return withdrawals.filter((withdrawal) => withdrawal.status === 'paid');
}

function getPendingWithdrawals(withdrawals: LedgerWithdrawal[]) {
  return withdrawals.filter((withdrawal) => withdrawal.status === 'requested' || withdrawal.status === 'approved');
}

function getPostedEntries(entries: LedgerEntry[]) {
  return entries.filter((entry) => entry.status === 'posted');
}

function getLatestSnapshot(snapshots: PortfolioSnapshot[]) {
  return sortByNewest(snapshots)[0];
}

function getPriorSnapshot(snapshots: PortfolioSnapshot[], latestSnapshot: PortfolioSnapshot | undefined) {
  if (!latestSnapshot) {
    return undefined;
  }

  return sortByNewest(snapshots).find((snapshot) => snapshot.id !== latestSnapshot.id);
}

function calculateKuCoinValue({
  entries,
  transfers,
}: {
  entries: LedgerEntry[];
  transfers: TreasuryTransfer[];
}) {
  const completedTreasuryTransfers = transfers.filter(
    (transfer) => transfer.status === 'completed' || transfer.status === 'reconciled',
  );
  const postedEntries = getPostedEntries(entries);
  const postedPnl = postedEntries.filter((entry) => entry.type === 'pnl');
  const postedFees = postedEntries.filter((entry) => entry.type === 'fee');

  return roundCurrency(sumAmounts(completedTreasuryTransfers) + sumAmounts(postedPnl) - sumAmounts(postedFees));
}

function buildReadModelForAccount(dataset: LedgerDataset, account: LedgerAccount): LedgerReadModel {
  const user = dataset.users.find((candidate) => candidate.id === account.userId);

  if (!user) {
    throw new Error(`Ledger user not found for account ${account.id}.`);
  }

  const accountDeposits = dataset.deposits.filter((deposit) => deposit.accountId === account.id);
  const accountWithdrawals = dataset.withdrawals.filter((withdrawal) => withdrawal.accountId === account.id);
  const accountEntries = dataset.entries.filter((entry) => entry.accountId === account.id);
  const accountActivities = dataset.activities.filter((activity) => activity.accountId === account.id);
  const accountSnapshots = dataset.portfolioSnapshots.filter((snapshot) => snapshot.accountId === account.id);
  const accountTreasuryTransfers = dataset.treasuryTransfers.filter((transfer) => transfer.accountId === account.id);
  const latestSnapshot = getLatestSnapshot(accountSnapshots);
  const priorSnapshot = getPriorSnapshot(accountSnapshots, latestSnapshot);
  const postedDeposits = getPostedDeposits(accountDeposits);
  const paidWithdrawals = getPaidWithdrawals(accountWithdrawals);
  const pendingWithdrawals = getPendingWithdrawals(accountWithdrawals);
  const postedEntries = getPostedEntries(accountEntries);
  const postedFees = postedEntries.filter((entry) => entry.type === 'fee');
  const totalDeposited = roundCurrency(sumAmounts(postedDeposits));
  const totalWithdrawn = roundCurrency(sumAmounts(paidWithdrawals));
  const value = roundCurrency(latestSnapshot?.portfolioValue ?? totalDeposited - totalWithdrawn);
  const netProfit = roundCurrency(value + totalWithdrawn - totalDeposited);
  const pendingWithdrawalsAmount = sumAmounts(pendingWithdrawals);
  const priorValue = priorSnapshot?.portfolioValue ?? value;
  const todaysChangeAmount = roundCurrency(value - priorValue);
  const todaysChangePercentage = priorValue ? roundPercent((todaysChangeAmount / priorValue) * 100) : 0;
  const sinceInception = totalDeposited ? roundPercent((netProfit / totalDeposited) * 100) : 0;
  const kuCoinValue = calculateKuCoinValue({
    entries: accountEntries,
    transfers: accountTreasuryTransfers,
  });
  const variance = roundCurrency(kuCoinValue - value);

  return {
    generatedAt: latestSnapshot?.createdAt ?? account.createdAt,
    user,
    account,
    portfolio: {
      value,
      totalDeposited,
      totalWithdrawn,
      netProfit,
      availableToWithdraw: roundCurrency(Math.max(0, value - pendingWithdrawalsAmount)),
      accruedSolaceFees: roundCurrency(sumAmounts(postedFees)),
    },
    performance: {
      todaysChange: {
        amount: todaysChangeAmount,
        percentage: todaysChangePercentage,
      },
      sinceInception,
    },
    allocation: {
      capitalDeployed: latestSnapshot?.capitalDeployed ?? 0,
      cashReserve: latestSnapshot?.cashReserve ?? 100,
      allocations: latestSnapshot?.allocations ?? [{ asset: 'Cash', percentage: 100 }],
    },
    reconciliation: {
      ledgerAccountValue: value,
      kuCoinValue,
      variance,
      status: Math.abs(variance) < 0.01 ? 'matched' : 'needs_review',
    },
    deposits: sortByNewest(accountDeposits),
    withdrawals: sortByNewest(accountWithdrawals),
    entries: sortByNewest(accountEntries),
    activities: sortByNewest(accountActivities),
    portfolioSnapshots: sortByNewest(accountSnapshots),
    treasuryTransfers: sortByNewest(accountTreasuryTransfers),
  };
}

export async function getLedgerDataset(): Promise<LedgerDataset> {
  const dataset = cloneDataset(ledgerSeedData);
  const approvedAccounts = await getApprovedAccountDataset();

  return {
    accounts: [...dataset.accounts, ...approvedAccounts.accounts],
    activities: [...dataset.activities, ...approvedAccounts.activities],
    deposits: [...dataset.deposits, ...approvedAccounts.deposits],
    entries: [...dataset.entries, ...approvedAccounts.entries],
    portfolioSnapshots: [...dataset.portfolioSnapshots, ...approvedAccounts.portfolioSnapshots],
    treasuryTransfers: [...dataset.treasuryTransfers, ...approvedAccounts.treasuryTransfers],
    users: [...dataset.users, ...approvedAccounts.users],
    withdrawals: [...dataset.withdrawals, ...approvedAccounts.withdrawals],
  };
}

export async function getLedgerReadModel(accountId = 'acct_demo_4821'): Promise<LedgerReadModel> {
  const dataset = await getLedgerDataset();
  const account = dataset.accounts.find((candidate) => candidate.id === accountId);

  if (!account) {
    throw new Error(`Ledger account ${accountId} was not found.`);
  }

  return buildReadModelForAccount(dataset, account);
}
