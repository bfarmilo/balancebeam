import React from 'react';
import { recalculateBalance, convertCurrency, formatCurrency } from '../actions/expandledger';
import { accountBudget, updateMaster, modifyLedger } from '../actions/budgetops';
import { makeTickVals, createTargetChart } from '../actions/calcaxis';
import ChartArea from '../components/ChartArea';
import BalanceTable from '../components/BalanceTable';
import ControlArea from '../components/ControlArea';
import BudgetEditor from '../components/BudgetEditor';
import AccountEditor from '../components/AccountEditor';

const ipcRenderer = require('electron').ipcRenderer;

const currentDate = new Date();

const NUM_MONTHS = 3;

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
  currency: 'CAD',
  delay: 0,
  rate: 0
};

const blankTxn = {
  txnID: '',
  txnDate: '',
  Amount: 0,
  Account: 0,
  Custom: false,
  Description: '',
  currency: 'CAD',
  delay: 0
};

const blankAcct = {
  acctID: '',
  accountName: '',
  currency: 'CAD',
  balance: 0,
  balanceDate: currentDate.toISOString().split('T')[0],
  includeAccount: true,
  accountType: 'loan',
  rate: 0,
  updateRef: '',
  updateSequence: [
    {
      N_EVALUATE: {
        selector: '',
        value: '',
        quantity: '-$1$2',
        currency: '$3',
        wait: false
      }
    }
  ]
};

// const exchangeRate = 'http://api.fixer.io/latest?symbols=CAD&base=USD';

class Main extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      budgetTable: [],
      budget: [],
      editBud: blankBud,
      accountTable: [],
      accountIdx: 1,
      account: {},
      editAcct: blankAcct,
      customLedgerTable: [],
      data: [],
      editTxn: blankTxn,
      chartMode: true,
      accountMode: false,
      tickValues: [],
      zeroPos: 0,
      loadingMessage: 'Loading ...',
      displayCurrency: 'CAD',
      displayBalance: 0
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
    this.editAccountRow = this.editAccountRow.bind(this);
    this.handleAccountDataChange = this.handleAccountDataChange.bind(this);
    this.viewAccounts = this.viewAccounts.bind(this);
  }

  componentWillMount() {
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
    const newBal = convertCurrency(
      account.balance || 0,
      account.currency || 'CAD',
      this.state.displayCurrency || 'CAD'
    );
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
          if (Object.hasOwnProperty.call(account, 'paymentDate')) {
            const target = createTargetChart(account, NUM_MONTHS);
            this.minBalance = Math.min(...target.map(v => v.Balance), this.minBalance);
            this.maxBalance = Math.max(...target.map(v => v.Balance), this.maxBalance);
          }
          makeTickVals(this.minBalance, this.maxBalance)
            .then(tickValues => {
              console.log(tickValues);
              const maxBal = Math.max(...tickValues, this.maxBalance);
              const minBal = Math.min(...tickValues, this.minBalance);
              this.setState({
                accountTable: aTable,
                budgetTable: bTable,
                customLedgerTable: cTable,
                account,
                displayCurrency: currency,
                data,
                tickValues,
                loadingMessage: 'ready',
                zeroPos: (maxBal > 0
                  ? maxBal / (maxBal - minBal)
                  : 0
                ),
                displayBalance: newBal
              });
              return 'OK';
            })
            .catch(error => console.error(error));
        }
      });
  }

  changeAccount(event) {
    const accountIdx = parseInt(event.currentTarget.value, 10);
    console.log('changing account to ', event.currentTarget.value);
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

  handleAccountDataChange(event) {
    const [acctID, dataType] = event.target.name.split('_');
    const editAcct = { ...this.state.editAcct };
    console.log('account change detected on', acctID, dataType);
    switch (dataType) {
      case 'paymentBal': case 'targetSpend': case 'rate': case 'balance':
        editAcct[dataType] = parseFloat(event.target.value);
        break;
      case 'paymentDate':
        editAcct[dataType] = parseInt(event.target.value, 10);
        break;
      case 'includeAccount':
        editAcct[dataType] = !(event.target.value === 'true');
        break;
      default:
        editAcct[dataType] = event.target.value;
    }
    this.setState({ editAcct });
  }

  handleLedgerChange(event) {
    const dataType = event.target.name.split('_')[1];
    const editTxn = { ...this.state.editTxn };
    switch (dataType) {
      case 'Account': case 'delay':
        editTxn[dataType] = parseInt(event.target.value, 10);
        break;
      case 'Amount': case 'rate': case 'Balance':
        editTxn[dataType] = parseFloat(event.target.value);
        break;
      default:
        editTxn[dataType] = event.target.value;
    }
    this.setState({ editTxn });
  }

  handleBudgetChange(event) {
    const [budID, dataType] = event.target.name.split('_');
    const editBud = { ...this.state.editBud };
    console.log('budget change detected on', budID, dataType);
    switch (dataType) {
      case 'amount': case 'rate':
        editBud[dataType] = parseFloat(event.target.value);
        break;
      case 'fromAccount': case 'toAccount': case 'periodCount':
      case 'totalCount': case 'delay':
        editBud[dataType] = parseInt(event.target.value, 10);
        break;
      default:
        editBud[dataType] = event.target.value;
    }
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
            this.state.displayCurrency,
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

  editAccountRow(event) {
    const [acctID, action] = event.currentTarget.name.split('_');
    console.log(`Main: got ${action} account event on ${acctID}`, event.currentTarget.name);
    if (acctID === 'new') {
      console.log('Main:got request to add new account');
      const newRecord = { ...blankAcct };
      newRecord.currency = this.state.displayCurrency;
      this.setState({ editAcct: newRecord });
    }
    switch (action) {
      case 'enable':
        console.log('found acctID', acctID);
        this.setState({
          editAcct: this.state.accountTable.find(entry => entry.acctID === acctID)
        });
        break;
      case 'modify': {
        let currentAccountTable = [];
        const newRecord = { ...this.state.editAcct };
        if (acctID === 'new') {
          console.log(`Main: adding new account record with acctID ${Math.max(...this.state.accountTable.map((v) => parseInt(v.acctID, 10))) + 1}`);
          newRecord.acctID = `${Math.max(...this.state.accountTable.map((v) => parseInt(v.acctID, 10))) + 1}`;
          currentAccountTable = this.state.accountTable.concat(newRecord);
        } else {
          currentAccountTable = this.state.accountTable.reduce((result, value) => {
            if (value.acctID === newRecord.acctID) {
              result.push(newRecord);
            } else {
              result.push(value);
            }
            return result;
          }, []);
        }
        console.log('Home-editAccountRow: updating this account list to ', currentAccountTable);
        this.setState({ accountTable: currentAccountTable, editAcct: blankAcct });
        ipcRenderer.send('writeOutput', 'accountList', currentAccountTable);
        break;
      }
      case 'clear': {
        console.log('Main: request to delete account entry', acctID);
        const currentAccountTable = this.state.accountTable.filter(val => val.acctID !== acctID);
        ipcRenderer.send('writeOutput', 'accountList', currentAccountTable);
        this.setState({ accountTable: currentAccountTable, editAcct: blankAcct });
        break;
      }
      default:
        console.log('editAccountRow: unknown command invoked', action);
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

  viewAccounts() {
    if (!this.state.accountMode) {
      this.setState({ accountMode: true, editAcct: blankAcct });
    } else {
      this.setState({ accountMode: false });
    }
  }

  render() {
    let visibleBlocks;
    const controlArea = (
      <ControlArea
        accountTable={this.state.accountTable}
        account={this.state.account}
        selectAccount={this.changeAccount}
        updateBalance={() => ipcRenderer.send('update')}
        editBudget={this.toggleShowBudget}
        viewBudget={!this.state.chartMode}
        updateLedger={this.viewAccounts} // () => ipcRenderer.send('updateLedger')
        viewCurr={this.state.displayCurrency}
        changeCurr={this.changeViewCurrency}
        viewAccount={this.state.accountMode}
        maxChars={this.state.accountTable.reduce((prev, curr) => {
          const totalLength = curr.accountName.length + formatCurrency(curr.balance).length + 3;
          if (totalLength > prev) {
            return totalLength;
          }
          return prev;
        }, 0)}
      />
    );
    const accountArea = (
      <AccountEditor
        accountTable={this.state.accountTable}
        editAcct={this.state.editAcct}
        handleDataChange={this.handleAccountDataChange}
        editEntry={this.editAccountRow}
      />
    );
    if (this.state.accountMode) {
      visibleBlocks = (
        <div>
          {controlArea}
          {accountArea}
        </div>
      );
    } else if (this.state.chartMode) {
      visibleBlocks = (
        <div >
          {controlArea}
          <ChartArea
            startBalance={{ txnDate: this.state.account.balanceDate, Balance: this.state.account.balance }}
            data={this.state.data}
            tickValues={this.state.tickValues}
            zeroPos={this.state.zeroPos}
            target={Object.hasOwnProperty.call(this.state.account, 'paymentDate') ? createTargetChart(this.state.account, NUM_MONTHS) : ''}
            showTarget={Object.hasOwnProperty.call(this.state.account, 'paymentDate')}
          />
          <BalanceTable
            balance={this.state.displayBalance}
            minBalance={this.minBalance}
            currentDate={new Date()}
            ledger={this.state.data}
            editTxn={this.state.editTxn}
            editEntry={this.editLedgerRow}
            handleDataChange={this.handleLedgerChange}
          />
        </div >
      );
    } else {
      visibleBlocks = (
        <div >
          {controlArea}
          <BudgetEditor
            accountTable={this.state.accountTable}
            accountBudget={this.state.budget}
            editEntry={this.editBudgetRow}
            editBud={this.state.editBud}
            handleDataChange={this.handleBudgetChange}
          />
        </div >
      );
    }
    return (
      <div>
        {this.state.loadingMessage !== 'ready' ? <div>{this.state.loadingMessage}</div> : visibleBlocks}
      </div>
    );
  }
}

export default Main;
