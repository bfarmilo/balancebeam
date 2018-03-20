/* eslint global-require: 1, flowtype-errors/show-errors: 0 */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 *
 * @flow
 */
import { app, BrowserWindow, ipcMain } from 'electron';
import fse from 'fs-extra';
import MenuBuilder from './menu';
import chalk from 'chalk';
import { encode, decode } from './actions/decrypt';

import { getDropBoxPath } from './actions/getdropbox';

let dropBoxPath = '';
const openAccounts = new Map();
let accountBalancePattern = new Map();
let pathArray = [];

let mainWindow = null;

// on startup

getDropBoxPath('personal')
  .then(dropbox => {
    dropBoxPath = `${dropbox}\\Swap\\Budget`;
    console.log(chalk.green(`Main: Good DropBox Path:${dropBoxPath}`));
    return fse.readJSON(`${dropBoxPath}\\config.json`)
  })
  .then(config => {
    pathArray = decode(config.payload).config.updatePath;
    if (mainWindow) {
      mainWindow.webContents.send('message', 'config file loaded');
    }
    return console.log(chalk.green('Main: got config file'));
  })
  .catch(error => {
    if (mainWindow) {
      mainWindow.webContents.send('message', `Error with dropbox path ${error.name}: ${error.message}`);
    }
  });

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
  require('electron-debug')();
  const path = require('path');
  const p = path.join(__dirname, '..', 'app', 'node_modules');
  require('module').globalPaths.push(p);
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = [
    'REACT_DEVELOPER_TOOLS',
    'REDUX_DEVTOOLS'
  ];

  return Promise
    .all(extensions.map(name => installer.default(installer[name], forceDownload)))
    .catch(err => console.error(chalk.red(err)));
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});


app.on('ready', async () => {
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
    await installExtensions();
  }

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728
  });


  // now do all of the loading, firing events as you go
  mainWindow.loadURL(`file://${__dirname}/app.html`);
  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    // mainWindow.webContents.openDevTools();
    mainWindow.show();
    mainWindow.focus();
    getAllData(mainWindow.webContents)
      .then(result => {
        return result.map(item => {
          if (mainWindow) {
            mainWindow.webContents.send('message', `loading ${item.dataType}`);
            mainWindow.webContents.send(item.dataType, item.value);
          };
          return item;
        }).filter(val => (val.dataType === 'accountList'))
      })
      .then(updated => {
        mainWindow.webContents.send('message', 'loading OK');
        mainWindow.webContents.send('ready');
      })
      .catch(err => {
        if (mainWindow) {
          mainWindow.webContents.send('message', `Error with getting initial data ${err}`);
        }
      });
  });

  mainWindow.on('close', (e) => {
    // catch a 'close' of the main window and put all of the other windows down first
    console.log(chalk.green(`Main: closing application${openAccounts.size > 0 ? `, first closing ${openAccounts.size} Exhibits` : ''}`));
    if (openAccounts.size > 0) {
      openAccounts.forEach((win, acct) => {
        console.log(chalk.green(`Main: closing ${acct}`));
        win.close();
      });
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();
});

// custom functions

const getBalances = acctID => {

  const allPatterns = new Map([...accountBalancePattern].filter(([k, v]) => v.updateRef === accountBalancePattern.get(acctID).updateRef));
  // parser is {match, currency, quantity, selector, value}
  // const { match, currency, quantity, selector, value } = accountBalancePattern.get(acctID);
  // currency and quantity correspond to matches from the config regexp
  const getBalance = `const getData = () => {
      const result = [];
      ${[...allPatterns].map(([k, v]) => `result.push(['${k}', document.${v.updateRef === 'sjc' ? `querySelector('frame').contentDocument.body.` : ''}querySelector('${v.selector}').${v.value}])`).join(';\n')}
      return result;
    }
    console.log(getData());
    getData();`
  openAccounts.get(`${acctID}`).webContents.executeJavaScript(getBalance, false)
    .then(result => {
      // result is an array of [acctID, result]
      const updatedRecord = result.map(([accountID, accountData]) => {
        // first create the dollars, cents, and [currency] regex from the accountPattern map
        const matchVal = new RegExp(allPatterns.get(accountID).match, 'g');
        const { quantity, currency } = allPatterns.get(accountID);
        // replace using the regex (from config.json) and the replace pattern (from accountList.json)
        // to convert into a signed Float (strip off commas and dollar signs)
        return {
          acctID: accountID,
          balance: parseFloat(accountData.replace(matchVal, quantity)),
          currency: accountData.replace(matchVal, currency)
        }
      });
      console.log('Main: received new balance data from account window', updatedRecord);
      mainWindow.webContents.send('new_balance_available', updatedRecord);
    })
    .catch(err => console.error(err));
};

const getData = (dataType) => new Promise((resolve, reject) => {
  // mainWindow.webContents.send('message', `Loading ${dataType} data`);
  console.log(chalk.green(`Main: Loading ${dropBoxPath}\\${dataType}.json`));
  fse.readJSON(`${dropBoxPath}\\${dataType}.json`)
    .then(resultData => {
      console.log(chalk.green(`Main: Good ${dataType} data`));
      // load accountList into accountBalancePattern
      if (dataType === 'accountList') {
        accountBalancePattern = new Map([].concat(
          resultData.accountList.filter(acct => acct.hasOwnProperty('updateRef')).map(account => {
            const { match } = pathArray.filter(match => match.updateRef === account.updateRef)[0].updateSequence[0].N_PATTERN;
            const updateRef = account.updateRef;
            const { currency, quantity, selector, value } = account.updateSequence[0].N_EVALUATE;
            return [account.acctID, { updateRef, match, currency, quantity, selector, value }];
          })
        ));
        console.log(chalk.green('Main: set accountBalancePattern', accountBalancePattern.entries().next()));
      }
      return resolve({ dataType, value: resultData[dataType] });
    })
    .catch(err1 => {
      console.error(chalk.red(`Error getting ${dataType} data: ${err1}`));
      return reject(err1);
    });
});

const getAllData = (target) => {
  target.webContents.send('message', 'Loading local data files...');
  return Promise.all(['budgetList', 'customLedger', 'accountList'].map(getData));
};

const openAccountWindow = (updateRef, acctID) => {

  const typeText = (targetWindow, entry) => {
    return targetWindow.executeJavaScript(`document.querySelector('${entry.target}').focus();`, false)
      .then(() => entry.value.split('').map(key => targetWindow.sendInputEvent({ type: 'char', keyCode: key })))
      .then(() => Promise.resolve('done'))
      .catch(err => Promise.reject(err))
  }

  // takes a file argument and opens a window
  // also stops the title from changing
  const viewerWindow = new BrowserWindow({
    width: 1024,
    height: 800,
    x: 50,
    y: 50,
    autoHideMenuBar: true,
    webPreferences: {
      webSecurity: false,
      nodeIntegration: false
    }
  });

  const entry = pathArray
    .filter(val => val.updateRef === updateRef).reduce(val => val).updateSequence;

  const file = entry[1].N_GOTO;
  const login = entry[2].N_TYPE;
  const pwd = entry[3].N_TYPE;
  let loginComplete = false;

  // When the account is closed, delete it from the map of open accounts
  viewerWindow.on('closed', () => {
    console.log(chalk.green(`Main: window closed: ${acctID}`));
    openAccounts.delete(`${acctID}`);
  });

  viewerWindow.webContents.on('did-stop-loading', e => {
    if (!viewerWindow.webContents.isLoading() && !loginComplete) {
      console.log(chalk.green(`finished Loading, inserting login information`));
      typeText(viewerWindow.webContents, login)
        .then(() => setTimeout(() => typeText(viewerWindow.webContents, pwd), 500))
        .then(() => loginComplete = true)
        .catch(err => console.error(err))
    }
    if (!viewerWindow.webContents.isLoading() && loginComplete) {
      console.log('finished loading redirect page, calling page scrape');
      getBalances(`${acctID}`);
    }
  })

  // now open the window
  viewerWindow.loadURL(`${file}`);
  // viewerWindow.webContents.openDevTools();
  openAccounts.set(`${acctID}`, viewerWindow);
};

// TODO: Get USD exchange data
const openExchangeWindow = () => {
  const exchangeURL = `https://www.bankofcanada.ca/rates/exchange/daily-exchange-rates-lookup/?series%5B%5D=FXUSDCAD&lookupPage=lookup_daily_exchange_rates_2017.php&startRange=2007-11-30&rangeType=range&rangeValue=1.y&dFrom=&dTo=&submit_button=Submit`;
  // const exchangeURL =`https://www.bankofcanada.ca/valet/observations/FXUSDCAD/json?start_date=2016-02-01`
  // format of JSON returned is observations[idx].d = date, observations[idx].FXUSDCAD.v = rate
  // for now, just open a window
  const exchWindow = new BrowserWindow({
    width: 1024,
    height: 800,
    x: 50,
    y: 50,
    autoHideMenuBar: true,
    webPreferences: {
      webSecurity: false,
      nodeIntegration: false
    }
  });

  // When the window is closed, delete it from the map of open windows
  exchWindow.on('closed', () => {
    console.log(chalk.green('Main: exchange window closed'));
    openAccounts.delete('exchange');
  });

  // now open the window and add it to the set of open windows
  exchWindow.loadURL(exchangeURL);
  openAccounts.set('exchange', exchWindow);
};

// event listeners

ipcMain.on('recover', e => {
  console.log(chalk.green('Main: received error OK window'), e.sender.currentIndex);
  if (mainWindow) mainWindow.webContents.send('message', 'loading OK');
});


ipcMain.on('writeOutput', (e, dataType, value) => {
  console.log(chalk.green(`Main: received call to update ${dataType} from window`), e.sender.currentIndex);
  mainWindow.webContents.send('message', `writing new ${dataType}`);
  fse.writeFile(`${dropBoxPath}\\${dataType}.json`, `{ "${dataType}": ${JSON.stringify(value)}}`, err => {
    if (err) {
      if (mainWindow) {
        mainWindow.webContents.send('message', `${err.name}: ${err.message}`);
      }
    } else {
      mainWindow.webContents.send('message', 'file written');
    }
  });
});

ipcMain.on('updateLedger', e => {
  console.log(chalk.green('Main: received call to update ledger from window'), e.sender.currentIndex);
  mainWindow.webContents.send('message', 'updating ledger');
  getData('customLedger')
    .then(results => {
      if (mainWindow) {
        mainWindow.webContents.send(results.dataType, results.value);
        mainWindow.webContents.send('message', 'ledger updated');
        mainWindow.webContents.send('ready');
      }
      return 'done';
    })
    .catch(error => {
      if (mainWindow) {
        mainWindow.webContents.send('message', `Error updating ledger ${error.name}: ${error.message}`);
      }
    });
});

ipcMain.on('open_account', (event, acctID, updateRef) => {
  console.log(chalk.green(`Main: received call to open window for account ${acctID}`));
  mainWindow.webContents.send('message', `opening window for account ${acctID}`);
  let alreadyOpen = false;
  // check to see if window already opened - if so just give it the focus
  if (openAccounts.has(`${acctID}`)) {
    console.log(chalk.green(`Main: match found with id ${openAccounts.get(`${acctID}`).id}`));
    openAccounts.get(`${acctID}`).focus();
    alreadyOpen = true;
  }
  if (!alreadyOpen) {
    // else open new window
    openAccountWindow(updateRef, acctID);
    mainWindow.webContents.send('message', 'account opened');
  }
});

ipcMain.on('get_exchange', (event) => {
  console.log(chalk.green(`Main: received call to open exchange window`));
  let alreadyOpen = false;
  // check to see if window already opened - if so just give it the focus
  if (openAccounts.has('exchange')) {
    console.log(chalk.green(`Main: match found with id ${openAccounts.get('exchange').id}`));
    openAccounts.get('exchange').focus();
    alreadyOpen = true;
  }
  if (!alreadyOpen) {
    // else open new window
    openExchangeWindow();
  }
})

// extract the balance from an opened window
ipcMain.on('get_balance', (e, acctID) => {
  if (openAccounts.has(`${acctID}`)) {
    getBalances(acctID);
  } else {
    console.log('Main: unable to retrieve balance until window is open');
  }
});

