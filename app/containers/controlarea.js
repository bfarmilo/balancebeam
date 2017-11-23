import React from 'react'

class ControlArea extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      accountBalance: this.props.account.balance
    }
    this.selectAccount = this.selectAccount.bind(this);
    this.updateBalance = this.updateBalance.bind(this);
    this.refreshBalance = this.refreshBalance.bind(this);
    this.editBudget = this.editBudget.bind(this);
  }

  componentWillReceiveProps (nextProps) {
    this.setState({ accountBalance: nextProps.account.balance })
  }
  // account select drop-down
  selectAccount(event) {
    this.props.selectAccount(event.target.value);
  }

  updateBalance(event) {
    this.setState({ accountBalance: event.target.value })
  }

  refreshBalance(event) {
    this.props.updateBalance(this.state.accountBalance)
  }
  
  editBudget(event) {
      if (event.target.innerHTML !== "Save") {
          event.target.innerHTML = "Save"
      } else {
          event.target.innerHTML = "Edit Budget"
      }
      
      this.props.editBudget(this.props.account)
  }

  render() {
    return (
      <div className="LedgerArea">
        <select name="ChooseAcct" id="accountselect" onChange={(e) => this.selectAccount(e)}>
          {this.props.accountTable.map((val, idx) => {
            if (!val.includeAccount) return;
            return (
              <option key={idx} value={idx}>{val.accountName}</option>
            )
          })}
        </select>
        <input type="number" className="Currency" value={this.state.accountBalance} onChange={(e) => this.updateBalance(e)}></input>
        <button type="button" onClick={(e) => this.refreshBalance(e)}>Update</button>
        <button type="button" onClick={(e) => this.editBudget(e)}>Edit Budget</button>
      </div>
    )
  }
}

export default ControlArea