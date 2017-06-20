const { periodCounts, exchangeRates } = require('../dist/config.json');

const USDCAD = exchangeRates.USD;
const NUM_MONTHS = 6;

const DEBIT = 'DEBIT';
const CREDIT = 'CREDIT';
const CAD = 'CAD';
const USD = 'USD';

let idGenerator = 0;
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
    txnID: a unique identifier for each transaction (string)
    txnDate: transaction date (string)
    Account: which account this side of the transaction is attached to (string)
    Description: description of transaction (string)
    Amount: value of the transaction, outflows are negative(number)
    Balance: calculated running balance

*/

function expandItem(accountList, accountIdx, record, startDate, endDate, debitCredit) {
  const returnArray = [];
  let txnDate = '';
  let Amount = 0;
  let Account = '';
  let Description = '';
  let txnID = '';
  let currentEntry = { txnID, txnDate, Amount, Account, Description };
  const transactionDate = new Date(record.transactionDate);

  const isDebit = (debitCredit === DEBIT);

  if (accountList[accountIdx].includeAccount) {
    // ^ future, if 'combined' mode is enabled
    Amount = (isDebit ? -1 * record.amount : record.amount);
    Account = (isDebit ?
      accountList[record.fromAccount].accountName :
      accountList[record.toAccount].accountName);
    Description = record.description;
    for (let i = 0; i < (periodCounts[record.periodType] / record.periodCount); i += 1) {
      if (i > 0) {
        if (record.periodType === 'Year') {
          transactionDate.setUTCFullYear(transactionDate.getUTCFullYear() + record.periodCount);
        } else if (record.periodType === 'Month') {
          transactionDate.setUTCMonth(transactionDate.getUTCMonth() + record.periodCount);
        } else if (record.periodType === 'Week') {
          transactionDate.setUTCDate(transactionDate.getUTCDate() + (7 * record.periodCount));
        }
      }
      if (transactionDate >= startDate && transactionDate <= endDate) {
        txnID = `${accountIdx}-${idGenerator}`;
        txnDate = transactionDate.toISOString().split('T')[0];
        currentEntry = { txnID, txnDate, Amount, Account, Description };
        idGenerator += 1;
        returnArray.push(currentEntry);
      }
    }
    return returnArray;
  }
  return returnArray;
}

function convertCurrency(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return Math.round(amount * 100) / 100;
  if (fromCurrency === CAD) {
    return Math.round((amount / (toCurrency === USD ? USDCAD : 1)) * 100) / 100;
  }
  if (fromCurrency === USD) {
    return Math.round(amount * (toCurrency === USD ? USDCAD : 1) * 100) / 100;
  }
  return 0;
}

function refreshBalance(ledgerList, startBalance, fromCurr, toCurr) {
  let runningBalance = startBalance;
  for (const entry of ledgerList) {
    entry.Amount = convertCurrency(entry.Amount, fromCurr, toCurr);
    entry.Balance = Math.round((runningBalance + entry.Amount) * 100) / 100;
    runningBalance = entry.Balance;
    if (ledgerList[ledgerList.length - 1] === entry) {
      return ledgerList;
    }
  }
}

function sortLedger(ledger) {
  ledger.sort((a, b) => {
    if (Date.parse(a.txnDate) === Date.parse(b.txnDate)) {
      return b.Amount - a.Amount;
    }
    return Date.parse(a.txnDate) - Date.parse(b.txnDate);
  });
}

function recalculateBalance(acctList, budget, account, showCurrency, refreshData, callback) {
  idGenerator = 0;
  let startBalance = 0;
  let entryList = [];
  startBalance = convertCurrency(account.balance, account.currency, showCurrency);
  if (refreshData.length > 0) {
    const returnData = refreshBalance(refreshData, startBalance, account.currency, showCurrency);
    // passed an array, just need to refresh balances & re-sort
    sortLedger(returnData);
    return callback(null, returnData);
  }
  expandLedger(acctList, budget, account, (e, data) => {
    if (e) return callback(e);
    entryList = data;
    return callback(
      null,
      refreshBalance(entryList, startBalance, account.currency, showCurrency
      ));
  });
}

function expandLedger(acctList, budgetList, account, callback) {
  // try {
  const returnLedger = [];
  const currentDate = new Date(account.balanceDate);
  const lastDate = new Date(
    currentDate.getUTCFullYear(),
    currentDate.getUTCMonth() + NUM_MONTHS,
    currentDate.getUTCDate()
  );
  budgetList.forEach((value, index) => {
    if (value.fromAccount === acctList.indexOf(account)) {
      Array.prototype.push.apply(
        returnLedger,
        expandItem(acctList, value.fromAccount, value, currentDate, lastDate, DEBIT)
      );
    } else if (value.toAccount === acctList.indexOf(account)) {
      Array.prototype.push.apply(
        returnLedger,
        expandItem(acctList, value.toAccount, value, currentDate, lastDate, CREDIT)
      );
    }
    if (index === budgetList.length - 1) {
      sortLedger(returnLedger);
      return callback(null, returnLedger);
    }
  });
  /*
  } catch (error) {
      return callback(error);
    }
    */
}

function accountBudget(budgetList, accountIndex, callback) {
  try {
    const returnBudget = [];
    budgetList.forEach((value, index) => {
      const currentEntry = value;
      if (value.fromAccount === accountIndex || value.toAccount === accountIndex) {
        returnBudget.push(currentEntry);
      }
      if (index === budgetList.length - 1) {
        return callback(null, returnBudget);
      }
    });
  } catch (error) {
    return callback(error);
  }
}

function updateMaster(budgetList, newBudgetItems, callback) {
  try {
    // merges newBudgetItems into the budgetlist and returns a budgetlist
    newBudgetItems.forEach((value) => {
      const existsPos = budgetList.findIndex((v) => v.budID === value.budID);
      if (existsPos !== -1) {
        budgetList.splice(existsPos, 1, value);
      } else {
        budgetList.push(value);
      }
    });
    return callback(null, budgetList);
  } catch (error) {
    return callback(error);
  }
}

module.exports = {
  recalculateBalance,
  accountBudget,
  updateMaster
};
