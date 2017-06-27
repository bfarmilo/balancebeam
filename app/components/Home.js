import React from 'react';
import { recalculateBalance } from '../actions/expandledger';
import { accountBudget, updateMaster, modifyLedger } from '../actions/budgetops';
import ChartArea from '../components/ChartArea';
import BalanceTable from '../containers/BalanceTable';
import ControlArea from '../containers/ControlArea';
import BudgetEditor from '../containers/BudgetEditor';

const ipcRenderer = require('electron').ipcRenderer;

// const exchangeRate = 'http://api.fixer.io/latest?symbols=CAD&base=USD';

class Main extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      account: {},
      accountIdx: 1,
      config: {},
      displayCurrency: 'CAD',
      data: [],
      budget: [],
      chartMode: true,
      loadingMessage: 'Loading ...',
      budgetTable: [],
      accountTable: [],
      customLedgerTable: [],
      outputFile: '',
      ledgerFile: ''
    };
    this.changeAccount = this.changeAccount.bind(this);
    this.editRow = this.editRow.bind(this);
    this.updateBalance = this.updateBalance.bind(this);
    this.editBudget = this.editBudget.bind(this);
    this.updateBudget = this.updateBudget.bind(this);
  }

  componentWillMount() {
    ipcRenderer.on('dropbox', (event, path) => {
      console.log(`Home: recieved dropbox IPC call with arg ${path}`);
      this.setState({
        outputFile: `${path}\\budgetList.json`,
        ledgerFile: `${path}\\customLedger.json`
      });
    });
    ipcRenderer.on('config', (e, config) => {
      console.log('Home: received new config');
      this.setState({ config });
    });
    ipcRenderer.on('accountList', (e, accountTable) => {
      console.log('Home: received new accountList');
      this.setState({ accountTable });
    });
    ipcRenderer.on('budgetList', (e, budgetTable) => {
      console.log('Home: received new budgetList');
      this.setState({ budgetTable });
    });
    ipcRenderer.on('customLedger', (e, customLedgerTable) => {
      console.log('Home: received new customLedgerTable');
      this.setState({ customLedgerTable });
    });
    ipcRenderer.on('message', (e, loadingMessage) => {
      console.log(`Home: got new message ${loadingMessage}`);
      this.setState({ loadingMessage });
    });
    ipcRenderer.on('ready', () => {
      console.log('Home: got ready message');
      this.changeAccount(this.state.accountIdx);
      this.setState({ loadingMessage: 'ready' });
    });
  }

  changeAccount(newAccount, refresh = false) {
    const account = this.state.accountTable.find((acct) => acct.acctID === `${newAccount}`);
    console.log('Main-changeAccount: received request to refresh account', newAccount, account);
    recalculateBalance(
      this.state.accountTable,
      this.state.budgetTable,
      this.state.customLedgerTable,
      account,
      this.state.displayCurrency,
      (refresh ? this.state.data : []),
      (err, data) => {
        this.setState({
          data,
          account,
          accountIdx: parseInt(newAccount, 10)
        });
      });
  }

  editRow(txnID, txnDate, Description, Amount) {
    const newRecord = { txnID, txnDate, Description, Amount };
    console.log('Main-editRow: custom ledger ', this.state.customLedgerTable);
    modifyLedger(this.state.customLedgerTable, newRecord, this.state.ledgerFile, this.state.accountIdx, (err, data) => {
      if (err) console.log(err);
      console.log(data);
      this.setState({ customLedgerTable: data }, this.changeAccount(this.state.accountIdx));
    });
  }

  updateBalance() {
    ipcRenderer.send('update');
  }

  editBudget(accountIdx, viewBudget) {
    if (viewBudget) {
      console.log('Main-editBudget: saving budget');
      updateMaster(this.state.budgetTable, this.state.budget, this.state.outputFile, (err, budgetTable) => {
        if (err) console.error('Main: error updating master budget table');
        this.setState({ budgetTable, chartMode: true }, this.changeAccount(accountIdx));
      });
    } else {
      console.log('Main: request to edit budget for account', accountIdx, typeof (accountIdx));
      accountBudget(this.state.budgetTable, accountIdx, (e, budget) => {
        if (e) console.log('Main: Error extracting budget', e);
        this.setState({ budget, chartMode: false });
      });
    }
  }

  updateBudget(budgetRecord) {
    const newRecord = budgetRecord;
    newRecord.amount = parseFloat(budgetRecord.amount);
    delete newRecord.editRow;
    const currentBudget = this.state.budget.reduce((result, value) => {
      if (value.budID === newRecord.budID) {
        result.push(newRecord);
      } else {
        result.push(value);
      }
      return result;
    }, []);
    console.log('Main-updateBudget: updating this account budget to ', currentBudget);
    this.setState({ budget: currentBudget });
  }

  render() {
    let visibleBlocks;
    let controlArea;
    const minBalance = Math.min(...this.state.data.map((v) => v.Balance));
    if (this.state.loadingMessage !== 'ready') {
      controlArea = (
        <div />
      );
      visibleBlocks = (
        <div>
          {this.state.loadingMessage}
        </div>
      );
    } else {
      controlArea = (
        <ControlArea
          accountTable={this.state.accountTable}
          account={this.state.account}
          selectAccount={this.changeAccount}
          updateBalance={this.updateBalance}
          editBudget={this.editBudget}
          viewBudget={!this.state.chartMode}
        />);
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
              accountTable={this.state.accountTable}
              budgetItems={this.state.budget}
              updateBudget={this.updateBudget}
            />
          </div>
        );
      }
    }
    return (
      <div>
        {controlArea}
        {visibleBlocks}
      </div>
    );
  }
}

export default Main;
