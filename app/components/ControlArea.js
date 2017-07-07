import React from 'react';
import PropTypes from 'prop-types';
import styles from './ControlArea.css';

const ControlArea = (props) => (
  <div className="LedgerArea">
    <span className={styles.customdropdown}>
      <select name="ChooseAcct" id="accountselect" disabled={props.viewBudget} onChange={props.selectAccount} value={parseInt(props.account.acctID, 10)}>
        {props.accountTable.reduce((result, val) => {
          const spaces = new Array(25 - val.accountName.length - val.balance.toString().length).join('\xa0');
          if (val.includeAccount) {
            result.push(
              <option key={val.acctID} value={val.acctID}>
                {val.accountName}{spaces}{val.balance < 0 ? '-' : ''}${Math.abs(val.balance)}
              </option>
            );
          } else if (val.balance !== 0) {
            result.push(
              <option key={val.acctID} disabled value={val.acctID}>
                {val.accountName}{spaces}{val.balance < 0 ? '-' : ''}${Math.abs(val.balance)}
              </option>
            );
          }
          return result;
        }, [])
        }
      </select>
    </span>
    <div className={styles.buttonGroup}>
      <button type="button" className={styles.toggleButton} disabled={props.viewBudget || props.viewAccount} onClick={props.updateBalance}>{props.account.balanceDate} <i className="fa fa-undo fa-fw" /></button>
      <button type="button" className={styles.toggleButton} disabled={props.viewAccount} onClick={props.editBudget}>{props.viewBudget ? 'View Chart' : 'Edit Budget'}</button>
      <button type="button" className={styles.toggleButton} disabled={props.viewBudget} onClick={props.updateLedger}>Edit Accounts</button>
      <button type="button" className={styles.toggleButton} disabled={props.viewBudget || props.viewAccount} onClick={props.changeCurr}>{props.viewCurr}</button>
    </div>
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
  viewCurr: PropTypes.string.isRequired,
  viewAccount: PropTypes.bool.isRequired
};

export default ControlArea;
