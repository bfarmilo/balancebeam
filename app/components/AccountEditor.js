import React from 'react';
import PropTypes from 'prop-types';

// TODO:
// 1. Get rid of plus button and make any field clickable to edit
// 2. Replace Account to/from Numbers with Descriptions

const AccountEditor = (props) => {
  const newRow = (
    <tr>
      <td><input className="EditLedger" type="text" name={'new_description'} value={props.editBud.description} onChange={props.handleDataChange} /></td>
      <td><input className="EditLedger Currency input-small" type="number" name={'new_amount'} value={props.editBud.amount} onChange={props.handleDataChange} /></td>
      <td>
        <select className="EditLedger input-medium" name={'new_fromAccount'} value={parseInt(props.editBud.fromAccount, 10)} onChange={props.handleDataChange}>
          {props.accountTable.map(account => (
            <option key={account.acctID} value={parseInt(account.acctID, 10)}>
              {account.accountName}
            </option>
          )
          )}
        </select>
      </td>
      <td>
        <select className="EditLedger input-medium" name={'new_toAccount'} value={parseInt(props.editBud.toAccount, 10)} onChange={props.handleDataChange}>
          {props.accountTable.map(account => (
            <option key={account.acctID} value={parseInt(account.acctID, 10)}>
              {account.accountName}
            </option>
          )
          )}
        </select>
      </td>
      <td>every</td>
      <td><input className="EditLedger input-tiny" type="number" name={'new_periodCount'} value={props.editBud.periodCount} onChange={props.handleDataChange} /></td>
      <td><input className="EditLedger input-small" type="text" name={'new_periodType'} value={props.editBud.periodType} onChange={props.handleDataChange} /></td>
      <td><input className="EditLedger input-large" type="date" name={'new_transactionDate'} value={props.editBud.transactionDate} onChange={props.handleDataChange} /></td>
      <td className="EditBox"><button name={'new_modify'} type="button" onClick={props.editEntry}>Add</button></td>
    </tr >
  );
  return (
    <div className="LedgerArea">
      <table className="Budget">
        <thead>
          <tr>
            <th>Description</th>
            <th>Amount</th>
            <th>From</th>
            <th>To</th>
            <th />
            <th />
            <th />
            <th>Start</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {props.accountBudget.map(val => {
            let discCell = <td>{val.description}</td>;
            let fromCell = <td className="Account">{props.accountTable[val.fromAccount].includeAccount ? props.accountTable[val.fromAccount].accountName : ''}</td>;
            let toCell = <td className="Account">{props.accountTable[val.toAccount].includeAccount ? props.accountTable[val.toAccount].accountName : ''}</td>;
            let perCountCell = <td>{val.periodCount}</td>;
            let perTypeCell = <td>{val.periodType}{val.periodCount > 1 ? 's' : ''}</td>;
            let dateCell = <td>{val.transactionDate}</td>;
            let amountCell = <td className="Currency">${val.amount}</td>;
            let buttonCell = props.editBud.budID !== '' ? <button disabled>x</button> : <button name={`${val.budID}_enable`} id={val.budID} type="button" onClick={props.editEntry}>+</button>;
            let resetButton = '';
            if (props.editBud.budID === val.budID) {
              dateCell = <td><input className="EditLedger input-large" type="date" name={`${val.budID}_transactionDate`} value={props.editBud.transactionDate} onChange={props.handleDataChange} /></td>;
              discCell = <td><input className="EditLedger" type="text" name={`${val.budID}_description`} value={props.editBud.description} onChange={props.handleDataChange} /></td>;
              amountCell = <td><input className="EditLedger Currency input-small" type="number" name={`${val.budID}_amount`} value={props.editBud.amount} onChange={props.handleDataChange} /></td>;
              toCell = (
                <td>
                  <select className="EditLedger input-medium" name={`${val.budID}_toAccount`} value={parseInt(props.editBud.toAccount, 10)} onChange={props.handleDataChange}>
                    {props.accountTable.map(account => (
                      <option key={account.acctID} value={parseInt(account.acctID, 10)}>
                        {account.accountName}
                      </option>
                    )
                    )}
                  </select>
                </td>
              );
              fromCell = (
                <td>
                  <select className="EditLedger input-medium" name={`${val.budID}_fromAccount`} value={parseInt(props.editBud.fromAccount, 10)} onChange={props.handleDataChange}>
                    {props.accountTable.map(account => (
                      <option key={account.acctID} value={parseInt(account.acctID, 10)}>
                        {account.accountName}
                      </option>
                    )
                    )}
                  </select>
                </td>
              );
              perCountCell = <td><input className="EditLedger input-tiny" type="number" name={`${val.budID}_periodCount`} value={props.editBud.periodCount} onChange={props.handleDataChange} /></td>;
              perTypeCell = <td><input className="EditLedger input-medium" type="text" name={`${val.budID}_periodType`} value={props.editBud.periodType} onChange={props.handleDataChange} /></td>;
              buttonCell = <button name={`${val.budID}_modify`} type="button" onClick={props.editEntry}><i id="modify" className="fa fa-check fa-fw" aria-hidden="true" /></button>;
              resetButton = <button name={`${val.budID}_clear`} id="clear" type="button" onClick={props.editEntry}><i id="clear" className="fa fa-undo fa-fw" aria-hidden="true" /></button>;
            }
            return (
              <tr key={val.budID} id={`row-${val.budID}`}>
                {discCell}
                {amountCell}
                {fromCell}
                {toCell}
                <td>every</td>
                {perCountCell}
                {perTypeCell}
                {dateCell}
                <td className="EditBox">
                  {buttonCell}{resetButton}
                </td>
              </tr>);
          })}
          {props.editBud.budID !== '' ? <tr /> : newRow}
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
  }).isRequired
  editAccount: PropTypes.func.isRequired
};

export default AccountEditor;
