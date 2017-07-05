import React from 'react';
import PropTypes from 'prop-types';
import { VictoryLine, VictoryChart, VictoryAxis, VictoryTheme, VictoryVoronoiContainer, VictoryTooltip } from 'victory';

const ChartArea = (props) => {
  const posHeight = Math.round(props.tickValData.zeroPos * 100);
  return (
    <div>
      <svg viewBox="0 0 340 200">
        <defs>
          <linearGradient id="chartarea" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: 'rgba(102,153,255,0)' }} />
            <stop offset="100%" style={{ stopColor: 'rgba(50,50,255,0.5)' }} />
          </linearGradient>
          <linearGradient id="negarea" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: 'rgba(153,0,0,0)' }} />
            <stop offset="100%" style={{ stopColor: 'rgba(153,0,0,0.5)' }} />
          </linearGradient>
        </defs>
        <rect x="50" y="50" width="250" height={posHeight} fill="url(#chartarea)" />
        <rect x="50" y={50 + posHeight} width="250" height={100 - posHeight} fill="url(#negarea)" />
        <VictoryChart
          containerComponent={<VictoryVoronoiContainer />}
          height={200}
          theme={VictoryTheme.material}
          style={{ stroke: '#ccc' }}
        >
          <VictoryAxis
            style={{
              tickLabels: { fontSize: 7, padding: 5 },
              axis: { stroke: '#ccc' },
              ticks: { size: 0.2 },
              grid: {
                fill: 'transparent',
                stroke: '#ccc',
                strokeDasharray: '5, 0'
              }
            }}
            scale="time"
            orientation="bottom"
            offsetY={50}
          />
          <VictoryAxis
            dependentAxis
            crossAxis={false}
            orientation="left"
            style={{
              tickLabels: { fontSize: 7, padding: 5 },
              axis: {
                stroke: '#ccc'
              },
              ticks: {
                size: 0.2
              },
              grid: {
                fill: '#ccc',
                stroke: '#ccc',
                strokeDasharray: '5, 0'
              }
            }}
            tickValues={props.tickValData.tickValues}
            tickFormat={(y) => (y !== 0 ? `$${y / 1000}k` : '$0k')}
          />
          <VictoryLine
            style={{ background: '#AAA' }}
            data={props.data}
            interpolation={'step'}
            x={(x) => new Date(x.txnDate)}
            y={'Balance'}
            labels={(y) => `${y.txnDate.substring(5)}, $${y.Balance}`}
            labelComponent={<VictoryTooltip
              style={{ fontSize: 6 }}
            />}
          />
        </VictoryChart>
      </svg>
    </div >
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
  tickValData: PropTypes.shape({
    zeroPos: PropTypes.number.isRequired,
    tickValues: PropTypes.arrayOf(PropTypes.number.isRequired)
  }).isRequired,
};


export default ChartArea;
