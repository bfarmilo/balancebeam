import React from 'react';
import { recalculateBalance } from '../actions/expandledger';
import { accountBudget, updateMaster, modifyLedger } from '../actions/budgetops';
import ChartArea from '../components/ChartArea';
import BalanceTable from '../components/BalanceTable';
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
      editTxn: { txnID: '', txnDate: '', Amount: 0, Account: 0, Custom: false, Description: '' }
    };
    this.changeAccount = this.changeAccount.bind(this);
    this.editRow = this.editRow.bind(this);
    this.editBudget = this.editBudget.bind(this);
    this.updateBudget = this.updateBudget.bind(this);
    this.updateBalance = this.updateBalance.bind(this);
    this.updateLedger = this.updateLedger.bind(this);
    this.handleLedgerChange = this.handleLedgerChange.bind(this);
  }

  componentWillMount() {
    ipcRenderer.on('dropbox', (event, path) => {
      console.log(`Home: recieved dropbox IPC call with arg ${path}`);
      this.setState({
        outputFile: `${path}\\budgetList.json`
      });
    });
    ipcRenderer.on('config', (e, config) => {
      console.log('Home: received new config', config);
      this.setState({ config });
    });
    ipcRenderer.on('accountList', (e, accountTable) => {
      console.log('Home: received new accountList', accountTable);
      this.setState({ accountTable });
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
      this.setState({ loadingMessage: 'ready' }, this.changeAccount(this.state.accountIdx));
    });
  }

  changeAccount(newAccount, refresh = false) {
    const accountIdx = parseInt(newAccount, 10);
    const account = this.state.accountTable.find(acct => parseInt(acct.acctID, 10) === accountIdx);
    console.log('Home-changeAccount: received request to refresh account', newAccount, account);
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
          accountIdx
        });
      });
  }

  handleLedgerChange(event) {
    // This updates the active edited ledger
    // need a state for the currently edited ledger
    const dataType = event.target.name.split('_')[1];
    console.log('testing', { [dataType]: event.target.value });
    console.log('Handling data change with type', dataType, event.target.value);
    const newRecord = Object.assign({}, this.state.editTxn);
    newRecord[dataType] = event.target.value;
    this.setState({ editTxn: newRecord });

    /* const updatedLedger = this.state.data.reduce((result, v) => {
       if (v.txnID === this.state.editTxn.txnID) {
         const newRecord = {
           txnID: v.txnID,
           txnDate: v.txnDate,
           Amount: v.Amount,
           Description: v.Description,
           Account: v.Account,
         };
         newRecord[dataType] = event.target.value;
         result.push(newRecord);
       } else {
         result.push(v);
       }
       return result;
     }, []);
    this.setState({ data: updatedLedger });
    */
  }

  editRow(event) {
    const [txnID, action] = event.currentTarget.name.split('_');
    if (action === 'enable') {
      const { txnDate, Description, Amount } = this.state.data.find(entry => entry.txnID === txnID);
      this.setState({ editTxn: { txnID, txnDate, Description, Amount } });
    } else {
      console.log('Home-editRow: custom ledger ', this.state.customLedgerTable);
      const budgetEntry = this.state.budgetTable
        .filter(val => txnID.split('-')[0] === val.budID)
        .reduce(val => val);
      console.log('Home-editRow: budgetEntry', budgetEntry);
      modifyLedger(
        action,
        this.state.customLedgerTable,
        this.state.editTxn,
        this.state.accountIdx,
        budgetEntry,
        (err, customLedgerTable) => {
          if (err) {
            console.log(err);
          } else {
            ipcRenderer.send('writeOutput', 'customLedger', customLedgerTable);
            console.log('Home-editRow: received new ledger data', customLedgerTable);
            recalculateBalance(
              this.state.accountTable,
              this.state.budgetTable,
              this.state.customLedgerTable,
              this.state.account,
              this.state.displayCurrency,
              [],
              (error, data) => {
                if (error) {
                  console.error('Error recalculating Balance', error);
                } else {
                  this.setState({
                    data,
                    customLedgerTable,
                    editTxn: { txnID: '', txnDate: '', Amount: 0, Account: 0, Custom: false, Description: '' }
                  });
                }
              });
          }
        }
      );
    }
  }

  editBudget(accountIdx, viewBudget) {
    if (viewBudget) {
      console.log('Home-editBudget: saving budget');
      updateMaster(
        this.state.budgetTable,
        this.state.budget,
        (err, budgetTable) => {
          if (err) {
            console.error('Home: error updating master budget table');
          } else {
            ipcRenderer.send('writeOutput', 'budgetList', budgetTable);
            this.setState({ budgetTable, chartMode: true }, this.changeAccount(accountIdx));
          }
        }
      );
    } else {
      console.log('Home: request to edit budget for account', accountIdx, typeof (accountIdx));
      accountBudget(this.state.budgetTable, accountIdx, (e, budget) => {
        if (e) {
          console.log('Home: Error extracting budget', e);
        } else {
          this.setState({ budget, chartMode: false });
        }
      });
    }
  }

  updateBalance() {
    ipcRenderer.send('update');
    recalculateBalance(
      this.state.accountTable,
      this.state.budgetTable,
      this.state.customLedgerTable,
      this.state.account,
      this.state.displayCurrency,
      [],
      (error, data) => {
        if (error) {
          console.error('Error recalculating Balance', error);
        } else {
          this.setState({ data });
        }
      });
  }

  updateLedger() {
    ipcRenderer.send('updateLedger');
    recalculateBalance(
      this.state.accountTable,
      this.state.budgetTable,
      this.state.customLedgerTable,
      this.state.account,
      this.state.displayCurrency,
      [],
      (error, data) => {
        if (error) {
          console.error('Error recalculating Balance', error);
        } else {
          this.setState({
            data
          });
        }
      });
  }

  updateBudget(budgetRecord) {
    const newRecord = {
      budID: budgetRecord.budID,
      type: budgetRecord.type,
      description: budgetRecord.description,
      category: budgetRecord.category,
      amount: parseFloat(budgetRecord.amount),
      fromAccount: parseInt(budgetRecord.fromAccount, 10),
      toAccount: parseInt(budgetRecord.toAccount, 10),
      periodCount: parseInt(budgetRecord.periodCount, 10),
      periodType: budgetRecord.periodType,
      totalCount: parseInt(budgetRecord.totalCount, 10),
      transactionDate: budgetRecord.transactionDate
    };
    const currentBudget = this.state.budget.reduce((result, value) => {
      if (value.budID === newRecord.budID) {
        result.push(newRecord);
      } else {
        result.push(value);
      }
      return result;
    }, []);
    console.log('Home-updateBudget: updating this account budget to ', currentBudget);
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
          updateLedger={this.updateLedger}
        />);
      if (this.state.chartMode) {
        visibleBlocks = (
          <div>
            <ChartArea data={this.state.data} />
            <BalanceTable
              balance={this.state.account.balance}
              minBalance={minBalance}
              currentDate={new Date()}
              ledger={this.state.data}
              editTxn={this.state.editTxn}
              editEntry={this.editRow}
              handleDataChange={this.handleLedgerChange}
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
