const { expandLedger, recalculateBalance } = require('./actions/expandledger.js');
const { accountList } = require('./dist/accountList.json');
const { budgetList } = require('./dist/budgetList.json');
// const { getAllUpdates } = require('./getbalances.js')

const USDCAD = require('./dist/config.json').exchangeRates.USD;
// simple -- give an account number. This loads the balance and give a table including a running total of the balance

/*console.log(budgetList, typeof (budgetList))

recalculateBalance(budgetList, accountList[6], "USD", [], (err, data) => {
    console.log(data)
});*/


let testAccountList = [
  {
    "acctID": "0",
    "accountName": "Expense",
    "currency": "CAD",
    "balance": 0,
    "balanceDate": "2017-06-12",
    "includeAccount": false
  },
  {
    "acctID": "1",
    "accountName": "BMO Cheq",
    "currency": "CAD",
    "balance": 20525.98,
    "balanceDate": "2017-06-12",
    "includeAccount": true,
    "updateRef": "personal",
    "updateSequence": [
      {
        "N_EVALUATE": {
          "selector": "#BankAccounts td table tr:nth-child(1) td:nth-child(4)",
          "value": "innerHTML"
        }
      }
    ]
  },
  {
    "acctID": "2",
    "accountName": "BMO Joint",
    "currency": "CAD",
    "balance": 787.51,
    "balanceDate": "2017-06-12",
    "includeAccount": true,
    "updateRef": "personal",
    "updateSequence": [
      {
        "N_EVALUATE": {
          "selector": "#BankAccounts td table tr:nth-child(2) td:nth-child(4)",
          "value": "innerHTML"
        }
      }
    ]
  },
  {
    "acctID": "3",
    "accountName": "BMO LOC",
    "currency": "CAD",
    "balance": -8241.3,
    "balanceDate": "2017-06-12",
    "includeAccount": true,
    "updateRef": "personal",
    "updateSequence": [
      {
        "N_EVALUATE": {
          "selector": "#LoansMortgages td table tr:nth-child(1) td:nth-child(4)",
          "value": "innerHTML"
        }
      }
    ]
  }];

console.log('running tests...');


recalculateBalance(accountList, budgetList, accountList[1], 'CAD', [], (err, data) => {
  console.log(data);
});

/*
getAllUpdates(accountList, (err, data) => {
  if (err) console.log(err);
  console.log(`Test: got update data`, data);
})
*/
