const niceNumber = (value, round) => (
  new Promise((resolve, reject) => {
    try {
      const exponent = Math.floor(Math.log10(value));
      const fraction = value / (10 ** exponent);
      let niceFraction = 0;
      if (round) {
        if (fraction < 1.5) niceFraction = 1.0;
        else if (fraction < 3.0) niceFraction = 2.0;
        else if (fraction < 7.0) niceFraction = 5.0;
        else niceFraction = 10.0;
        return resolve((niceFraction * (10 ** exponent)));
      }
      if (fraction <= 1.0) niceFraction = 1.0;
      else if (fraction <= 2.0) niceFraction = 2.0;
      else if (fraction <= 5.0) niceFraction = 5.0;
      else niceFraction = 10.0;
      return resolve((niceFraction * (10 ** exponent)));
    } catch (err) {
      return reject(err);
    }
  })
);

const generateArray = (minVal, maxVal, stepVal) => {
  const returnArray = [];
  for (let i = 0; (minVal + (i * stepVal) <= maxVal); i += 1) {
    returnArray.push((i * stepVal) + minVal);
  }
  return returnArray;
};

const makeTickVals = (startRange, endRange, numTicks = 8) => (
  new Promise((resolve, reject) => {
    if (startRange === endRange) {
      return resolve([-60, -40, -20, 0, 20, 40, 60, 80]);
    }
    niceNumber(endRange - startRange, false)
      .then(result => niceNumber(result / (numTicks), true))
      .then(step => ({
        low: Math.floor(startRange / step) * step,
        high: Math.ceil(endRange / step) * step,
        step
      }))
      .then(output => resolve(generateArray(output.low, output.high, output.step)))
      .catch(err => reject(err));
  })
);

/**
 * createBudget takes an account object, specifically a target spend, a last payment balance
 * and a last payment date
 * @param {accountList} account 
 * @param {number} numMonths
 * @returns {object} start: the starting date end: the ending date startBal: starting balance, burnRate the $/day spend to meet target
 */
const createBudget = (account, numMonths) => {
  const burnRate = -(account.targetSpend * 12) / 365; //set the burn Rate
  let startBal = account.paymentBal; //set the starting Balance
  // calculate the date of the last payment, which becomes the start point
  // note paymentDate is just the day of the month
  const currentDate = new Date();
  const oldDate = new Date(
    currentDate.getUTCFullYear(),
    currentDate.getUTCDate() >= account.paymentDate
    ? currentDate.getUTCMonth()
    : currentDate.getUTCMonth() - 1,
    account.paymentDate
  );
  oldDate.setUTCHours(0, 0, 0, 0);
  // now calculate forward numMonths to the end point of the projection
  // note if months > 12, the year automatically rolls over
  const paymentDate = new Date(
    currentDate.getUTCFullYear(),
    currentDate.getUTCDate() >= account.paymentDate
      ? currentDate.getUTCMonth() + numMonths
      : currentDate.getUTCMonth() + (numMonths - 1),
    account.paymentDate
  );
  paymentDate.setUTCHours(0, 0, 0, 0);
  if (currentDate === paymentDate) {
    startBal = account.balance;
  }
  console.log('target data calculated: start %s end %s startBalance %d burnRate %d', oldDate, paymentDate, startBal, burnRate);
  return { start: oldDate, end: paymentDate, startBal, burnRate };
};

const createTargetChart = (account, numMonths = 3) => {
  const { start, end, startBal, burnRate } = createBudget(account, numMonths);
  const today = new Date(account.balanceDate);
  today.setUTCHours(0, 0, 0, 0);
  let currentDate = new Date(start);
  let currentBal = startBal - account.targetSpend;
  const returnArray = [];
  do {
    if (currentDate >= today) {
      const txnDate = currentDate.toISOString().split('T')[0];
      returnArray.push({ txnDate, Balance: Math.round(currentBal * 100) / 100 });
    }
    currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
    currentBal += burnRate;
    if (account.paymentDate === currentDate.getDate()) {
      currentBal += account.targetSpend;
    }
  }
  while (currentDate < end);
  return returnArray;
};

module.exports = {
  makeTickVals,
  generateArray,
  niceNumber,
  createBudget,
  createTargetChart
};

