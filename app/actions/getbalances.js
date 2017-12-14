const Nightmare = require('nightmare');
const electronPath = require(`${__dirname}/../../node_modules/electron`);
// const { updatePath } = require('../dist/config.json');

const BALANCE_STEP = 500; //if credit card balances jump by this amount it indicates a payment, weeds out small credits
let testMode = false;

/*
const N_PATTERN = 'N_PATTERN';
const N_GOTO = 'N_GOTO';
const N_TYPE = 'N_TYPE';
const N_CLICK = 'N_CLICK';
const N_EVALUAT = 'N_EVALUATE';
*/

/**
 * queueCommands calls nightmare and runs through the passed command list
 * @param {Array<commands>} commandList an array of objects which correlate to nightmare commands
 * @returns {Promise => {acctID, balance, currency}} 
 */
function queueCommands(commandList) {
  return new Promise((resolve, reject) => {
    const nightmare = Nightmare({
      electronPath,
      show: testMode,
      // openDevTools: testMode
    });
    const evalObj = commandList[5].length > 0 ? commandList[5].reduce(val => val) : false;

    nightmare
      // Go to the web page from config.json
      .goto(commandList[1].N_GOTO)
      // wait for the 'login' button to appear
      .wait(commandList[4].N_CLICK)
      // enter user name (from config.json)
      .type(commandList[2].N_TYPE.target, commandList[2].N_TYPE.value)
      // enter pwd (from config.json)
      .type(commandList[3].N_TYPE.target, commandList[3].N_TYPE.value)
      // click login button (from config.json)
      .click(commandList[4].N_CLICK)
      .then(() => {
        // some accounts have a 'wait' command, specified in accountList.json
        if (Object.prototype.hasOwnProperty.call(evalObj.action.N_EVALUATE, 'wait')) return nightmare.wait(7000);
        return nightmare;
      })
      .catch(error => {
        console.error(`Error in waiting for account ${evalObj.acctID}`);
        return reject(error);
      })
      .then(() => nightmare
        .wait(evalObj.action.N_EVALUATE.selector)
        // use the evaluate sequence (from accountList.json)
        .evaluate((pattern, items) => {
          // first create the dollars, cents, and [currency] regex from config.json
          const matchVal = new RegExp(pattern.match, 'g');
          // change to an array input
          const balances = items.map((value) => {
            const item = value.action.N_EVALUATE;
            const acctID = value.acctID;
            // use the selector and value (usually innerHTML) from accountList.json
            // replace using the regex (from config.json) and the replace pattern (from accountList.json)
            // to convert into a signed Float (strip off commas and dollar signs)
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
      .then((pageData) => resolve(pageData))
      .catch(error => {
        console.error(`Error getting balance for account ${evalObj.acctID}`);
        return reject(error);
      })
      .catch(error => reject(error));
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

/**
 * 
 * @param {Array<accountList>} accounts current (old) account data from file
 * @param {Array<{acctID, balance, currency>}} updates from the page
 * @returns {Array<accountList>} updated account list
 */
function updateTable(accounts, updates) {
  // accounts is the list of all accounts
  // updates is an array of {acctID, balance, currency}
  try {
    const todaysDate = new Date();
    return accounts.map(account => {
      const currentAccount = {...account};
      const check = updates
        .reduce((accum, current) => accum.concat(current))
        .filter(item => account.acctID === item.acctID);
      if (check.length > 0) {
        console.log('\x1b[32m%s:\x1b[0m $ %d (%s)', currentAccount.accountName, check[0].balance, check[0].currency);
        const newBalance = check.reduce(value => value).balance;
        if (Object.hasOwnProperty.call(currentAccount, 'paymentBal')
          && newBalance > (currentAccount.balance + BALANCE_STEP)) {
          // if the new balance is BALANCE_STEP more than the old, likely a payment was made
          // so update paymentBal with the new balance and paymentDate
          currentAccount.paymentBal = newBalance;
          currentAccount.paymentDate = todaysDate.getUTCDate();
        }
        currentAccount.balance = newBalance;
        currentAccount.currency = check.reduce(value => value).currency;
        currentAccount.balanceDate = todaysDate.toISOString().split('T')[0];
        if (todaysDate === new Date(todaysDate.getUTCFullYear(), todaysDate.getUTCMonth(), 0)) {
          currentAccount.monthEndBal = newBalance;
        }
      }
      return currentAccount;
    });
  } catch (err) {
    throw err;
  }
}

/**
 * calls nightmare for each element of the incoming array. One element per account.
 * @param {Array<Objects>} sequences an array of nightmare commands, one per account
 * @returns {Promise => Array<{acctID, balance, currency}>} the updated account data from the web
 */
function getAllAccounts(sequences) {
  return Promise.all(sequences.map(queueCommands).map(p => p.catch(e => e)));
}

/**
 * Entry function to get updates for each account
 * 
 * @param {array<object>} updatePath an array of all update path references
 * @param {accountItem} accountList the original account list
 * @param {boolean} isTest true for test mode
 * @returns {Promise => Array<accountItem>} 
 */
function getAllUpdates(updatePath, accountList, isTest = false) {
  return new Promise((resolve, reject) => {
    testMode = isTest;
    // first, build sequences by traversing config.json, accountList.json for various data bits
    const allSequences = updatePath
      .map(val => val.updateRef) // first make an array of updateRefs
      .filter(ref => accountList
        .map(acct => (Object.hasOwnProperty.call(acct, 'updateSequence') ? acct.updateRef : 'skip'))
        .includes(ref)) // filter out any unused refs or refs with no updateSequence
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
              // look for an updateSequence key, if present and the updateRef matches,
              // push the updateSequence and acctID
              if (Object.prototype.hasOwnProperty.call(item, 'updateSequence') && item.updateRef === acct) {
                result.push({ action: item.updateSequence[0], acctID: item.acctID });
              }
              return result;
            }, [])
          ]
          )
      )
      );
    // console.log(allSequences);
    // now we have an array of nightmare-ready commands
    getAllAccounts(allSequences)
      .then(results => resolve(
        updateTable(
          accountList,
          results.filter(val => !(val instanceof Error || typeof val === 'string'))
        )
      ))
      .catch(error => {
        console.error('\x1b[30mError in allAccounts\x1b[0m');
        return reject(error);
      });
  });
}

module.exports = { getAllUpdates };
