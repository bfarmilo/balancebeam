import React from 'react';
import PropTypes from 'prop-types';

class BudgetEditor extends React.Component {
  constructor(props) {
    const currentDate = new Date();
    super(props);
    this.state = {
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
      editRow: -1,
      addNew: false
    };
    this.editEntry = this.editEntry.bind(this);
    this.handleDataChange = this.handleDataChange.bind(this);
    this.updateEntry = this.updateEntry.bind(this);
    this.enableNew = this.enableNew.bind(this);
  }

  handleDataChange(event) {
    // need to sort by data field (name), assign state to all of them just in case
    let {
      description,
      amount,
      fromAccount,
      toAccount,
      periodCount,
      periodType,
      transactionDate
    } = this.state;
    switch (event.target.name.split('_')[1]) {
      case 'desc':
        console.log('BudgetEditor:caught description change');
        description = event.target.value;
        break;
      case 'amnt':
        amount = event.target.value;
        break;
      case 'fromAct':
        fromAccount = event.target.value;
        break;
      case 'toAct':
        toAccount = event.target.value;
        break;
      case 'count':
        periodCount = event.target.value;
        break;
      case 'type':
        periodType = event.target.value;
        break;
      case 'date':
        transactionDate = event.target.value;
        break;
      default:
    }
    this.setState({
      description,
      amount,
      fromAccount,
      toAccount,
      periodCount,
      periodType,
      transactionDate
    });
  }

  editEntry(event) {
    // load the current row into the state record to make it editable
    const row = event.target.name.split('_')[0] === 'new' ? -1 : parseInt(event.target.name.split('_')[0], 10);
    this.setState({
      editRow: row,
      budID: this.props.budgetItems[row].budID,
      description: this.props.budgetItems[row].description,
      amount: this.props.budgetItems[row].amount,
      fromAccount: this.props.budgetItems[row].fromAccount,
      toAccount: this.props.budgetItems[row].toAccount,
      periodCount: this.props.budgetItems[row].periodCount,
      periodType: this.props.budgetItems[row].periodType,
      transactionDate: this.props.budgetItems[row].transactionDate
    });
  }

  updateEntry() {
    // change out the data in the row
    const activeRecord = Object.assign({}, this.state);
    delete activeRecord.addNew;
    this.props.updateBudget(activeRecord);
    this.setState({ editRow: -1, addNew: false });
  }

  enableNew() {
    // enables a new entry box
    this.setState({ addNew: true });
  }

  render() {
    let newRow;
    if (this.state.addNew) {
      newRow = (
        <tr>
          <td><input className="EditLedger" type="text" name={'new_desc'} value={this.state.description} onChange={this.handleDataChange} /></td>
          <td><input className="EditLedger Currency input-small" type="number" name={'new_amnt'} value={this.state.amount} onChange={this.handleDataChange} /></td>
          <td><input className="EditLedger Account input-medium" type="number" name={'new_fromAct'} value={this.state.fromAccount} onChange={this.handleDataChange} /></td>
          <td><input className="EditLedger Account input-medium" type="number" name={'new_toAct'} value={this.state.toAccount} onChange={this.handleDataChange} /></td>
          <td>every</td>
          <td><input className="EditLedger input-tiny" type="number" name={'new_count'} value={this.state.periodCount} onChange={this.handleDataChange} /></td>
          <td><input className="EditLedger input-small" type="text" name={'new_type'} value={this.state.periodType} onChange={this.handleDataChange} /></td>
          <td><input className="EditLedger input-large" type="date" name={'new_date'} value={this.state.transactionDate} onChange={this.handleDataChange} /></td>
          <td className="EditBox"><button name={'new_btn'} type="button" onClick={() => this.updateEntry()}>Add</button></td>
        </tr>
      );
    } else {
      newRow = (
        <tr>
          <td className="EditBox"><button name={'new_btn'} type="button" onClick={() => this.enableNew()}>Add New Item</button></td>
          <td />
          <td />
          <td />
          <td />
          <td />
          <td />
          <td />
          <td />
        </tr>
      );
    }
    return (
      <div className="LedgerArea">
        <table className="Budget">
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount</th>
              <th>From</th>
              <th>To</th>
              <th />
              <th />
              <th />
              <th>Start</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {newRow}
            {this.props.budgetItems.map((val, idx) => {
              let discCell = <td>{val.description}</td>;
              let fromCell = <td className="Account">{this.props.accountTable[val.fromAccount].includeAccount ? this.props.accountTable[val.fromAccount].accountName : ''}</td>;
              let toCell = <td className="Account">{this.props.accountTable[val.toAccount].includeAccount ? this.props.accountTable[val.toAccount].accountName : ''}</td>;
              let perCountCell = <td>{val.periodCount}</td>;
              let perTypeCell = <td>{val.periodType}{val.periodCount > 1 ? 's' : ''}</td>;
              let dateCell = <td>{val.transactionDate}</td>;
              let amntCell = <td className="Currency">${val.amount}</td>;
              let buttonCell = <td className="EditBox">{this.state.editRow > -1 ? <button disabled>x</button> : <button id={val.budID} name={idx} type="button" onClick={(e) => this.editEntry(e)}>+</button>}</td>;
              if (this.state.editRow === idx && !this.state.addNew) {
                dateCell = <td><input className="EditLedger input-large" type="date" name={`${idx}_date`} value={this.state.transactionDate} onChange={this.handleDataChange} /></td>;
                discCell = <td><input className="EditLedger" type="text" name={`${idx}_desc`} value={this.state.description} onChange={this.handleDataChange} /></td>;
                amntCell = <td><input className="EditLedger Currency input-small" type="number" name={`${idx}_amnt`} value={this.state.amount} onChange={this.handleDataChange} /></td>;
                buttonCell = <td className="EditBox"><button name={`${idx}_btn`} type="button" onClick={() => this.updateEntry()}>OK</button></td>;
                toCell = <td><input className="EditLedger input-medium" type="number" name={`${idx}_toAct`} value={this.state.toAccount} onChange={this.handleDataChange} /></td>;
                fromCell = <td><input className="EditLedger input-medium" type="number" name={`${idx}_fromAct`} value={this.state.fromAccount} onChange={this.handleDataChange} /></td>;
                perCountCell = <td><input className="EditLedger input-tiny" type="number" name={`${idx}_count`} value={this.state.periodCount} onChange={this.handleDataChange} /></td>;
                perTypeCell = <td><input className="EditLedger input-medium" type="text" name={`${idx}_type`} value={this.state.periodType} onChange={this.handleDataChange} /></td>;
              }
              return (
                <tr key={val.budID} id={`row-${idx}`}>
                  {discCell}
                  {amntCell}
                  {fromCell}
                  {toCell}
                  <td>every</td>
                  {perCountCell}
                  {perTypeCell}
                  {dateCell}
                  {buttonCell}
                </tr>);
            })}
          </tbody>
        </table>
      </div>
    );
  }
}

BudgetEditor.propTypes = {
  accountTable: PropTypes.arrayOf(PropTypes.shape({
    acctID: PropTypes.number.isRequired,
    accountName: PropTypes.string.isRequired,
    currency: PropTypes.string.isRequired,
    balance: PropTypes.number.isRequired,
    balanceDate: PropTypes.string.isRequired,
    includeAccount: PropTypes.bool.isRequired,
    updateRef: PropTypes.string,
    updateSequence: PropTypes.arrayOf(PropTypes.shape({
      N_EVALUATE: PropTypes.shape({
        selector: PropTypes.string,
        value: PropTypes.string,
      })
    }))
  })).isRequired,
  budgetItems: PropTypes.arrayOf(PropTypes.shape({
    budID: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    fromAccount: PropTypes.number.isRequired,
    toAccount: PropTypes.number.isRequired,
    amount: PropTypes.number.isRequired,
    periodCount: PropTypes.number.isRequired,
    periodType: PropTypes.string.isRequired,
    totalCount: PropTypes.number.isRequired,
    transactionDate: PropTypes.string.isRequired
  })).isRequired,
  updateBudget: PropTypes.func.isRequired,
};

export default BudgetEditor;
