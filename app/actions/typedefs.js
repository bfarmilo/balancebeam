type updateSequenceItem = {
  N_EVALUATE: {
    selector: string,
    value: string,
    quantity: string,
    currency: string,
    wait: boolean | void
  }
};

export type ledgerItem = {
  txnID: string,
  txnDate: string,
  Description: string,
  Amount: number | string,
  Account: number | void,
  Custom: boolean | void,
  rate: ?number | void,
  delay: ?number | void,
  Balance: number | void
};

export type customLedgerItem = {
  txnID: string,
  txnDate: string,
  Amount: number | string,
  fromAccount: number | string,
  toAccount: number | string,
  Custom: boolean | void,
  Description: string,
  currency: string,
  delay: ?number,
  skip: boolean | void
};

export type accountItem = {
  acctID: string,
  accountName: string,
  currency: string,
  balance: number | string,
  balanceDate: string,
  includeAccount: boolean,
  accountType: string,
  rate?: number | string,
  updateRef?: string,
  updateSequence?: Array<updateSequenceItem> | void,
  statementDate: number | void
};

export type budgetItem = {
  budID: string,
  type: string,
  description: string,
  category: string,
  fromAccount: number | string,
  toAccount: number | string,
  amount: number | string,
  periodCount: number | string,
  periodType: string,
  totalCount: number | string,
  transactionDate: string,
  currency: string,
  delay?: number | string,
  rate?: number | string
};
