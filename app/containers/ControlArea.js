import React from 'react';
import PropTypes from 'prop-types';

class ControlArea extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      accountBalance: this.props.account.balance,
      editMode: false
    };
    this.selectAccount = this.selectAccount.bind(this);
    this.updateBalance = this.updateBalance.bind(this);
    this.refreshBalance = this.refreshBalance.bind(this);
    this.editBudget = this.editBudget.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({ accountBalance: nextProps.account.balance, editMode: false });
  }
  // account select drop-down
  selectAccount(event) {
    this.props.selectAccount(event.target.value);
  }

  updateBalance(event) {
    this.setState({ accountBalance: event.target.value });
  }

  refreshBalance() {
    this.props.updateBalance(this.state.accountBalance);
  }

  editBudget() {
    this.setState({ editMode: true });
    this.props.editBudget(this.props.account);
  }

  render() {
    return (
      <div className="LedgerArea">
        <select name="ChooseAcct" id="accountselect" onChange={(e) => this.selectAccount(e)}>
          {this.props.accountTable.reduce((result, val, idx) => {
            if (val.includeAccount) {
              result.push(
                <option key={val.acctID} value={idx}>{val.accountName}</option>
              );
            }
            return result;
          }, [])
          }
        </select>
        <input type="number" className="Currency" value={this.state.accountBalance} onChange={(e) => this.updateBalance(e)} />
        <button type="button" onClick={() => this.refreshBalance()}>Update</button>
        <button type="button" onClick={() => this.editBudget()}>{this.state.editMode ? 'Save' : 'Edit Budget'}</button>
      </div>
    );
  }
}

ControlArea.propTypes = {
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
  account: PropTypes.shape({
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
  }).isRequired,
  selectAccount: PropTypes.func.isRequired,
  updateBalance: PropTypes.func.isRequired,
  editBudget: PropTypes.func.isRequired
};

export default ControlArea;
