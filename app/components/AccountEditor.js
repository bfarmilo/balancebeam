import React from 'react';
import PropTypes from 'prop-types';

// TODO:
// 1. Get rid of plus button and make any field clickable to edit
// 2. Replace Account to/from Numbers with accountNames

const AccountEditor = (props) => {
  const newRow = (
    <tr>
      <td><input className="EditLedger input-large" type="text" name={'new_accountName'} value={props.editAcct.accountName} onChange={props.handleDataChange} /></td>
      <td><input className="EditLedger Currency input-medium" type="number" name={'new_balance'} value={props.editAcct.balance} onChange={props.handleDataChange} /></td>
      <td><input className="EditLedger input-large" type="date" name={'new_balanceDate'} value={props.editAcct.balanceDate} onChange={props.handleDataChange} /></td>
      <td><input className="EditLedger input-small" type="text" name={'new_currency'} value={props.editAcct.currency} onChange={props.handleDataChange} /></td>
      <td><input name={'new_includeAccount'} type="checkbox" value={props.editAcct.includeAccount} onChange={props.handleDataChange} /></td>
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
            <th>Show in List?</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {props.accountTable.map(val => {
            let nameCell = <td>{val.accountName}</td>;
            let dateCell = <td>{val.balanceDate}</td>;
            let balanceCell = <td className="Currency">${val.balance}</td>;
            let currencyCell = <td>{val.currency}</td>;
            let showCell = <td><i className={val.includeAccount ? 'fa fa-check' : 'fa fa-uncheck'} /></td>;
            let buttonCell = props.editAcct.acctID !== '' ? <button disabled>x</button> : <button name={`${val.acctID}_enable`} id={val.acctID} type="button" onClick={props.editEntry}>+</button>;
            let resetButton = '';
            if (props.editAcct.acctID === val.acctID) {
              dateCell = <td><input className="EditLedger" type="date" name={`${val.acctID}_balanceDate`} value={new Date(props.editAcct.balanceDate)} onChange={props.handleDataChange} /></td>;
              nameCell = <td><input className="EditLedger" type="text" name={`${val.acctID}_accountName`} value={props.editAcct.accountName} onChange={props.handleDataChange} /></td>;
              balanceCell = <td><input className="EditLedger Currency" type="number" name={`${val.acctID}_balance`} value={props.editAcct.balance} onChange={props.handleDataChange} /></td>;
              currencyCell = <td><input className="EditLedger" type="text" name={`${val.acctID}_currency`} value={props.editAcct.currency} onChange={props.handleDataChange} /></td>;
              showCell = <td><input name={`${val.acctID}_includeAccount`} type="checkbox" value={props.editAcct.includeAccount} onChange={props.handleDataChange} /></td>;
              buttonCell = <button name={`${val.acctID}_modify`} type="button" onClick={props.editEntry}><i id="modify" className="fa fa-check fa-fw" aria-hidden="true" /></button>;
              resetButton = <button name={`${val.acctID}_clear`} id="clear" type="button" onClick={props.editEntry}><i id="clear" className="fa fa-undo fa-fw" aria-hidden="true" /></button>;
            }
            return (
              <tr key={val.acctID} id={`row-${val.acctID}`}>
                {nameCell}
                {balanceCell}
                {dateCell}
                {currencyCell}
                {showCell}
                <td className="EditBox">
                  {buttonCell}{resetButton}
                </td>
              </tr>);
          })}
          {props.editAcct.acctID !== '' ? <tr /> : newRow}
        </tbody>
      </table>
    </div>
  );
};


AccountEditor.propTypes = {
  accountTable: PropTypes.arrayOf(PropTypes.shape({
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
  })).isRequired,
  handleDataChange: PropTypes.func.isRequired,
  editAcct: PropTypes.shape({
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
    })).isRequired,
  }).isRequired,
  editEntry: PropTypes.func.isRequired,
};

export default AccountEditor;
