import * as actions from '../../app/actions/calcaxis';

const mbnaClick = '.summarytable .top10 .td-layout-column:nth-child(2) a';

const accountList = [
  {
    "accountName": "MBNA",
    "accountType": "liability",
    "acctID": "7",
    "balance": -2084.57,
    "balanceDate": "2017-07-17",
    "currency": "CAD",
    "includeAccount": true,
    "paymentDate": 17,
    "paymentBal": 0,
    "targetSpend": 3650,
    "updateRef": "MBNA",
    "updateSequence": [
      {
        "N_EVALUATE": {
          "currency": "CAD",
          "quantity": "-$1$2",
          "selector": ".summarytable .section1 .column2 strong",
          "value": "innerHTML",
          "wait": true
        }
      }
    ]
  },
  {
    "accountName": "Amex",
    "accountType": "liability",
    "acctID": "8",
    "balance": -1315.59,
    "balanceDate": "2017-07-17",
    "currency": "CAD",
    "includeAccount": true,
    "paymentDate": 26,
    "updateRef": "amex",
    "updateSequence": [
      {
        "N_EVALUATE": {
          "currency": "CAD",
          "quantity": "-$1$2",
          "selector": "#card-balance .balance-data",
          "value": "innerHTML"
        }
      }
    ]
  },
  {
    "Balance": 0,
    "accountName": "TD Visa",
    "accountType": "liability",
    "acctID": "9",
    "balance": 0,
    "balanceDate": "2017-07-12",
    "currency": "CAD",
    "includeAccount": false,
    "rate": 0
  },
  {
    "accountName": "FSI Mcard",
    "accountType": "liability",
    "acctID": "10",
    "balance": -1401.61,
    "balanceDate": "2017-07-17",
    "currency": "CAD",
    "includeAccount": true,
    "paymentDate": 28,
    "updateRef": "business",
    "updateSequence": [
      {
        "N_EVALUATE": {
          "currency": "$3",
          "quantity": "-$1$2",
          "selector": "#CreditCards td table tr:nth-child(1) td:nth-child(4)",
          "value": "innerHTML"
        }
      }
    ]
  }
];

describe('creating a nice tick range', () => {
  it('should take a minimum, maximum and number of ticks and calculate nice min, max and tick size', () => {
    expect.assertions(1);
    const endRange = 759;
    const startRange = -155;
    const numTicks = 6;
    return (
      actions.niceNumber(endRange - startRange, false)
        .then(result => actions.niceNumber(result / numTicks, true))
        .then(step => ({
          low: Math.floor(startRange / step) * step,
          high: Math.ceil(endRange / step) * step,
          step
        }))
        .then(data => expect(data).toEqual({ low: -200, high: 800, step: 200 }))
    );
  });
  it('should take nice min, max and tick size and create an array of points', () => {
    expect(actions.generateArray(-200, 800, 200)).toEqual([-200, 0, 200, 400, 600, 800]);
  });
  it('should handle a case where minval = maxval', () => {
    expect.assertions(1);
    return (
      actions.makeTickVals(0, 0, 8))
      .then(data => expect(data).toEqual([-60, -40, -20, 0, 20, 40, 60, 80])
      );
  });
});

describe('creating a credit card spending budget', () => {
  const endDate = new Date('2017-08-17');
  endDate.setUTCHours(4);
  const startDate = new Date(endDate);
  startDate.setUTCMonth(endDate.getUTCMonth() - 1);
  const testResult = actions.createBudget(accountList[0]);
  it('should calculate the end date properly', () => {
    expect(testResult.end).toEqual(endDate);
  });
  it('should calculate the start date properly', () => {
    expect(testResult.start).toEqual(startDate);
  });
  it('should calculate burn Rate and Balance properly', () => {
    expect(testResult.burnRate).toBeCloseTo(-120, 4);
    expect(testResult.startBal).toEqual(accountList[0].paymentBal);
  });
  it('should calculate the target daily balance for the next month', () => {
    expect(actions.createTargetChart(accountList[0], 3650)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        txnDate: expect.any(String),
        Balance: expect.any(Number)
      })
    ]
    ));
  });
});
