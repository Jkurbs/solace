import type { LedgerEntry, MoneyMovementRecords } from './types';

export type LiveLedgerOverview = {
  balance: number;
  netProfit: number;
  reconciliationStatus: 'Matched' | 'Review';
  totalDeposited: number;
};

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function getSignedLedgerEntryAmount(entry: LedgerEntry) {
  switch (entry.type) {
    case 'fee':
    case 'withdrawal':
      return -entry.amount;
    case 'deposit':
    case 'manual_adjustment':
    case 'pnl':
      return entry.amount;
    default:
      return 0;
  }
}

export function getLiveLedgerOverview(moneyMovement: MoneyMovementRecords): LiveLedgerOverview {
  const postedDeposits = moneyMovement.deposits.filter((deposit) => deposit.status === 'posted');
  const postedEntries = moneyMovement.entries.filter((entry) => entry.status === 'posted');
  const totalDeposited = roundCurrency(postedDeposits.reduce((total, deposit) => total + deposit.amount, 0));
  const entryBalance = roundCurrency(postedEntries.reduce((total, entry) => total + getSignedLedgerEntryAmount(entry), 0));
  const depositEntriesTotal = roundCurrency(
    postedEntries
      .filter((entry) => entry.type === 'deposit')
      .reduce((total, entry) => total + entry.amount, 0),
  );
  const balance = postedEntries.length ? entryBalance : totalDeposited;
  const netProfit = roundCurrency(balance - totalDeposited);
  const isMatched = Math.abs(depositEntriesTotal - totalDeposited) < 0.01;

  return {
    balance,
    netProfit,
    reconciliationStatus: moneyMovement.available && isMatched ? 'Matched' : 'Review',
    totalDeposited,
  };
}
