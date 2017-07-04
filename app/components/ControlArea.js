import React from 'react';
import PropTypes from 'prop-types';

const ControlArea = (props) => (
  <div className="LedgerArea">
    <select name="ChooseAcct" id="accountselect" disabled={props.viewBudget} onChange={props.selectAccount}>
      {props.accountTable.reduce((result, val) => {
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
    <input type="text" disabled className="Currency" value={`as of ${props.account.balanceDate}`} />
    <button type="button" onClick={props.updateBalance}>Update</button>
    <button type="button" onClick={props.editBudget}>{props.viewBudget ? 'Save' : 'Edit Budget'}</button>
    <button type="button" onClick={props.updateLedger}>Refresh Ledger</button>
    <button type="button" onClick={props.changeCurr}>{props.viewCurr}</button>
  </div>
);

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
  updateLedger: PropTypes.func.isRequired,
  changeCurr: PropTypes.func.isRequired,
  viewCurr: PropTypes.string.isRequired
};

export default ControlArea;
