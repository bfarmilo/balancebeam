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
updateMaster is used when budget items are edited or added. Assumes that newBudgetList
contains only items in budgetList. (new Items are not handled here)

@param budgetList:Array - the master budget list, an array of budget objects
@param newBudgetList:Array -  the updated budget list for a single account
*/
function updateMaster(budgetList, newBudgetList, callback) {
  try {
    const updatedList = budgetList
      .reduce((result, oldItem) => {
        const updated = newBudgetList.filter(newItem => (newItem.budID === oldItem.budID));
        if (updated.length > 0) {
          result.push(updated.reduce(val => val));
        } else {
          // newBudgetList doesn't contain an item that matches
          result.push(oldItem);
        }
        return result;
      }, []);
    return callback(null, updatedList);
  } catch (error) {
    return callback(error);
  }
}
/*
modifyLedger writes a modified single ledger entry into the customLedger so it will persist
@param action - 'modify', 'skip', 'clear'
@param customLedger:Array - an array of custom (user-modified) Ledger Entries
@param modifiedEntry:Object - the new ledger object to append / modify in the table
@param account:number - the account currently being viewed
@param currency:string - 'USD' or 'CAD'
@param budgetEntry - the matching parent budget entry for this transaction
*/
function modifyLedger(
  action,
  customLedger,
  modifiedEntry,
  account,
  currency,
  budgetEntry,
  callback
) {
  // merge newEntry into the customLedger
  try {
    console.log(`modifyLedger called with action ${action}`);
    let updatedLedger = [];
    const today = new Date();
    switch (action) {
      case 'modify':
        {
          let toAccount;
          let fromAccount;
          let Amount = parseFloat(modifiedEntry.Amount);
          if (Amount > 0) {
            toAccount = account;
            fromAccount =
              budgetEntry.fromAccount === account ? budgetEntry.toAccount : budgetEntry.fromAccount;
          } else {
            fromAccount = account;
            toAccount =
              budgetEntry.toAccount === account ? budgetEntry.fromAccount : budgetEntry.toAccount;
            Amount = Math.abs(Amount);
          }
          const newEntry = {
            txnID: modifiedEntry.txnID,
            Amount,
            fromAccount,
            toAccount,
            Description: modifiedEntry.Description,
            txnDate: modifiedEntry.txnDate,
            currency,
            delay: budgetEntry.delay
          };
          if (customLedger.find(item => item.txnID === newEntry.txnID)) {
            updatedLedger = customLedger.reduce((result, item) => {
              const includeDate = new Date(item.txnDate);
              // move the date threshold forward by item.delay
              // to ensure both sides remain in the custom leger until
              // the delayed date passes, or today + 1 whichever is greater
              includeDate.setUTCDate(includeDate.getUTCDate() + (item.delay ? item.delay : 1));
              console.log('customTxn, include date: %s, today date: %s', includeDate, today);
              if (item.txnID === newEntry.txnID) {
                result.push(newEntry);
              } else if (includeDate >= today) {
                result.push(item);
              }
              return result;
            }, []);
          } else {
            updatedLedger = [].concat(customLedger, [newEntry]);
          }
          return callback(null, updatedLedger);
        }
      case 'clear':
        return callback(
          null,
          customLedger.filter(item => item.txnID !== modifiedEntry.txnID)
        );
      case 'skip': {
        const skipEntry = { ...modifiedEntry };
        console.log('modifyLedger: skipping transaction ID %s', skipEntry.txnID);
        skipEntry.skip = true;
        skipEntry.fromAccount = 0;
        skipEntry.toAccount = 0;
        skipEntry.delay = 0;
        skipEntry.txnDate = today.toISOString().split('T')[0];
        // first - look to replace an existing custom entry
        if (customLedger.find(item => item.txnID === skipEntry.txnID)) {
          updatedLedger = customLedger.reduce((result, item) => {
            if (item.txnID === skipEntry.txnID) {
              result.push(skipEntry);
            } else {
              result.push(item);
            }
            return result;
          }, []);
        } else {
          // if its not there, just push the new entry into the custom ledger
          updatedLedger = [].concat(customLedger, [skipEntry]);
        }
        return callback(
          null,
          updatedLedger
        );
      }
      default:
        console.log('modifyLedger: unknown action received', action);
        throw new Error('unknown action received');
    }
  } catch (error) {
    return callback(error);
  }
}

module.exports = {
  accountBudget,
  updateMaster,
  modifyLedger
};
