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
      } else {
        if (fraction <= 1.0) niceFraction = 1.0;
        else if (fraction <= 2.0) niceFraction = 2.0;
        else if (fraction <= 5.0) niceFraction = 5.0;
        else niceFraction = 10.0;
      }
      return resolve((niceFraction * (10 ** exponent)));
    } catch (err) {
      return reject(err);
    }
  })
);

const makeTickVals = (startRange, endRange, numTicks) => (
  new Promise((resolve, reject) => {
    niceNumber(endRange - startRange, 0)
      .then(result => niceNumber((result / numTicks), 1))
      .then(step => {
        const low = Math.floor(startRange / step) * step;
        const high = Math.ceil(endRange / step) * step;
        const zeroPos = high >= 0 ? (high - 0) / (high - low) : 0;
        return ({
          low,
          high,
          step,
          zeroPos
        });
      }
      )
      .then(output => {
        const returnArray = [];
        for (let i = 0; i <= numTicks; i += 1) {
          returnArray.push((i * output.step) + output.low);
        }
        return resolve({ zeroPos: output.zeroPos, tickValues: returnArray });
      })
      .catch(err => reject(err));
  })
);

module.exports = {
  makeTickVals
};

