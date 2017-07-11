// @flow

import React from 'react';
import type { ledgerItem } from '../actions/typedefs';

const BalanceTable = (props: {
  ledger: Array<ledgerItem>,
  editTxn: ledgerItem,
  minBalance: number,
  balance: number,
  currentDate: Date,
  handleDataChange: (() => Event),
  editEntry: (() => Event)
}) => (
  <div className="LedgerArea">
    <table className="Ledger">
      <thead>
        <tr>
          <th />
          <th />
          <th className="MinBalance">Minimum Balance:</th>
          <th className={props.minBalance < 0 ? 'Negative MinBalance' : 'MinBalance'}>${props.minBalance < 0 ? -1 * props.minBalance : props.minBalance}</th>
          <th />
        </tr>
      </thead>
      <tbody>
        <tr />
        <tr>
          <td className="StartBalance">{props.currentDate.toISOString().split('T')[0]}</td>
          <td className="StartBalance">Starting Balance</td>
          <td />
          <td className={props.balance < 0 ? 'Currency Negative Total' : 'Currency StartBalance Total'}>${props.balance < 0 ? (-1 * props.balance) : props.balance}</td>
          <td />
        </tr>
        {props.ledger.map(val => {
          let dateCell = <td>{val.txnDate}</td>;
          let discCell = <td>{val.Description}</td>;
          let amntCell = <td className="Currency">{val.Amount < 0 ? `- $${(-1 * val.Amount).toFixed(2)}` : `+ $${val.Amount.toFixed(2)}`}</td>;
          let buttonCell = props.editTxn.txnID !== '' ? <button disabled>x</button> : <button id="enable" name={`${val.txnID}_enable`} type="button" onClick={props.editEntry}>+</button>;
          let resetButton = '';
          if (props.editTxn.txnID === val.txnID) {
            dateCell = <td><input className="EditLedger" type="date" name={`${val.txnID}_txnDate`} value={props.editTxn.txnDate} onChange={props.handleDataChange} /></td>;
            discCell = <td><input className="EditLedger" type="text" name={`${val.txnID}_Description`} value={props.editTxn.Description} onChange={props.handleDataChange} /></td>;
            amntCell = <td><input className="EditLedger Currency" type="number" name={`${val.txnID}_Amount`} value={props.editTxn.Amount} onChange={props.handleDataChange} /></td>;
            buttonCell = <button name={`${val.txnID}_modify`} id="modify" type="button" onClick={props.editEntry}><i id="modify" className="fa fa-check fa-fw" aria-hidden="true" /></button>;
            resetButton = val.Custom ? <button name={`${val.txnID}_clear`} id="clear" type="button" onClick={props.editEntry}><i id="clear" className="fa fa-undo fa-fw" aria-hidden="true" /></button> : '';
          }
          return (
            <tr key={val.txnID} id={`row-${val.txnID}`} className={val.Custom ? 'Custom' : ''}>
              {dateCell}
              {discCell}
              {amntCell}
              <td className={`Currency Total ${props.editTxn.txnID === val.txnID ? 'EditLedger' : ''} ${val.Balance < 0 ? 'Negative' : ''}`}>${val.Balance < 0 ? (-1 * val.Balance).toFixed(2) : val.Balance.toFixed(2)}</td>
              <td className="EditBox">
                {buttonCell}{resetButton}
              </td>
            </tr>);
        })}
      </tbody>
    </table>
  </div>
);

// need three options:
// activate edit mode for current row (or new)
// handle change of current row (or new)
// save/clear current row (or new)
// these get called directly (as prop.function) from the form component

export default BalanceTable;
