// @flow

import type { ledgerItem, accountItem, budgetItem, customLedgerItem } from './typedefs';

const exchangeRates = {
  USD: 1.23
};

const USDCAD = exchangeRates.USD;

const DEBIT = 'DEBIT';
const CREDIT = 'CREDIT';
const CAD = 'CAD';
const USD = 'USD';

const CustomException = (message: string) => {
  this.name = 'error';
  this.message = message;
};

/*
expandItem takes a budget record and expands it out based on the frequency of repetition.

@param accountList:Array - an array of Account objects
@param budgetRecord:Object - the current budget Record we are expanding
@param startDate:String - the starting date for the ledger
@param endDate:String - the ending date for the ledger
@param debitCredit:String - 'DEBIT' or 'CREDIT'
@param fromCurrency:String - 'CAD' or 'USD', the native currency of the account
@param toCurrency: String - 'CAD' or 'USD', the currency to be displayed

*/
function expandItem(
  accountList,
  customTxnList,
  budgetRecord,
  startDate,
  endDate,
  debitCredit,
  fromCurrency,
  toCurrency
): Array<ledgerItem | customLedgerItem> {
  // creates a transaction ID txnID of the form 'budID-i'
  // where i is the expanded count (0 is the one matching the start date)
  const returnArray = [];
  let txnDate = '';
  let Amount = 0;
  let Account = 0;
  let Description = '';
  let txnID = '';
  const rate = budgetRecord.type !== 'Interest' ? 0 : budgetRecord.rate;
  let currentEntry = { txnID, txnDate, Amount, Account, Description, rate };
  const transactionDate = new Date(budgetRecord.transactionDate);

  let isDebit = (debitCredit === DEBIT);

  const accountIdx = isDebit ? budgetRecord.fromAccount : budgetRecord.toAccount;

  const currentAccount =
    accountList
      .filter(value => (parseInt(value.acctID, 10) === accountIdx))
      .reduce(val => val);


  if (currentAccount.includeAccount) {
    // ^ future, if 'combined' mode is enabled
    Amount = convertCurrency(
      (isDebit ? -1 * budgetRecord.amount : budgetRecord.amount),
      fromCurrency,
      toCurrency
    );
    Account = parseInt(currentAccount.acctID, 10);
    Description = budgetRecord.description;
    const maxItems = budgetRecord.totalCount !== 0
      ? budgetRecord.totalCount
      : 1000;
    let dateOffset = 0;
    if (!isDebit && Object.hasOwnProperty.call(budgetRecord, 'delay')) dateOffset = budgetRecord.delay;
    if (dateOffset !== 0) {
      transactionDate.setUTCDate(
        transactionDate.getUTCDate() + dateOffset
      );
    }
    let i = 0;
    do {
      if (i > 0) {
        switch (budgetRecord.periodType) {
          case 'Year': case 'Years':
            transactionDate.setUTCFullYear(
              transactionDate.getUTCFullYear() + budgetRecord.periodCount
            );
            break;
          case 'Month': case 'Months':
            transactionDate.setUTCMonth(
              transactionDate.getUTCMonth() + budgetRecord.periodCount
            );
            break;
          case 'Week': case 'Weeks':
            transactionDate.setUTCDate(
              transactionDate.getUTCDate() + (7 * budgetRecord.periodCount)
            );
            break;
          default:
            throw new CustomException('invalid period type, expect Year, Month or Week');
        }
      }
      if (transactionDate >= startDate && transactionDate <= endDate) {
        txnID = `${budgetRecord.budID}-${i}`;
        txnDate = transactionDate.toISOString().split('T')[0];
        currentEntry = {
          txnID,
          txnDate,
          Amount,
          Account,
          Description,
          Custom: false,
          rate
        };
        returnArray.push(currentEntry);
      }
      i += 1;
    }
    while (transactionDate <= endDate && i <= maxItems);
    // now look for matching custom transactions and replace in the ledger table
    return returnArray.reduce(
      (result: Array<ledgerItem | customLedgerItem | null>, item: ledgerItem) => {
        const updated = customTxnList.filter(txn => txn.txnID === item.txnID);
        if (updated.length > 0) {
          if (Object.hasOwnProperty.call(updated[0], 'skip')) {
            return result;
          }
          isDebit = (updated[0].fromAccount === Account);
          const ledgerDate = new Date(updated[0].txnDate);
          if (Object.hasOwnProperty.call(updated[0], 'delay') && !isDebit) {
            ledgerDate.setUTCDate(ledgerDate.getUTCDate() + updated[0].delay);
          }
          const newItem: ledgerItem = {
            txnID: updated[0].txnID,
            txnDate: ledgerDate.toISOString().split('T')[0],
            Amount: convertCurrency(
              updated[0].Amount * (isDebit ? -1 : 1),
              updated[0].currency,
              toCurrency
            ),
            Account,
            Description: updated[0].Description,
            Custom: true,
            delay: item.delay,
            rate: 0
          };
          result.push(newItem);
        } else {
          result.push(item);
        }
        return result;
      }, []);
  }
}
/*
convertCurrency converts from the account currency
to the specified output currency

@param amount:Float - the amount to convert
@param fromCurrency:String 'CAD' or 'USD' the starting currency
@param toCurrency:String 'CAD' or 'USD' the output currency
*/
function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
  let convertAmount = 0;
  if (fromCurrency === toCurrency) {
    convertAmount = Math.round(amount * 100) / 100;
  } else {
    if (fromCurrency === CAD) {
      convertAmount = Math.round((amount / USDCAD) * 100) / 100;
    }
    if (fromCurrency === USD) {
      convertAmount = Math.round((amount * USDCAD) * 100) / 100;
    }
  }
  return convertAmount;
}
/*
refreshBalance recalculates the running balance of the ledger

@param ledgerList:Array of ledger objects
@param startBalance:Float the starting balance of the account

*/
function refreshBalance(ledgerList: Array<ledgerItem>, startBalance: number): Array<ledgerItem> {
  let runningBalance = startBalance;
  return ledgerList.map(entry => {
    const result = { ...entry };
    result.Amount = entry.rate !== 0 ? runningBalance * entry.rate : entry.Amount;
    result.Balance = Math.round((runningBalance + result.Amount) * 100) / 100;
    runningBalance = result.Balance;
    return result;
  });
}
/*
sortLedger sorts a ledger in place

@param ledger:Array of ledger objects
*/
function sortLedger(ledger: Array<ledgerItem>): void {
  ledger.sort((a, b) => {
    if (Date.parse(a.txnDate) === Date.parse(b.txnDate)) {
      return b.Amount - a.Amount;
    }
    return Date.parse(a.txnDate) - Date.parse(b.txnDate);
  });
}
/*
recalculateBalance wraps the balance recalculation, and can be called on
an existing ledger (refreshData <> []) or can create a ledger with balances.

@param accountList: Array of account objects
@param budgetList: Array of budget objects
@param customTxnList: Array - the array of user-modified transactions
@param account: Object (?) the account object to change
@param showCurrency: String the output currency 'CAD' or 'USD'
@param refreshData: Array for a refresh, old ledger Otherwise an empty array for a new recalculation
@param callback
*/

function recalculateBalance(
  accountList: Array<accountItem>,
  budgetList: Array<budgetItem>,
  customTxnList: Array<ledgerItem>,
  account: accountItem,
  showCurrency: string,
  refreshData: Array<ledgerItem>,
  monthsToShow: number,
  callback: (err: Error | null, data: Array<ledgerItem> | null) => void
): void {
  let startBalance = 0;
  let entryList = [];
  startBalance = convertCurrency(account.balance, account.currency, showCurrency);
  if (refreshData.length > 0) {
    const returnData = refreshBalance(refreshData, startBalance);
    // passed an array, just need to refresh balances & re-sort
    sortLedger(returnData);
    return callback(null, returnData);
  }
  expandLedger(accountList, budgetList, customTxnList, account, showCurrency, monthsToShow, (e, data) => {
    if (e) {
      return callback(e, null);
    } else if (data !== null) {
      entryList = data;
      return callback(
        null,
        refreshBalance(entryList, startBalance)
      );
    }
  });
}
/*
ExpandLedger calls expandItem for each budget transaction
matching the currently displayed account

@param accountList:Array - an array of account Objects
@param budgetList: Array - the array of budgetList Objects
@param customTxnList: Array - the array of user-modified transactions
@param account: Object - the account object we are expanding
@showCurrency:String - 'USD' or 'CAD' the currency we want to display
@monthsToShow:number - number of months to include

*/
function expandLedger(
  accountList: Array<accountItem>,
  budgetList: Array<budgetItem>,
  customTxnList: Array<customLedgerItem>,
  account: accountItem,
  showCurrency: string,
  monthsToShow: number,
  callback: (Error | null, Array<ledgerItem> | null) => void
) {
  const currentDate = new Date(account.balanceDate);
  currentDate.setUTCDate(currentDate.getUTCDate() - 1);
  const lastDate = new Date(
    currentDate.getUTCFullYear(),
    currentDate.getUTCMonth() + monthsToShow,
    currentDate.getUTCDate()
  );
  const returnLedger = budgetList
    .filter(value => (value.fromAccount === parseInt(account.acctID, 10)))
    .map(value => expandItem(
      accountList,
      customTxnList,
      value,
      currentDate,
      lastDate,
      DEBIT,
      value.currency,
      showCurrency)
    )
    .concat(
    budgetList
      .filter(value => (value.toAccount === parseInt(account.acctID, 10)))
      .map(value => expandItem(
        accountList,
        customTxnList,
        value,
        currentDate,
        lastDate,
        CREDIT,
        value.currency,
        showCurrency)
      )
    )
    .reduce((prev, curr) => prev.concat(curr), []);
  sortLedger(returnLedger);
  return callback(null, returnLedger);
}

function formatCurrency(dollars: number): string {
  return (`${dollars < 0 ? '-' : ''}$${Math.abs(dollars).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`);
}

module.exports = {
  recalculateBalance,
  convertCurrency,
  formatCurrency
};
