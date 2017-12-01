// @flow

import React from 'react';
import { formatCurrency } from '../actions/expandledger';
import type { ledgerItem } from '../actions/typedefs';

const BalanceTable = (props: {
  ledger: Array<ledgerItem>,
  editTxn: ledgerItem,
  minBalance: number,
  balance: number,
  currentDate: Date,
  handleDataChange: (() => Event),
  editEntry: (() => Event)
}) => (<div className="LedgerArea">
  <table className="Ledger">
    <thead>
      <tr>
        <th />
        <th />
        <th className="MinBalance">Minimum Balance:</th>
        <th className={props.minBalance < 0 ? 'Negative MinBalance' : 'MinBalance'}>{formatCurrency(props.minBalance)}</th>
        <th />
      </tr>
    </thead>
    <tbody>
      <tr />
      <tr>
        <td className="StartBalance">{props.currentDate.toISOString().split('T')[0]}</td>
        <td className="StartBalance">Starting Balance</td>
        <td />
        <td className={props.balance < 0 ? 'Currency Negative Total' : 'Currency StartBalance Total'}>{formatCurrency(props.balance)}</td>
        <td />
      </tr>
      {props.ledger.map(val => {
        let dateCell = <td>{val.txnDate}</td>;
        let discCell = <td>{val.Description}</td>;
        let amntCell = <td className={val.Amount > 0 ? 'Currency' : 'Currency Negative'}>{formatCurrency(val.Amount)}</td>;
        let buttonCell = props.editTxn.txnID !== '' ? <button disabled>x</button> : <button id="enable" name={`${val.txnID}_enable`} type="button" onClick={props.editEntry}>+</button>;
        let resetButton = '';
        const skipButton = <button name={`${val.txnID}_skip`} id="skip" type="button" onClick={props.editEntry}><i id="skip" className="fa fa-fw fa-fast-forward" alt="skip transaction" aria-hidden="true" /></button>;
        if (props.editTxn.txnID === val.txnID) {
          dateCell = <td><input className="EditLedger" type="date" name={`${val.txnID}_txnDate`} value={props.editTxn.txnDate} onChange={props.handleDataChange} /></td>;
          discCell = <td><input className="EditLedger" type="text" name={`${val.txnID}_Description`} value={props.editTxn.Description} onChange={props.handleDataChange} /></td>;
          amntCell = <td><input className="EditLedger Currency" type="number" name={`${val.txnID}_Amount`} value={props.editTxn.Amount} onChange={props.handleDataChange} /></td>;
          buttonCell = <button name={`${val.txnID}_modify`} id="modify" type="button" onClick={props.editEntry}><i id="modify" className="fa fa-check fa-fw" alt="save changes and exit edit mode" aria-hidden="true" /></button>;
          resetButton = val.Custom ? <button name={`${val.txnID}_clear`} id="clear" type="button" onClick={props.editEntry}><i id="clear" className="fa fa-eraser fa-fw" alt="revert to budget" aria-hidden="true" /></button> : '';
        }
        return (
          <tr key={val.txnID} id={`row-${val.txnID}`} className={val.Custom ? 'Custom' : ''}>
            {dateCell}
            {discCell}
            {amntCell}
            <td className={`Currency Total ${props.editTxn.txnID === val.txnID ? 'EditLedger' : ''} ${val.Balance < 0 ? 'Negative' : ''}`}>{formatCurrency(val.Balance)}</td>
            <td className="EditBox">
              {buttonCell}{skipButton}{resetButton}
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
