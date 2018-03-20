/** updateBalances takes new info (acctID, balance, currency) and updates the accountList object
 * 
 * @param {Array<accountList>} accounts current (old) account data from file
 * @param {Array<{acctID, balance, currency>}} updates from the page
 * @returns {Array<accountList>} updated account list
 */
const updateBalances = (accounts, updates) => {

    const BALANCE_STEP = 500; //if credit card balances jump by this amount it indicates a payment, weeds out small credits

    // accounts is the list of all accounts
    // updates is an array of {acctID, balance, currency}
    try {
      const todaysDate = new Date();
      return accounts.map(account => {
        const currentAccount = {...account};
        const check = updates.filter(item => account.acctID === item.acctID);
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

  module.exports = {
      updateBalances
  }