// @flow

import React from 'react';
import { VictoryLine, VictoryChart, VictoryAxis, VictoryTheme, VictoryVoronoiContainer, VictoryTooltip } from 'victory';
import styles from './ChartArea.css';
import type { ledgerItem } from '../actions/typedefs';

type targetItem = {
  txnDate: string,
  Balance: number
};

const ChartArea = (props: {
  data: Array<ledgerItem>,
  tickValues: Array<number>,
  zeroPos: number,
  target: Array<targetItem> | string,
  showTarget: boolean,
  startBalance: targetItem
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
    data: { stroke: 'rgba(255,255,255,0.8)', strokeWidth: 1.5 },
    labels: { fill: 'black' }
  };
  const targetLine = props.target !== '' ? (
    <VictoryLine
      data={props.target}
      x={(x) => new Date(x.txnDate)}
      y={'Balance'}
      style={{
        data: {
          stroke: 'blue',
        },
        labels: {
          fill: 'blue',
        }
      }}
    />
  ) : null;
  console.log('chart: got target data', props.target, props.showTarget);
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
          containerComponent={
            <VictoryVoronoiContainer
              dimension="x"
              labels={(d) => {
                const asDate = new Date(d.txnDate);
                return `${asDate.toDateString().slice(4, 10)}: $${d.Balance}`;
              }}
              labelComponent={<VictoryTooltip style={{ fontSize: 6 }} />}
            />
          }
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
            data={[props.startBalance].concat(props.data)}
            style={linestyle}
            interpolation={'stepAfter'}
            x={(x) => new Date(x.txnDate)}
            y={'Balance'}
          />
          {targetLine}
        </VictoryChart>
      </svg>
    </div >
  );
};

export default ChartArea;
