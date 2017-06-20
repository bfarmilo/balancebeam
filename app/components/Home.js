import React from 'react';
import { recalculateBalance, accountBudget, updateMaster } from '../actions/expandledger';
import { accountList } from '../dist/accountList.json';
import { budgetList } from '../dist/budgetList.json';
import ChartArea from '../components/ChartArea';
import BalanceTable from '../containers/BalanceTable';
import ControlArea from '../containers/ControlArea';
import BudgetEditor from '../containers/BudgetEditor';
// import getAllUpdates from '../actions/getbalances';

// const exchangeRate = 'http://api.fixer.io/latest?symbols=CAD&base=USD';

class Main extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      account: {},
      accountIdx: 1,
      displayCurrency: 'CAD',
      data: [],
      budget: [],
      chartMode: true,
      budgetTable: budgetList,
      accountTable: accountList
    };
    this.changeAccount = this.changeAccount.bind(this);
    this.editRow = this.editRow.bind(this);
    this.updateBalance = this.updateBalance.bind(this);
    this.editBudget = this.editBudget.bind(this);
    this.updateBudget = this.updateBudget.bind(this);
  }

  componentWillMount() {
    // need to add ability to deal with pre-existing ledgers
    // read existing file first, then recalculate only on request ?
    this.changeAccount(this.state.accountIdx);
  }

  changeAccount(newAccount, refresh = false) {
    console.log('Main: received request to refresh account');
    recalculateBalance(
      this.state.accountTable,
      this.state.budgetTable,
      this.state.accountTable[newAccount],
      this.state.displayCurrency,
      (refresh ? this.state.data : []),
      (err, data) => {
        console.log(`Main.changeAccount: ${data}`);
        this.setState({
          data,
          account: this.state.accountTable[newAccount],
          accountIdx: parseInt(newAccount, 10)
        });
      });
  }

  editRow(txnID, txnDate, Description, Amount) {
    const newRecord = { txnID, txnDate, Description, Amount };
    const currentLedger = this.state.data;
    this.setState({
      data: currentLedger.splice(
        currentLedger.findIndex(x => x.txnID === newRecord.txnID),
        1,
        newRecord
      )
    });
    this.changeAccount(this.state.accountIdx, true);
    // need to write current ledger to file if it is to be restored
  }

  updateBalance() {
    /* getAllUpdates(this.state.accountTable, (err, accountTable) => {
      if (err) console.log(err);
      console.log(`Test: got update data ${accountTable}`);
      this.setState({ accountTable });
      this.changeAccount(this.state.accountIdx, true);
    }); */
  }

  editBudget() {
    if (!this.state.chartMode) {
      this.setState({ chartMode: true });
      this.changeAccount(this.state.accountIdx);
    } else {
      console.log('Main: request to edit budget for account', this.state.accountIdx, typeof (this.state.accountIdx));
      accountBudget(this.state.budgetTable, this.state.accountIdx, (e, budget) => {
        if (e) console.log('Main: Error extracting budget', e);
        this.setState({ budget, chartMode: false });
      });
    }
  }

  updateBudget(budgetRecord) {
    // make a copy of the array
    const currentBudget = this.state.budget;
    const newRecord = Object.assign({}, budgetRecord);
    let index = this.state.budget.length;
    const deleteOld = (budgetRecord.editRow !== -1);
    if (deleteOld) {
      // splice it into the middle, deleting old record
      console.log(`Main: edit budget row ${budgetRecord.budID}`);
      index = currentBudget.findIndex(x => x.budID === budgetRecord.budID);
    }
    delete newRecord.editRow;
    currentBudget.splice(index, (deleteOld ? 1 : 0), newRecord);
    updateMaster(this.state.budgetTable, currentBudget, (err, budgetTable) => {
      if (err) console.error('Main: error updating master budget table');
      this.setState({ budgetTable, budget: currentBudget });
    });
  }

  render() {
    let visibleBlocks;
    const minBalance = Math.min(...this.state.data.map((v) => v.Balance));
    if (this.state.chartMode) {
      visibleBlocks = (
        <div>
          <ChartArea data={this.state.data} />
          <BalanceTable
            currentdate={new Date()}
            balance={this.state.account.balance}
            ledger={this.state.data}
            minBalance={minBalance}
            editEntry={this.editRow}
          />
        </div>
      );
    } else {
      visibleBlocks = (
        <div>
          <BudgetEditor
            accountTable={accountList}
            budgetItems={this.state.budget}
            updateBudget={this.updateBudget}
          />
        </div>
      );
    }
    return (
      <div>
        <ControlArea
          accountTable={accountList}
          account={this.state.account}
          selectAccount={this.changeAccount}
          updateBalance={this.updateBalance}
          editBudget={this.editBudget}
        />
        {visibleBlocks}
      </div>
    );
  }
}

export default Main;
