import React from 'react';
import PropTypes from 'prop-types';
import { VictoryLine, VictoryChart, VictoryAxis, VictoryTheme, VictoryVoronoiContainer, VictoryTooltip } from 'victory';

const ChartArea = (props) => {
  const amounts = props.data.map(val => val.Balance);
  const tickVals = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(
    (value, index, listing) => Math.round(
      (Math.min(...amounts) +
        ((Math.max(...amounts) - Math.min(...amounts)) * (value / (listing.length - 1)))
      ) / 500) * 500);
  return (
    <div>
      <VictoryChart
        containerComponent={<VictoryVoronoiContainer />}
        height={200}
        theme={VictoryTheme.material}
      >
        <VictoryAxis
          style={{
            tickLabels: { fontSize: 8 },
            axis: { stroke: '#ccc' }
          }}
          scale="time"
        />
        <VictoryAxis
          dependentAxis
          crossAxis={false}
          style={{
            tickLabels: { fontSize: 8 },
            axis: { stroke: '#ccc' }
          }}
          tickValues={tickVals}
          tickFormat={(y) => (y !== 0 ? `$${y / 1000}k` : '$0k')}
        />
        <VictoryLine
          data={props.data}
          interpolation={'step'}
          x={(x) => new Date(x.txnDate)}
          y={'Balance'}
          labels={(y) => `${y.txnDate.substring(5)}, $${y.Balance}`}
          labelComponent={<VictoryTooltip
            style={{ fontSize: 8 }}
          />}
        />
      </VictoryChart>

    </div>
  );
};


ChartArea.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    txnID: PropTypes.string,
    txnDate: PropTypes.string,
    Amount: PropTypes.number,
    Account: PropTypes.number,
    Description: PropTypes.string,
    Balance: PropTypes.number
  })).isRequired,
};


export default ChartArea;
