import React from 'react';
import PropTypes from 'prop-types';

class BalanceTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      txnID: '',
      txnDate: '',
      Description: '',
      Amount: '',
      editRow: -1,
      ledger: this.props.ledger
    };
    this.editEntry = this.editEntry.bind(this);
    this.handleAmountChange = this.handleAmountChange.bind(this);
    this.handleDateChange = this.handleDateChange.bind(this);
    this.handleDescChange = this.handleDescChange.bind(this);
    this.updateEntry = this.updateEntry.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({ ledger: nextProps.ledger });
  }

  handleDateChange(event) {
    this.setState({ txnDate: event.target.value });
  }

  handleDescChange(event) {
    this.setState({ Description: event.target.value });
  }

  handleAmountChange(event) {
    this.setState({ Amount: event.target.value });
  }

  editEntry(event) {
    // load the current row into the state record to make it editable
    const ledgerRow = parseInt(event.target.name, 10);
    const ledgerEntry = this.props.ledger.find(entry => entry.txnID === event.target.id);
    this.setState({
      editRow: ledgerRow,
      txnID: ledgerEntry.txnID,
      txnDate: ledgerEntry.txnDate,
      Description: ledgerEntry.Description,
      Amount: ledgerEntry.Amount
    });
  }

  updateEntry(event) {
    this.setState({ editRow: -1 });
    this.props.editEntry(
      this.state.txnID,
      this.state.txnDate,
      this.state.Description,
      this.state.Amount,
      event.target.id
    );
  }

  render() {
    return (
      <div className="LedgerArea">
        <table className="Ledger">
          <thead>
            <tr>
              <th />
              <th />
              <th className="MinBalance">Minimum Balance:</th>
              <th className={this.props.minBalance < 0 ? 'Negative MinBalance' : 'MinBalance'}>${this.props.minBalance < 0 ? -1 * this.props.minBalance : this.props.minBalance}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr />
            <tr>
              <td className="StartBalance">{this.props.currentdate.toISOString().split('T')[0]}</td>
              <td className="StartBalance">Starting Balance</td>
              <td />
              <td className={this.props.balance < 0 ? 'Currency Negative Total' : 'Currency StartBalance Total'}>${this.props.balance < 0 ? (-1 * this.props.balance) : this.props.balance}</td>
              <td />
            </tr>
            {this.state.ledger.map((val, idx) => {
              let dateCell = <td>{val.txnDate}</td>;
              let discCell = <td>{val.Description}</td>;
              let amntCell = <td className="Currency">{val.Amount < 0 ? `- $${(-1 * val.Amount).toFixed(2)}` : `+ $${val.Amount.toFixed(2)}`}</td>;
              let buttonCell = this.state.editRow > -1 ? <button disabled>x</button> : <button id={val.txnID} name={idx} type="button" onClick={(e) => this.editEntry(e)}>+</button>;
              let resetButton = '';
              if (this.state.editRow === idx) {
                dateCell = <td><input className="EditLedger" type="date" name={`${idx}_${val.txnID}date`} value={this.state.txnDate} onChange={this.handleDateChange} /></td>;
                discCell = <td><input className="EditLedger" type="text" name={`${idx}_${val.txnID}desc`} value={this.state.Description} onChange={this.handleDescChange} /></td>;
                amntCell = <td><input className="EditLedger Currency" type="number" name={`${idx}_${val.txnID}amnt`} value={this.state.Amount} onChange={this.handleAmountChange} /></td>;
                buttonCell = <button name={`${val.txnID}save`} id="modify" type="button" onClick={(e) => this.updateEntry(e)}><i id="modify" className="fa fa-check fa-fw" aria-hidden="true" /></button>;
                resetButton = val.Custom ? <button name={`${val.txnID}reset`} id="modify" type="button" onClick={(e) => this.updateEntry(e)}><i id="clear" className="fa fa-undo fa-fw" aria-hidden="true" /></button> : '';
              }
              return (
                <tr key={val.txnID} id={`row-${val.txnID}`} className={val.Custom ? 'Custom' : ''}>
                  {dateCell}
                  {discCell}
                  {amntCell}
                  <td className={`Currency Total ${this.state.editRow === idx ? 'EditLedger' : ''} ${val.Balance < 0 ? 'Negative' : ''}`}>${val.Balance < 0 ? (-1 * val.Balance).toFixed(2) : val.Balance.toFixed(2)}</td>
                  <td className="EditBox">
                    {buttonCell}{resetButton}
                  </td>
                </tr>);
            })}
          </tbody>
        </table>
      </div>
    );
  }
}

BalanceTable.propTypes = {
  currentdate: PropTypes.instanceOf(Date).isRequired,
  balance: PropTypes.number.isRequired,
  ledger: PropTypes.arrayOf(PropTypes.shape({
    txnID: PropTypes.string,
    txnDate: PropTypes.string,
    Amount: PropTypes.number,
    Account: PropTypes.number,
    Description: PropTypes.string
  })).isRequired,
  minBalance: PropTypes.number.isRequired,
  editEntry: PropTypes.func.isRequired
};

export default BalanceTable;
