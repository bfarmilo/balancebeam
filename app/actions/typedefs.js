export type updateSequenceItem = {
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
  Amount: number,
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
  balance: number,
  balanceDate: string,
  includeAccount: boolean,
  accountType: string,
  rate?: number | void,
  updateRef?: string,
  updateSequence?: Array<updateSequenceItem> | void,
  paymentDate: number | void,
  paymentBal: number | void,
  targetSpend: number | void
};

export type budgetItem = {
  budID: string,
  type: string,
  description: string,
  category: string,
  fromAccount: number,
  toAccount: number,
  amount: number,
  periodCount: number,
  periodType: string,
  totalCount: number,
  transactionDate: string,
  currency: string,
  delay?: number,
  rate?: number
};
