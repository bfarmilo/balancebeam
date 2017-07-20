const Nightmare = require('nightmare');
const electronPath = require('../../node_modules/electron');
// const { updatePath } = require('../dist/config.json');

/*
const N_PATTERN = 'N_PATTERN';
const N_GOTO = 'N_GOTO';
const N_TYPE = 'N_TYPE';
const N_CLICK = 'N_CLICK';
const N_EVALUAT = 'N_EVALUATE';
*/

let testMode = false;

function queueCommands(commandList) {
  return new Promise((resolve, reject) => {
    const nightmare = Nightmare({
      electronPath,
      show: testMode,
      // openDevTools: testMode
    });
    console.log(commandList);
    const evalObj = commandList[5].length > 0 ? commandList[5].reduce(val => val) : false;
    if (evalObj) {
      nightmare
        .goto(commandList[1].N_GOTO)
        .wait(commandList[4].N_CLICK)
        .type(commandList[2].N_TYPE.target, commandList[2].N_TYPE.value)
        .type(commandList[3].N_TYPE.target, commandList[3].N_TYPE.value)
        .click(commandList[4].N_CLICK)
        .then(() => {
          if (Object.prototype.hasOwnProperty.call(evalObj.action.N_EVALUATE, 'wait')) return nightmare.wait(7000);
          return nightmare;
        })
        .catch(error => {
          console.error(`Error in waiting for account ${evalObj.acctID}`);
          return reject(error);
        })
        .then(() => nightmare
          .wait(evalObj.action.N_EVALUATE.selector)
          .evaluate((pattern, items) => {
            const matchVal = new RegExp(pattern.match, 'g');
            // change to an array input
            const balances = items.map((value) => {
              const item = value.action.N_EVALUATE;
              const acctID = value.acctID;
              const balance = parseFloat(
                document.querySelector(item.selector)[item.value].replace(matchVal, item.quantity)
              );
              const currency =
                document.querySelector(item.selector)[item.value].replace(matchVal, item.currency);
              // console.log({ acctID, balance, currency });
              return ({ acctID, balance, currency });
            });
            return balances;
          }, commandList[0].N_PATTERN, commandList[5])
          .end()
        )
        .then((pageData) => {
          console.log('pageData:', pageData);
          return resolve(pageData);
        })
        .catch(error => {
          console.error(`Error getting balance for account ${evalObj.acctID}`);
          return reject(error);
        })
        .catch(error => reject(error));
    }
    return resolve({ acctID: '99', balance: 0, currency: 'CAD' });
  });
}

/*
commandList.forEach(commandRecord => {
    let commandType = Object.keys(commandRecord)[0];
    let commandArgs = commandRecord[commandType];
    console.log(
      `queueCommands: called ${JSON.stringify(commandType)} -- keys ${Object.keys(commandRecord)}`
      )
    switch (commandType) {
        case 'N_PATTERN':
            console.log(`Filtering result on ${commandArgs}`);
            break;
        case 'N_GOTO':
            console.log(`Going to ${commandArgs}`);
            nightmare
                .goto(commandArgs)
                .wait(5000)
            break;
        case 'N_TYPE':
            console.log(`Typing ${commandArgs.value} into ${commandArgs.target}`)
            nightmare
                .type(commandArgs.target, commandArgs.value);
            break;
        case 'N_CLICK':
            console.log(`Clicking on ${commandArgs}`)
            nightmare
                .wait(commandArgs)
                .click(commandArgs)
            break;
        case 'N_EVALUATE':
            console.log(
              `evaluate ${commandArgs.selector}.${commandArgs.value} for acct:${commandArgs.acctID}`
              )
            break;
    }
});
nightmare.end()
return callback(null, 'nightmare done')
*/


function updateTable(accounts, updates) {
  const todaysDate = new Date();
  console.log(
    updates
  );
  return accounts.map((account) => {
    const currentAccount = account;
    const check = updates
      .reduce((accum, current) => accum.concat(current), [])
      .filter(item => account.acctID === item.acctID);
    if (check.length > 0) {
      console.log('check value', check.reduce(value => value));
      currentAccount.balance = check.reduce(value => value).balance;
      currentAccount.currency = check.reduce(value => value).currency;
      currentAccount.balanceDate = todaysDate.toISOString().split('T')[0];
      if (Object.hasOwnProperty.call(currentAccount, 'paymentDate')
        && todaysDate.getDate() === currentAccount.paymentDate) {
        currentAccount.paymentBal = currentAccount.balance;
      }
    }
    return currentAccount;
  });
}

function getAllAccounts(sequences) {
  return Promise.all(sequences.map(queueCommands));
}

// @param: updatePath:array<object> an array of all update path references

function getAllUpdates(updatePath, accountList, isTest = false) {
  return new Promise((resolve, reject) => {
    testMode = isTest;
    const allSequences = updatePath
      .map(val => val.updateRef) // first make an array of updateRefs
      .filter(ref => accountList.map(acct => acct.updateRef).includes(ref))
      .map(acct => (
        updatePath.reduce((sequence, account) => {
          // for a given updateRef, push a new array with the global updateSequences
          let result = sequence;
          if (account.updateRef === acct) result = account.updateSequence;
          return result;
        }, '')
          .concat(// then for each matching account, add the evaluate command in a nested array
          [
            accountList.reduce((result, item) => {
              // look for an updateRef key, if present and it matches,
              // push the updateSequence and acctID
              if (Object.prototype.hasOwnProperty.call(item, 'updateRef') && item.updateRef === acct) {
                result.push({ action: item.updateSequence[0], acctID: item.acctID });
              }
              return result;
            }, [])
          ]
          )
      )
      );
    // console.log(allSequences);
    console.log('GetAllBalances: getting data for all accounts');
    getAllAccounts(allSequences)
      .then(results => resolve(updateTable(accountList, results)))
      .catch(error => {
        console.error('Error in allAccounts');
        return reject(error);
      });
  });
}

module.exports = { getAllUpdates };
