const fse = require('fs-extra');

/*
accountBudget is a helper function that filters the overall budget list
on a given account Index.

@param budgetList: Array -the master budget list
@param acctID:Integer the account ID
@param callback
*/
function accountBudget(budgetList, acctID, callback) {
  try {
    return callback(
      null,
      budgetList.filter(value =>
        (value.fromAccount === acctID || value.toAccount === acctID)
      )
    );
  } catch (error) {
    return callback(error);
  }
}
/*
updateMaster is used when budget items are edited or added

@param budgetList:Array - the master budget list, an array of budget objects
@param newBudgetList:Array -  the updated budget list
@param outputFile:String - the location of where to save the budgetlist on disk
*/
function updateMaster(budgetList, newBudgetList, outputFile, callback) {
  try {
    const updatedList = budgetList
      .reduce((result, oldItem) => {
        const updated = newBudgetList.filter(newItem => (newItem.budID === oldItem.budID));
        if (updated.length > 0) {
          result.push(updated.reduce(val => val));
        } else {
          result.push(oldItem);
        }
        return result;
      }, []);
    fse.writeFile(outputFile, `{ "budgetList": ${JSON.stringify(updatedList)} }`, err => {
      if (err) console.error(err);
    });
    return callback(null, updatedList);
  } catch (error) {
    return callback(error);
  }
}
/*
customLedger writes a modified single ledger entry into the customLedger so it will persist
@param customLedger:Array - an array of custom (user-modified) Ledger Entries
@param newEntry:Object - the new ledger object to append / modify in the table
@param outputFile:String - the path to the customLedger.json file
*/
function modifyLedger(customLedger, modifiedEntry, outputFile, account, callback) {
  // merge newEntry into the customLedger
  try {
    let updatedLedger = [];
    const newEntry = modifiedEntry;
    newEntry.Account = parseInt(account, 10);
    console.log(customLedger);
    if (customLedger.find(item => item.txnID === newEntry.txnID)) {
      updatedLedger = customLedger.reduce((result, item) => {
        if (item.txnID === newEntry.txnID) {
          // maybe this txnID was from a different account before. If so, flip the sign
          newEntry.Amount *= (item.Account === newEntry.Account ? 1 : -1);
          console.log('found entry with txnID', item.txnID, item, newEntry);
          result.push(newEntry);
        } else {
          result.push(item);
        }
        return result;
      }, []);
    } else {
      updatedLedger = [].concat(customLedger, [newEntry]);
    }
    fse.writeFile(outputFile, `{ "customLedger": ${JSON.stringify(updatedLedger)}}`, err => {
      if (err) console.error(err);
    });
    return callback(null, updatedLedger);
  } catch (error) {
    return callback(error);
  }
}

module.exports = {
  accountBudget,
  updateMaster,
  modifyLedger
};
