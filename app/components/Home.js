import React from 'react';
import { recalculateBalance, convertCurrency } from '../actions/expandledger';
import { accountBudget, updateMaster, modifyLedger } from '../actions/budgetops';
import { makeTickVals } from '../actions/calcaxis';
import ChartArea from '../components/ChartArea';
import BalanceTable from '../components/BalanceTable';
import ControlArea from '../components/ControlArea';
import BudgetEditor from '../components/BudgetEditor';

const ipcRenderer = require('electron').ipcRenderer;

const currentDate = new Date();

const blankBud = {
  budID: '',
  type: 'Expense',
  description: '',
  category: 'Home',
  fromAccount: 1,
  toAccount: 0,
  amount: 0,
  periodCount: 1,
  periodType: 'Month',
  totalCount: 0,
  transactionDate: currentDate.toISOString().split('T')[0],
  currency: 'CAD'
};

const blankTxn = {
  txnID: '',
  txnDate: '',
  Amount: 0,
  Account: 0,
  Custom: false,
  Description: '',
  currency: 'CAD'
};

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
      editTxn: blankTxn,
      editBud: blankBud,
      tickValues: [],
      zeroPos: 0
    };
    this.minBalance = 0;
    this.maxBalance = 0;
    this.changeAccount = this.changeAccount.bind(this);
    this.toggleShowBudget = this.toggleShowBudget.bind(this);
    this.editBudgetRow = this.editBudgetRow.bind(this);
    this.handleBudgetChange = this.handleBudgetChange.bind(this);
    this.editLedgerRow = this.editLedgerRow.bind(this);
    this.handleLedgerChange = this.handleLedgerChange.bind(this);
    this.refreshLedgerBalance = this.refreshLedgerBalance.bind(this);
    this.changeViewCurrency = this.changeViewCurrency.bind(this);
  }

  componentWillMount() {
    ipcRenderer.on('config', (e, config) => {
      console.log('Home: received new config', config);
      this.setState({ config });
    });
    ipcRenderer.on('accountList', (e, accountTable) => {
      console.log('Home: received new accountList', accountTable);
      const account = accountTable
        .find(acct => parseInt(acct.acctID, 10) === this.state.accountIdx);
      console.log('Home: resolved new account', account);
      this.setState({ accountTable, account });
    });
    ipcRenderer.on('budgetList', (e, budgetTable) => {
      console.log('Home: received new budgetList', budgetTable);
      this.setState({ budgetTable });
    });
    ipcRenderer.on('customLedger', (e, customLedgerTable) => {
      console.log('Home: received new customLedgerTable', customLedgerTable);
      this.setState({ customLedgerTable });
    });
    ipcRenderer.on('message', (e, loadingMessage) => {
      console.log(`Home: got new message ${loadingMessage}`);
      this.setState({ loadingMessage });
    });
    ipcRenderer.on('ready', () => {
      console.log('Home: got ready message');
      this.refreshLedgerBalance(
        this.state.accountTable,
        this.state.budgetTable,
        this.state.customLedgerTable,
        this.state.account,
        this.state.displayCurrency,
        this.state.data
      );
    });
  }

  refreshLedgerBalance(aTable, bTable, cTable, account, currency, oldData, refresh = false) {
    console.log('Home-refreshLedgerBalance: received request to refresh account', account);
    recalculateBalance(
      aTable,
      bTable,
      cTable,
      account,
      currency,
      (refresh ? oldData : []),
      (err, data) => {
        if (err) {
          console.error(err);
        } else {
          this.minBalance = Math.min(...data.map(v => v.Balance));
          this.maxBalance = Math.max(...data.map(v => v.Balance));
          makeTickVals(this.minBalance, this.maxBalance, 8)
            .then(tickValues => {
              this.maxBalance = Math.max(...tickValues, this.maxBalance);
              this.minBalance = Math.min(...tickValues, this.minBalance);
              this.setState({
                accountTable: aTable,
                budgetTable: bTable,
                customLedgerTable: cTable,
                account,
                displayCurrency: currency,
                data,
                tickValues,
                loadingMessage: 'ready',
                zeroPos: (this.maxBalance > 0
                  ? (this.maxBalance - 0) / (this.maxBalance - this.minBalance)
                  : 0
                )
              });
              return 'OK';
            })
            .catch(error => console.error(error));
        }
      });
  }

  changeAccount(event) {
    const accountIdx = parseInt(event.target.value, 10);
    this.setState({ loadingMessage: 'loading new account' }, () => {
      const account = this.state.accountTable
        .find(acct => parseInt(acct.acctID, 10) === accountIdx);
      this.refreshLedgerBalance(
        this.state.accountTable,
        this.state.budgetTable,
        this.state.customLedgerTable,
        account,
        account.currency,
        this.state.data
      );
      this.setState({ accountIdx });
    });
  }

  changeViewCurrency(event) {
    console.log('Main: request to change display currency to', event.target.innerHTML);
    if (this.state.displayCurrency === 'USD') {
      this.refreshLedgerBalance(
        this.state.accountTable,
        this.state.budgetTable,
        this.state.customLedgerTable,
        this.state.account,
        'CAD',
        this.state.data
      );
    } else {
      this.refreshLedgerBalance(
        this.state.accountTable,
        this.state.budgetTable,
        this.state.customLedgerTable,
        this.state.account,
        'USD',
        this.state.data
      );
    }
  }

  handleLedgerChange(event) {
    const dataType = event.target.name.split('_')[1];
    const editTxn = { ...this.state.editTxn };
    editTxn[dataType] = event.target.value;
    this.setState({ editTxn });
  }

  handleBudgetChange(event) {
    const [budID, dataType] = event.target.name.split('_');
    const editBud = { ...this.state.editBud };
    console.log('budget change detected on', budID, dataType);
    editBud[dataType] = event.target.value;
    this.setState({ editBud });
  }

  editBudgetRow(event) {
    const [budID, action] = event.currentTarget.name.split('_');
    console.log(`Main: got ${action} budget event on ${budID}`, event.currentTarget.name);
    if (budID === 'new') {
      console.log('Main:got request to add new budget entry');
      const newRecord = { ...blankBud };
      newRecord.currency = this.state.displayCurrency;
      this.setState({ editBud: newRecord });
    }
    if (action === 'enable') {
      console.log('found budID', budID);
      this.setState({
        editBud: this.state.budget.find(entry => entry.budID === budID)
      });
    }
    if (action === 'modify') {
      let currentBudget = [];
      let currentBudgetTable = [];
      const newRecord = { ...this.state.editBud };
      newRecord.amount = parseFloat(newRecord.amount);
      newRecord.fromAccount = parseInt(newRecord.fromAccount, 10);
      newRecord.toAccount = parseInt(newRecord.toAccount, 10);
      newRecord.periodCount = parseInt(newRecord.periodCount, 10);
      newRecord.currency = this.state.displayCurrency;
      if (budID === 'new') {
        console.log(`Main: adding new record with budID ${Math.max(...this.state.budgetTable.map((v) => parseInt(v.budID, 10))) + 1}`);
        newRecord.budID = `${Math.max(...this.state.budgetTable.map((v) => parseInt(v.budID, 10))) + 1}`;
        currentBudgetTable = this.state.budgetTable.concat(newRecord);
        currentBudget = this.state.budget.concat(newRecord);
      } else {
        currentBudgetTable = this.state.budgetTable;
        currentBudget = this.state.budget.reduce((result, value) => {
          if (value.budID === newRecord.budID) {
            result.push(newRecord);
          } else {
            result.push(value);
          }
          return result;
        }, []);
      }
      console.log('Home-editBudgetRow: updating this account budget to ', currentBudget);
      updateMaster(currentBudgetTable, currentBudget, (err, updatedList) => {
        if (err) {
          console.error(err);
        } else {
          this.refreshLedgerBalance(
            this.state.accountTable,
            updatedList,
            this.state.customLedgerTable,
            this.state.account,
            this.state.currency,
            this.state.data
          );
          this.setState({
            budget: currentBudget,
            editBud: blankBud
          });
          console.log('Home-editBudgetRow: writing new budget to file');
          ipcRenderer.send('writeOutput', 'budgetList', updatedList);
        }
      });
    }
    if (action === 'clear') {
      console.log('Main: request to delete budget entry'.budID);
      const currentBudgetTable = this.state.budgetTable.filter(val => val.budID !== budID);
      ipcRenderer.send('writeOutput', 'budgetList', currentBudgetTable);
      this.setState({ budgetTable: currentBudgetTable, editBud: blankBud });
    }
  }

  editLedgerRow(event) {
    const [txnID, action] = event.currentTarget.name.split('_');
    if (action === 'enable') {
      const { txnDate, Description, Amount } = this.state.data.find(entry => entry.txnID === txnID);
      this.setState({
        editTxn: {
          txnID,
          txnDate,
          Description,
          Amount,
          currency: this.state.account.currency
        }
      });
    } else {
      console.log('Home-editLedgerRow: custom ledger ', this.state.customLedgerTable);
      const budgetEntry = this.state.budgetTable
        .filter(val => txnID.split('-')[0] === val.budID)
        .reduce(val => val);
      console.log('Home-editLedgerRow: budgetEntry', budgetEntry);
      modifyLedger(
        action,
        this.state.customLedgerTable,
        this.state.editTxn,
        this.state.accountIdx,
        this.state.displayCurrency,
        budgetEntry,
        (err, customLedgerTable) => {
          if (err) {
            console.log(err);
          } else {
            ipcRenderer.send('writeOutput', 'customLedger', customLedgerTable);
            console.log('Home-editLedgerRow: received new ledger data', customLedgerTable);
            this.refreshLedgerBalance(
              this.state.accountTable,
              this.state.budgetTable,
              customLedgerTable,
              this.state.account,
              this.state.displayCurrency,
              this.state.data
            );
            this.setState({ editTxn: blankTxn });
          }
        });
    }
  }

  toggleShowBudget() {
    if (!this.state.chartMode) {
      console.log('Home-toggleShowBudget: switching to chart mode');
      this.setState({ chartMode: true, editBud: blankBud });
    } else {
      console.log('Home: request to edit budget for account', this.state.accountIdx);
      accountBudget(this.state.budgetTable, this.state.accountIdx, (e, budget) => {
        if (e) {
          console.log('Home: Error extracting budget', e);
        } else {
          this.setState({ budget, chartMode: false });
        }
      });
    }
  }

  render() {
    let visibleBlocks;
    const displayBalance = convertCurrency(
      this.state.account.balance,
      this.state.account.currency,
      this.state.displayCurrency
    );
    const controlArea = (
      <ControlArea
        accountTable={this.state.accountTable}
        account={this.state.account}
        selectAccount={this.changeAccount}
        updateBalance={() => ipcRenderer.send('update')}
        editBudget={this.toggleShowBudget}
        viewBudget={!this.state.chartMode}
        updateLedger={() => ipcRenderer.send('updateLedger')}
        viewCurr={this.state.displayCurrency}
        changeCurr={this.changeViewCurrency}
      />);
    if (this.state.chartMode) {
      visibleBlocks = (
        <div>
          <ChartArea data={this.state.data} tickValues={this.state.tickValues} zeroPos={this.state.zeroPos} />
          <BalanceTable
            balance={displayBalance}
            minBalance={this.minBalance}
            currentDate={new Date()}
            ledger={this.state.data}
            editTxn={this.state.editTxn}
            editEntry={this.editLedgerRow}
            handleDataChange={this.handleLedgerChange}
          />
        </div>
      );
    } else {
      visibleBlocks = (
        <div>
          <BudgetEditor
            accountTable={this.state.accountTable}
            accountBudget={this.state.budget}
            editEntry={this.editBudgetRow}
            editBud={this.state.editBud}
            handleDataChange={this.handleBudgetChange}
          />
        </div>
      );
    }

    return (
      <div>
        {controlArea}
        {this.state.loadingMessage !== 'ready' ? <div>{this.state.loadingMessage}</div> : visibleBlocks}
      </div>
    );
  }
}

export default Main;
