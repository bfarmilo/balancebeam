// @flow

const periodCounts = {
  Year: 1,
  Month: 12,
  Week: 52
};
const exchangeRates = {
  USD: 1.26
};

type ledgerItem = {
  txnID: string,
  txnDate: string,
  Description: string,
  Amount: number
};

const USDCAD = exchangeRates.USD;
const NUM_MONTHS = 6;

const DEBIT = 'DEBIT';
const CREDIT = 'CREDIT';
const CAD = 'CAD';
const USD = 'USD';

/*

budgetList has the following fields
    budID: a unique identifier for each transaction (string)
    fromAccount: reference to an Account
    toAccount: reference to an Account
    description: text description of the Transaction
    amount: amount per transaction
    periodCount: Number of period units between transactions
    periodType: Year, Month, Week
    totalCount: (optional) max number to expand, note need to update this after time moves forward ?
    transactionDate: Date of first transaction, note need to update this based on current day/time ?

returns a ledger (array)
    txnID: a globally unique identifier for each transaction (string)
    txnDate: transaction date (string)
    fromAccount: which account this side of the transaction is attached to (string)
    Description: description of transaction (string)
    Amount: value of the transaction, outflows are negative(number)
    Balance: calculated running balance

*/

/*
expandItem takes a budget record and expands it out based on the frequency of repitition.

@param accountList:Array - an array of Account objects
@param budgetRecord:Object - the current budget Record we are expanding
@param startDate:String - the starting date for the ledger
@param endDate:String - the ending date for the ledger
@param debitCredit:String - 'DEBIT' or 'CREDIT'

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
): Array<ledgerItem> {
  // creates a transaction ID txnID of the form 'budID-i'
  // where i is the expanded count (0 is the one matching the start date)
  const returnArray = [];
  let txnDate = '';
  let Amount = 0;
  let Account = 0;
  let Description = '';
  let txnID = '';
  let currentEntry = { txnID, txnDate, Amount, Account, Description };
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
    const MAX_ITEMS = budgetRecord.totalCount !== 0
      ? budgetRecord.totalCount
      : Math.round((NUM_MONTHS / 12) * (periodCounts[budgetRecord.periodType] + 1));
    let dateOffset = 0;
    if (!isDebit && Object.hasOwnProperty.call(budgetRecord, 'delay')) dateOffset = budgetRecord.delay;
    if (dateOffset !== 0) {
      transactionDate.setUTCDate(
        transactionDate.getUTCDate() + dateOffset
      );
    }
    for (let i = 0;
      i < (periodCounts[budgetRecord.periodType] / budgetRecord.periodCount && MAX_ITEMS);
      i += 1) {
      if (i > 0) {
        if (budgetRecord.periodType === 'Year') {
          transactionDate.setUTCFullYear(
            transactionDate.getUTCFullYear() + budgetRecord.periodCount
          );
        } else if (budgetRecord.periodType === 'Month') {
          transactionDate.setUTCMonth(
            transactionDate.getUTCMonth() + budgetRecord.periodCount
          );
        } else if (budgetRecord.periodType === 'Week') {
          transactionDate.setUTCDate(
            transactionDate.getUTCDate() + (7 * budgetRecord.periodCount)
          );
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
          Custom: false
        };
        returnArray.push(currentEntry);
      }
    }
  }// now look for matching custom transactions and replace in the ledger table
  return returnArray.reduce((result, item) => {
    const updated = customTxnList.filter(txn => txn.txnID === item.txnID);
    if (updated.length > 0) {
      isDebit = (updated[0].fromAccount === Account);
      const ledgerDate = new Date(updated[0].txnDate);
      if (Object.hasOwnProperty.call(updated[0], 'delay') && !isDebit) {
        ledgerDate.setUTCDate(ledgerDate.getUTCDate() + updated[0].delay);
      }
      const newItem = {
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
        delay: item.delay
      };
      result.push(newItem);
    } else {
      result.push(item);
    }
    return result;
  }, []);
}
/*
convertCurrency converts from the account currency
to the specified output currency

@param amount:Float - the amount to convert
@param fromCurrency:String 'CAD' or 'USD' the starting currency
@param toCurrency:String 'CAD' or 'USD' the output currency
*/
function convertCurrency(amount, fromCurrency, toCurrency) {
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
@param fromCurr:String 'CAD' or 'USD', the native currencty of the account
@param toCurr:String 'CAD' or 'USD' the output currency to calculate to
*/
function refreshBalance(ledgerList, startBalance) {
  let runningBalance = startBalance;
  return ledgerList.map(entry => {
    const result = entry;
    result.Amount = entry.Amount;
    result.Balance = Math.round((runningBalance + entry.Amount) * 100) / 100;
    runningBalance = entry.Balance;
    return result;
  });
}
/*
sortLedger sorts a ledger in place

@param ledger:Array of ledger objects
*/
function sortLedger(ledger) {
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
  accountList,
  budgetList,
  customTxnList,
  account,
  showCurrency,
  refreshData,
  callback
) {
  let startBalance = 0;
  let entryList = [];
  startBalance = convertCurrency(account.balance, account.currency, showCurrency);
  if (refreshData.length > 0) {
    const returnData = refreshBalance(refreshData, startBalance);
    // passed an array, just need to refresh balances & re-sort
    sortLedger(returnData);
    return callback(null, returnData);
  }
  expandLedger(accountList, budgetList, customTxnList, account, showCurrency, (e, data) => {
    if (e) return callback(e);
    entryList = data;
    return callback(
      null,
      refreshBalance(entryList, startBalance)
    );
  });
}
/*
ExpandLedger calls expandItem for each budget transaction
matching the currently displayed account

@param accountList:Array - an array of account Objects
@param budgetList: Array - the array of budgetList Objects
@param customTxnList: Array - the array of user-modified transactions
@param account: Object - the account object we are expanding ?
*/
function expandLedger(accountList, budgetList, customTxnList, account, showCurrency, callback) {
  const currentDate = new Date(account.balanceDate);
  const lastDate = new Date(
    currentDate.getUTCFullYear(),
    currentDate.getUTCMonth() + NUM_MONTHS,
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
    .reduce((prev, curr) => prev.concat(curr));
  sortLedger(returnLedger);
  return callback(null, returnLedger);
}

module.exports = {
  recalculateBalance,
  convertCurrency
};
