const Nightmare = require('nightmare');
const electronPath = require('electron').remote.app.getPath('exe');
const { updatePath } = require('../dist/config.json');

/*
const N_PATTERN = 'N_PATTERN';
const N_GOTO = 'N_GOTO';
const N_TYPE = 'N_TYPE';
const N_CLICK = 'N_CLICK';
const N_EVALUAT = 'N_EVALUATE';
*/

function queueCommands(commandList, callback) {
  const NUM_OF_ACCOUNTS_TO_EXTRACT = commandList[5].length;
  if (NUM_OF_ACCOUNTS_TO_EXTRACT > 0) {
    const nightmare = Nightmare({
      electronPath,
      show: true
    });
    let results = [];
    nightmare
      .goto(commandList[1].N_GOTO)
      .wait(commandList[4].N_CLICK)
      .type(commandList[2].N_TYPE.target, commandList[2].N_TYPE.value)
      .type(commandList[3].N_TYPE.target, commandList[3].N_TYPE.value)
      .click(commandList[4].N_CLICK)
      .wait(commandList[5][0].N_EVALUATE.selector)
      .evaluate((pattern, items) => {
        const balances = [];
        const matchVal = new RegExp(pattern.match, 'g');
        // change to an array input
        items.forEach((value) => {
          const item = value.N_EVALUATE;
          const acctID = item.acctID;
          const balance = parseFloat(
            document.querySelector(item.selector).innerHTML.replace(matchVal, pattern.quantity)
          );
          const currency =
            document.querySelector(item.selector).innerHTML.replace(matchVal, pattern.currency);
          balances.push({ acctID, balance, currency });
        });
        return balances;
      }, commandList[0].N_PATTERN, commandList[5])
      .then((balances) => {
        results = balances;
        return nightmare.end();
      })
      .catch(error => {
        console.error('Search failed:', error);
      })
      .then(() => callback(null, results));
  } else {
    return callback(null);
  }

  /*
  commandList.forEach(commandRecord => {
      let commandType = Object.keys(commandRecord)[0];
      let commandArgs = commandRecord[commandType];
      console.log(`queueCommands: called with ${JSON.stringify(commandType)} -- keys ${Object.keys(commandRecord)}`)
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
              console.log(`Evaluating ${commandArgs.selector}.${commandArgs.value} for accountID ${commandArgs.acctID}`)
              break;
      }
  });
  nightmare.end()
  return callback(null, 'nightmare done')
  */
}

function updateTable(accounts, updates) {
  const todaysDate = new Date();
  const accountTable = accounts;
  updates.forEach((entry) => {
    accountTable[entry.acctID].balance = entry.balance;
    accountTable[entry.acctID].currency = entry.currency;
    accountTable[entry.acctID].balanceDate = todaysDate.toISOString().split('T')[0];
  });
  return accountTable;
}


function getAllUpdates(accountList, callback) {
  const allSequences = [];
  for (const updateType of updatePath) {
    const matchRef = Object.keys(updateType)[0];
    console.log(`GetAllBalances: looking for ${matchRef}`);
    const expandSequence = updateType[matchRef];
    expandSequence.push([].concat(
      accountList.filter(account => (
        Object.prototype.hasOwnProperty.call(account, 'updateRef') && account.updateRef === matchRef)
      ).map((account) => {
        const updated = account.updateSequence[0];
        updated[Object.keys(updated)[0]].acctID = account.acctID;
        return updated;
      })
    ));
    console.log(`GetAllBalances: getting data for ${matchRef}`);
    queueCommands(expandSequence, (err, data) => {
      if (err) return callback(err);
      // append results to array
      Array.prototype.push.apply(allSequences, data);
      if (updatePath.indexOf(updateType) === (Object.keys(updatePath).length - 1)) {
        return callback(null, updateTable(accountList, allSequences));
      }
    });
  }
}

module.exports = { getAllUpdates };
