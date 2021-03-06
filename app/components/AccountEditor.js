// @flow

import React from 'react';
import type { accountItem } from '../actions/typedefs';
import { formatCurrency } from '../actions/expandledger';

// TODO:
// 1. Get rid of plus button and make any field clickable to edit

const AccountEditor = (props: {
  accountTable: Array<accountItem>,
  editAcct: accountItem,
  handleDataChange: (() => Event),
  editEntry: (() => Event)
}) => {
  const advancedRow = (acctID: string) => (
    <tr>
      <td>Spend Target:</td>
      <td><input className="EditLedger input-large" type="text" name={`${acctID}_targetSpend`} value={props.editAcct.targetSpend} onChange={props.handleDataChange} /></td>
      <td>Payment Day-of-Month:</td>
      <td><input className="EditLedger input-small" type="text" name={`${acctID}_paymentDate`} value={props.editAcct.paymentDate} onChange={props.handleDataChange} /></td>
      <td>Bal after last Pmnt:</td>
      <td><input className="EditLedger input-small" type="text" name={`${acctID}_paymentBal`} value={props.editAcct.paymentBal} onChange={props.handleDataChange} /></td>
    </tr>
  );
  const newRow = (
    <tr>
      <td><input className="EditLedger input-large" type="text" name={'new_accountName'} value={props.editAcct.accountName} onChange={props.handleDataChange} /></td>
      <td><input className="EditLedger Currency input-large" type="number" name={'new_balance'} value={props.editAcct.balance} onChange={props.handleDataChange} /></td>
      <td><input className="EditLedger input-large" type="date" name={'new_balanceDate'} value={props.editAcct.balanceDate} onChange={props.handleDataChange} /></td>
      <td><input className="EditLedger input-small" type="text" name={'new_currency'} value={props.editAcct.currency} onChange={props.handleDataChange} /></td>
      <td><input className="EditLedger input-small" type="text" name={'new_accountType'} value={props.editAcct.accountType} onChange={props.handleDataChange} /></td>
      <td><input className="EditLedger input-small" type="number" name={'new_rate'} value={props.editAcct.rate} onChange={props.handleDataChange} /></td>
      <td>{props.editAcct.includeAccount ? <input name={'new_includeAccount'} type="checkbox" value={props.editAcct.includeAccount} checked onChange={props.handleDataChange} />
        : <input name={'new_includeAccount'} type="checkbox" value={props.editAcct.includeAccount} onChange={props.handleDataChange} />}</td>
      <td className="EditBox"><button name={'new_modify'} type="button" onClick={props.editEntry}>Add</button></td>
    </tr >
  );
  return (
    <div className="LedgerArea">
      <table className="Ledger">
        <thead>
          <tr>
            <th>Account Name</th>
            <th>Balance</th>
            <th>Balance Date</th>
            <th>Currency</th>
            <th>Account Type</th>
            <th>Annual Rate</th>
            <th>Show?</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {props.accountTable.map(val => {
            let nameCell = <td>{val.accountName}</td>;
            let dateCell = <td>{val.balanceDate}</td>;
            let balanceCell = <td className={val.balance < 0 ? 'Currency Negative' : 'Currency'}>{formatCurrency(val.balance)}</td>;
            let typeCell = <td>{val.accountType}</td>;
            let rateCell = val.accountType === 'loan' ? <td>{Math.round(val.rate * 10000) / 100}%</td> : <td />;
            let currencyCell = <td>{val.currency}</td>;
            let showCell = <td><i className={val.includeAccount ? 'fa fa-check' : 'fa fa-uncheck'} /></td>;
            let buttonCell = props.editAcct.acctID !== '' ? <button disabled>x</button> : <button name={`${val.acctID}_enable`} id={val.acctID} type="button" onClick={props.editEntry}>+</button>;
            let resetButton = '';
            if (props.editAcct.acctID === val.acctID) {
              dateCell = <td><input className="EditLedger input-large" type="date" name={`${val.acctID}_balanceDate`} value={props.editAcct.balanceDate} onChange={props.handleDataChange} /></td>;
              nameCell = <td><input className="EditLedger input-large" type="text" name={`${val.acctID}_accountName`} value={props.editAcct.accountName} onChange={props.handleDataChange} /></td>;
              balanceCell = <td><input className="EditLedger Currency input-large" type="number" name={`${val.acctID}_balance`} value={props.editAcct.balance} onChange={props.handleDataChange} /></td>;
              currencyCell = <td><input className="EditLedger input-small" type="text" name={`${val.acctID}_currency`} value={props.editAcct.currency} onChange={props.handleDataChange} /></td>;
              typeCell = <td><input className="EditLedger input-small" type="text" name={`${val.acctID}_accountType`} value={props.editAcct.accountType} onChange={props.handleDataChange} /></td>;
              rateCell = <td><input className="EditLedger input-small" disabled={val.accountType === 'loan'} type="number" name={`${val.acctID}_rate`} value={val.accountType === 'loan' ? 0 : props.editAcct.rate} onChange={props.handleDataChange} /></td>;
              showCell = (
                <td>
                  <input name={`${val.acctID}_includeAccount`} type="checkbox" value={props.editAcct.includeAccount} checked={props.editAcct.includeAccount} onChange={props.handleDataChange} />
                </td>
              );
              buttonCell = <button name={`${val.acctID}_modify`} type="button" onClick={props.editEntry}><i id="modify" className="fa fa-check fa-fw" aria-hidden="true" /></button>;
              resetButton = <button name={`${val.acctID}_clear`} id="clear" type="button" onClick={props.editEntry}><i id="clear" className="fa fa-undo fa-fw" aria-hidden="true" /></button>;
            }
            return (
              <tr key={val.acctID} id={`row-${val.acctID}`}>
                {nameCell}
                {balanceCell}
                {dateCell}
                {currencyCell}
                {typeCell}
                {rateCell}
                {showCell}
                <td className="EditBox">
                  {buttonCell}{resetButton}
                </td>
              </tr>);
          })}
          {props.editAcct.acctID !== '' ? <tr /> : newRow}
          {props.editAcct.accountType === 'liability' ? advancedRow(props.editAcct.acctID) : <tr />}
        </tbody>
      </table>
    </div>
  );
};

export default AccountEditor;
