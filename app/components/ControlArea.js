// @flow

import React from 'react';
import styles from './ControlArea.css';
import type { accountItem } from '../actions/typedefs';
import { formatCurrency } from '../actions/expandledger';

const ControlArea = (props: {
  accountTable: Array<accountItem>,
  account: accountItem,
  selectAccount: (() => Event),
  updateBalance: (() => Event),
  editBudget: (() => Event),
  viewBudget: boolean,
  updateLedger: (() => Event),
  changeCurr: (() => Event),
  viewCurr: string,
  viewAccount: boolean,
  maxChars: number
}) => {
  const remainingBal = (props.account.balance - props.account.paymentBal) + props.account.targetSpend;
  const creditCard = (
    <div>
      <div className={remainingBal < 0 ? `${styles.toggleButtonWarn} ${styles.toggleButton}` : `${styles.toggleButton}`} disabled={props.viewBudget || props.viewAccount}>
        Available until the {props.account.paymentDate}th: ${remainingBal.toFixed(2)}
      </div>
      <div className={styles.toggleButton} disabled={props.viewBudget || props.viewAccount}>
        Target: ${props.account.targetSpend}
      </div>
    </div>
  );
  return (
    <div className="LedgerArea">
      <span className={styles.customdropdown}>
        <select name="ChooseAcct" id="accountselect" disabled={props.viewBudget} onChange={props.selectAccount} value={parseInt(props.account.acctID, 10)}>
          {props.accountTable.reduce((result, val) => {
            const spaces = new Array(props.maxChars - val.accountName.length - formatCurrency(val.balance).length).join('\xa0');
            if (val.includeAccount) {
              result.push(
                <option key={val.acctID} value={val.acctID}>
                  {val.accountName}{spaces}{formatCurrency(val.balance)}
                </option>
              );
            } else if (val.balance !== 0) {
              result.push(
                <option key={val.acctID} disabled value={val.acctID}>
                  {val.accountName}{spaces}{formatCurrency(val.balance)}
                </option>
              );
            }
            return result;
          }, [])
          }
        </select>
      </span>
      <div className={styles.buttonGroup}>
        <button type="button" className={styles.toggleButton} disabled={!Object.hasOwnProperty.call(props.account, 'updateRef')} onClick={props.updateBalance}>{props.account.balanceDate} <i className="fa fa-external-link fa-fw" /></button>
        <button type="button" className={styles.toggleButton} disabled={props.viewAccount} onClick={props.editBudget}>{props.viewBudget ? 'View Chart' : 'Edit Budget'}</button>
        <button type="button" className={styles.toggleButton} disabled={props.viewBudget} onClick={props.updateLedger}>Edit Accounts</button>
        <button type="button" className={styles.toggleButton} disabled={props.viewBudget || props.viewAccount} onClick={props.changeCurr}>{props.viewCurr}</button>
        {props.account.accountType === 'liability' ? creditCard : ''}
      </div>
    </div>
  );
};

export default ControlArea;
