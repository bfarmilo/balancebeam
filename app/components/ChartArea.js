// @flow

import React from 'react';
import { VictoryLine, VictoryChart, VictoryAxis, VictoryTheme, VictoryVoronoiContainer, VictoryTooltip } from 'victory';
import styles from './ChartArea.css';
import type { ledgerItem } from '../actions/typedefs';

const ChartArea = (props: {
  data: Array<ledgerItem>,
  tickValues: Array<number>,
  zeroPos: number
}) => {
  const posHeight = Math.round(props.zeroPos * 100);
  const mainaxis = {
    tickLabels: { fontSize: 7, padding: 5, fill: '#fff' },
    axis: { stroke: '#ccc' },
    ticks: { size: 0.2 },
    grid: {
      fill: '#ccc',
      stroke: '#ccc',
      strokeDasharray: '5, 0'
    }
  };
  const linestyle = {
    data: { stroke: 'rgba(255,255,255,0.8)', strokeWidth: 1.5 }
  };
  return (
    <div>
      <svg viewBox="0 0 340 200">
        <defs>
          <linearGradient id="chartarea" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" className={styles.startpositive} />
            <stop offset="100%" className={styles.endpositive} />
          </linearGradient>
          <linearGradient id="negarea" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" className={styles.startnegative} />
            <stop offset="100%" className={styles.endnegative} />
          </linearGradient>
        </defs>
        <rect x="50" y="50" width="250" height="100" fill="white" />
        <rect x="50" y="50" width="250" height={Math.min(posHeight, 100)} fill="url(#chartarea)" />
        <rect x="50" y={50 + posHeight} width="250" height={Math.max(100 - posHeight, 0)} fill="url(#negarea)" />
        <VictoryChart
          containerComponent={<VictoryVoronoiContainer />}
          height={200}
          theme={VictoryTheme.material}
          className={styles.chart}
        >
          <VictoryAxis
            style={mainaxis}
            scale="time"
            orientation="bottom"
            offsetY={50}
          />
          <VictoryAxis
            dependentAxis
            crossAxis={false}
            orientation="left"
            style={mainaxis}
            tickValues={props.tickValues}
            tickFormat={(y) => {
              if (Math.max(...props.data.map(v => v.Balance)) > 2000
                || Math.min(...props.data.map(v => v.Balance)) < -2000) {
                let returnY = `${y < 0 ? '-' : ''}$${Math.abs(y) / 1000}k`;
                returnY = y === 0 ? '$0' : returnY;
                return returnY;
              }
              return `${y < 0 ? '-' : ''}$${Math.abs(y)}`;
            }}
          />
          <VictoryLine
            data={props.data}
            style={linestyle}
            interpolation={'stepAfter'}
            x={(x) => new Date(x.txnDate)}
            y={'Balance'}
            labels={(y) => {
              const asDate = new Date(y.txnDate);
              return `${asDate.toDateString().slice(4, 10)}: $${y.Balance}`;
            }}
            labelComponent={<VictoryTooltip style={{ fontSize: 6 }} />}
          />
        </VictoryChart>
      </svg>
    </div >
  );
};

export default ChartArea;
