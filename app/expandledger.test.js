const fse = require('fs-extra');

const { recalculateBalance } = require('./actions/expandledger.js');
const { updateMaster, accountBudget, modifyLedger } = require('./actions/budgetops.js');
const { getAllUpdates } = require('./actions/getbalances.js');

const dropBoxPath = 'C:/Users/Bill/Documents/Dropbox (Personal)/Swap/Budget';
const testResultPath = './app/test_results';

console.log('running tests...');

let accountList;
let budgetList;
let config;
let customLedger;

const newItem =
  [{
    budID: '51',
    type: 'Expense',
    description: 'Interest - 2EDITED',
    category: 'Home',
    fromAccount: 15,
    toAccount: 0,
    amount: 28,
    periodCount: 2,
    periodType: 'Week',
    totalCount: 0,
    transactionDate: '2016-12-30'
  },
  {
    budID: '53',
    type: 'Expense',
    description: 'Interest - 3EDITED',
    category: 'Home',
    fromAccount: 15,
    toAccount: 0,
    amount: 28,
    periodCount: 2,
    periodType: 'Week',
    totalCount: 0,
    transactionDate: '2016-12-30'
  }];

const updateTest = [
  {
    "updateRef": "td",
    "updateSequence": [
      {
        "N_PATTERN": {
          "match": "\\$(\\d*)?,?(\\d*\\.\\d{2})"
        }
      },
      {
        "N_GOTO": "https://easyweb.td.com/waw/idp/login.htm?execution=e1s1"
      },
      {
        "N_TYPE": {
          "target": "#login:AccessCard",
          "value": ""
        }
      },
      {
        "N_TYPE": {
          "target": "#login:Webpassword",
          "value": ""
        }
      },
      {
        "N_CLICK": "#login"
      }
    ]
  }
];

const testLedgerEntry =
  {
    txnID: '41-4',
    txnDate: '2017-12-08',
    Amount: -2000,
    Description: 'NEW ENTRY',
    Account: 1
  }
  ;

const testBudgetItem =
  {
    amount: 18000,
    budID: '41',
    category: 'Corp',
    description: 'Loan to Shareholder',
    fromAccount: 5,
    periodCount: 1,
    periodType: 'Month',
    toAccount: 1,
    totalCount: 0,
    transactionDate: '2017-07-12',
    type: 'Transfer'
  };

const testLedger = true;

if (testLedger) {
  fse.readJson(`${dropBoxPath}/accountList.json`)
    .then(result => {
      accountList = result.accountList;
      return 'ok';
    })
    .catch(error => console.log(error));
  fse.readJson(`${dropBoxPath}/budgetList.json`)
    .then(result => {
      budgetList = result.budgetList;
      return 'ok';
    })
    .catch(error => console.log(error));
  fse.readJson(`${dropBoxPath}/config.json`)
    .then(result => {
      config = result.config;
      return 'ok';
    })
    .catch(error => console.log(error));
  fse.readJson(`${testResultPath}/customLedger.json`)
    .then(result => {
      customLedger = result.customLedger;
      console.log('running modifyLedger');
      modifyLedger(customLedger, testLedgerEntry, './app/test_results/customLedger.json', 4, testBudgetItem, (err, data) => {
        if (err) console.error(err);
        console.log('  new custom ledger:', data);
        console.log('finished modifyLedger');
        console.log('running recalculateBalance');
        recalculateBalance(accountList, budgetList, data, accountList[1], 'CAD', [], (err2, newEntry) => {
          if (err2) console.error(err2);
          console.log('done recalculateBalance');
        });
      });


      console.log('running updateMaster');
      updateMaster(budgetList, newItem, './app/test_results/budgetList.json', (err, data) => {
        if (err) console.error(err);
        // console.log(data);
        console.log('done updateMaster');
      });

      console.log('running accountBudget');
      accountBudget(budgetList, 4, (err, data) => console.log('done accountBudget'));
      return 'ok';
    })
    .catch(error => console.log(error));

} else if (!testLedger) {
  const TEST = true;
  getAllUpdates(updatePath, accountList, TEST)
    .then((data) => {
      console.log('Test: got update data');
      fse.writeFile(`${__dirname}/dist/accountList2.json`, `{ "accountList": ${JSON.stringify(data)} }`);
      return console.log('file updated');
    })
    .catch((error) => {
      console.error(error);
      console.error('file not written');
    });
} else if (false) {

  const exec = require('child_process').exec;

  let checkAccount = true;

  //let dropBoxPath = '';



  const updateAccounts = () => new Promise((resolve, reject) => {
    exec(`node ./app/actions/updateall.js "${dropBoxPath}" "config.json"`, (err, stdout, stderr) => {
      if (err) return reject(stderr);
      return resolve('accountList');
    })
  })


  updateAccounts()
    .then(result => console.log(result))
    .catch(error => console.error(error));
}
