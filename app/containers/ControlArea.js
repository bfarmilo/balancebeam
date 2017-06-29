import React from 'react';
import PropTypes from 'prop-types';

class ControlArea extends React.Component {
  constructor(props) {
    super(props);
    this.selectAccount = this.selectAccount.bind(this);
    this.refreshBalance = this.refreshBalance.bind(this);
    this.editBudget = this.editBudget.bind(this);
    this.updateLedger = this.updateLedger.bind(this);
  }

  // account select drop-down
  selectAccount(event) {
    this.props.selectAccount(event.target.value);
  }

  updateLedger() {
    this.props.updateLedger();
  }

  refreshBalance() {
    this.props.updateBalance();
  }

  editBudget() {
    this.props.editBudget(parseInt(this.props.account.acctID, 10), this.props.viewBudget);
  }

  render() {
    return (
      <div className="LedgerArea">
        <select name="ChooseAcct" id="accountselect" disabled={this.props.viewBudget} onChange={(e) => this.selectAccount(e)}>
          {this.props.accountTable.reduce((result, val) => {
            if (val.includeAccount) {
              result.push(
                <option key={val.acctID} value={val.acctID}>
                  {val.accountName}: $ {val.balance}
                </option>
              );
            } else if (val.balance !== 0) {
              result.push(
                <option key={val.acctID} disabled value={parseInt(val.acctID, 10)}>
                  {val.accountName}: $ {val.balance}
                </option>
              );
            }
            return result;
          }, [])
          }
        </select>
        <input type="number" disabled className="Currency" value={this.props.account.balance} />
        <button type="button" onClick={() => this.refreshBalance()}>Update</button>
        <button type="button" onClick={() => this.editBudget()}>{this.props.viewBudget ? 'Save' : 'Edit Budget'}</button>
        <button type="button" onClick={() => this.updateLedger()}>Refresh Ledger</button>
      </div>
    );
  }
}

ControlArea.propTypes = {
  accountTable: PropTypes.arrayOf(PropTypes.shape({
    acctID: PropTypes.string,
    accountName: PropTypes.string,
    currency: PropTypes.string,
    balance: PropTypes.number,
    balanceDate: PropTypes.string,
    includeAccount: PropTypes.bool,
    updateRef: PropTypes.string,
    updateSequence: PropTypes.arrayOf(PropTypes.shape({
      N_EVALUATE: PropTypes.shape({
        selector: PropTypes.string,
        value: PropTypes.string,
      })
    }))
  })).isRequired,
  account: PropTypes.shape({
    acctID: PropTypes.string.isRequired,
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
  }).isRequired,
  selectAccount: PropTypes.func.isRequired,
  updateBalance: PropTypes.func.isRequired,
  editBudget: PropTypes.func.isRequired,
  viewBudget: PropTypes.bool.isRequired,
  updateLedger: PropTypes.func.isRequired
};

export default ControlArea;
