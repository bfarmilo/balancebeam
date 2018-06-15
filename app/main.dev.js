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
import crypto from 'crypto';
import { encryptDecrypt } from './actions/decrypt';
import { getDropBoxPath } from './actions/getdropbox';

let dropBoxPath = '';
const openAccounts = new Map();
let accountBalancePattern = new Map();
let pathArray = [];

let mainWindow = null;

const DECODE = false;
const feed = crypto.createHash('SHA256').update(process.env.BALANCE).digest('hex');

// on startup

getDropBoxPath('personal')
  .then(dropbox => {
    dropBoxPath = `${dropbox}\\Swap\\Budget`;
    console.log(chalk.green(`Main: Good DropBox Path:${dropBoxPath}`));
    return fse.readJSON(`${dropBoxPath}\\config.json`);
  })
  .then(encrypted => encryptDecrypt(feed, encrypted, DECODE))
  .then(decrypted => {
    pathArray = decrypted.config.updatePath;
    if (mainWindow) {
      ipcSend('message', 'config file loaded');
    }
    return console.log(chalk.green('Main: got config file'));
  })
  .catch(error => {
    if (mainWindow) {
      ipcSend('message', `Error with dropbox path ${error.name}: ${error.message}`);
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
    // console.log(process.env.DEVTOOLS);
    if (process.env.DEVTOOLS === 'show') viewerWindow.webContents.openDevTools();
    mainWindow.show();
    mainWindow.focus();
    getAllData()
      .then(result => {
        return result.map(item => {
          if (mainWindow) {
            ipcSend('message', `loading ${item.dataType}`);
            ipcSend(item.dataType, item.value);
          };
          return item;
        }).filter(val => (val.dataType === 'accountList'))[0];
      })
      .then(accountData => {
        ipcSend('message', 'loading OK');
        // load accountList into accountBalancePattern
        accountBalancePattern = new Map(
          accountData.value.filter(acct => acct.hasOwnProperty('updateRef')).map(account => {
            const { match } = pathArray.filter(match => match.updateRef === account.updateRef)[0].updateSequence[0].N_PATTERN;
            const updateRef = account.updateRef;
            const { currency, quantity, selector, value, offset } = account.updateSequence[0].N_EVALUATE;
            return [account.acctID, { updateRef, match, currency, quantity, selector, value, offset }];
          })
        );
        console.log(chalk.green('Main: set accountBalancePattern', JSON.stringify(accountBalancePattern)));
        ipcSend('ready');
      })
      .catch(err => {
        if (mainWindow) {
          ipcSend('message', `Error with getting initial data ${err}`);
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

/** getAllData loads local data files into local objects
 * @returns {Array<Promise>} resolves to {dataType, value}
 */
const getAllData = () => {

  ipcSend('message', 'Loading local data files...');

  const getData = dataType => new Promise((resolve, reject) => {
    console.log(chalk.green(`Main: Loading ${dropBoxPath}\\${dataType}.json`));
    fse.readJSON(`${dropBoxPath}\\${dataType}.json`)
      .then(resultData => {
        console.log(chalk.green(`Main: Good ${dataType} data`));
        return resolve({ dataType, value: resultData[dataType] });
      })
      .catch(err1 => {
        console.error(chalk.red(`Error getting ${dataType} data: ${err1}`));
        return reject(err1);
      });
  });
  return Promise.all(['budgetList', 'customLedger', 'accountList'].map(getData));
};



/** A helper function to make testing easier
 * 
 * @param {string} channel 
 * @param {*} payload 
 */
const ipcSend = (channel, payload) => {
  mainWindow.webContents.send(channel, payload);
}


// in retry mode, don't redefine the function just call it
// accesses globals accountBalancePattern, openAccounts, {BrowserWindow}
// TODO pass these in as locals
// TODO ie, might need a function here in main for executing javascript

const getBalances = async acctID => {

  const allPatterns = new Map([...accountBalancePattern].filter(([k, v]) => v.updateRef === accountBalancePattern.get(acctID).updateRef));
  // parser is {match, currency, quantity, selector, offset, value}
  console.log(allPatterns.get(`${acctID}`));
  // currency and quantity correspond to matches from the config regexp
  const getBalance = `
      if (typeof getData !== 'function') {
        window.getData = function () {
          const result = [];
          ${[...allPatterns].map(([k, v]) => `result.push(['${k}', document.${v.updateRef === 'sjc' ? `querySelector('frame').contentDocument.body.` : ''}querySelectorAll('${v.selector}')[${v.offset}].${v.value}])`).join(';\n')}
          return result;
        }
      }
      console.warn('pushing commandlist', ${[...allPatterns].map(([k, v]) => `'[${k}, ${JSON.stringify(v)}]'`).join(',')});
      console.warn(window.getData());
      window.getData();`
  try {
    const result = await openAccounts.get(`${acctID}`).webContents.executeJavaScript(getBalance, false);
    const updatedRecord = result.map(([accountID, accountData]) => {
      // first create the dollars, cents, and [currency] regex from the accountPattern map
      const matchVal = new RegExp(allPatterns.get(accountID).match, 'g');
      const { quantity, currency } = allPatterns.get(accountID);
      // replace using the regex (from config.json) and the replace pattern (from accountList.json)
      // to convert into a signed Float (strip off commas and dollar signs)
      console.log(accountID, accountData, matchVal);
      const matchResult = accountData.match(matchVal)[0];
      return {
        acctID: accountID,
        balance: parseFloat(matchResult.replace(matchVal, quantity).replace('(', '-')),
        currency: matchResult.replace(matchVal, currency)
      }
    });
    console.log('Main: received new balance data from account window', updatedRecord);
    return updatedRecord;
  } catch (err) {
    console.error(err);
    return 'error: problem getting balances';
  }
};

/** open the account window and try the login & scrape sequence
 * uses globals {BrowserWindow}, openAccounts
 * calls getBalances, ipcSend
 * 
 * @param {*} updateRef 
 * @param {*} acctID 
 * @param {*} alreadyOpen 
 * @param {*} openWindow 
 */
const openAccountWindow = (updateRef, acctID, alreadyOpen = false, openWindow = {}) => {

  // takes a file argument and opens a window
  // also stops the title from changing
  const viewerWindow = alreadyOpen ? openWindow : new BrowserWindow({
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

  const waitForPage = ms => new Promise(resolve => setTimeout(resolve, ms));

  const doSomethingOnPage = async entry => {
    try {
      const targetWindow = viewerWindow.webContents;
      if (entry.command === 'type') {
        const alreadyTyped = await targetWindow.executeJavaScript(`
          document.querySelector('${entry.target}').focus();
          console.log('activating focus on', document.querySelector('${entry.target}'));
          (()=>document.querySelector('${entry.target}').value!=='')();
      `, false);
        if (!alreadyTyped) entry.value.split('').map(key => targetWindow.sendInputEvent({ type: 'char', keyCode: key }));
        await waitForPage(500);
      }
      if (entry.command === 'set') {
        await targetWindow.executeJavaScript(`
              document.querySelector('${entry.target}').value = '${entry.value}';
              // console.log(document.querySelector('${entry.target}').value);`
        );
      }
      if (entry.command === 'click') {
        await targetWindow.executeJavaScript(`document.querySelector('${entry.target}').click();`, false);
        await waitForPage(1000);
      }
      return Promise.resolve(entry.command);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  const runCommands = () => commandSequence.map(command => () => doSomethingOnPage(command)).reduce((promise, func) =>
    promise.then(result => func().then(Array.prototype.concat.bind(result))),
    Promise.resolve([]))
    .then(result => waitForPage(5000))
    .then(() => {
      console.log('finished loading redirect page, calling page scrape');
      return getBalances(`${acctID}`);
    })
    .then(message => ipcSend(typeof (message) === 'string' ? 'message' : 'new_balance_available', message))
    .catch(console.error.bind(console));

  const entry = pathArray
    .filter(val => val.updateRef === updateRef).reduce(val => val).updateSequence;

  // pull off the commands
  const url = entry.find(elem => elem.command === 'goto').target;
  const commandSequence = entry.filter(elem => elem.command !== 'goto' && !elem.hasOwnProperty('N_PATTERN'));


  // window not open - set up the listeners and load it.
  if (!alreadyOpen) {
    // When the account is closed, delete it from the map of open accounts
    viewerWindow.on('closed', () => {
      console.log(`Main: window closed: ${acctID}`);
      openAccounts.delete(`${acctID}`);
    });

    viewerWindow.webContents.once('did-stop-loading', e => {
      // every time there's a did-stop-loading event this will fire, many times
      // since there's lots of redirects
      waitForPage(1000);
      console.log(`finished Loading, executing startup commands`);
      runCommands();
    })

    // now open the window
    viewerWindow.loadURL(`${url}`);
    //viewerWindow.loadURL(`file://${__dirname}/accountView.html`)
    //viewerWindow.webContents.send('load_account', url);   
    if (process.env.DEVTOOLS === 'show') viewerWindow.webContents.openDevTools();
    openAccounts.set(`${acctID}`, viewerWindow);
  } else {
    // window is already open, user clicked on the button again
    console.log(`retrying startup commands`);
    runCommands();
  }
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
  if (mainWindow) ipcSend('message', 'loading OK');
});


ipcMain.on('writeOutput', (e, dataType, value) => {
  console.log(chalk.green(`Main: received call to update ${dataType} from window`), e.sender.currentIndex);
  ipcSend('message', `writing new ${dataType}`);
  fse.writeFile(`${dropBoxPath}\\${dataType}.json`, `{ "${dataType}": ${JSON.stringify(value)}}`, err => {
    if (err) {
      if (mainWindow) {
        ipcSend('message', `${err.name}: ${err.message}`);
      }
    } else {
      ipcSend('message', 'file written');
    }
  });
});

ipcMain.on('updateLedger', e => {
  console.log(chalk.green('Main: received call to update ledger from window'), e.sender.currentIndex);
  ipcSend('message', 'updating ledger');
  getData('customLedger')
    .then(results => {
      if (mainWindow) {
        ipcSend(results.dataType, results.value);
        ipcSend('message', 'ledger updated');
        ipcSend('ready');
      }
      return 'done';
    })
    .catch(error => {
      if (mainWindow) {
        ipcSend('message', `Error updating ledger ${error.name}: ${error.message}`);
      }
    });
});

ipcMain.on('open_account', (event, acctID, updateRef) => {
  console.log(chalk.green(`Main: received call to open window for account ${acctID}`));
  ipcSend('message', `opening window for account ${acctID}`);
  let alreadyOpen = false;
  let accountWindow = false;
  // check to see if window already opened - if so just give it the focus
  if (openAccounts.has(`${acctID}`)) {
    console.log(chalk.green(`Main: match found with id ${openAccounts.get(`${acctID}`).id}`));
    openAccounts.get(`${acctID}`).focus();
    accountWindow = openAccounts.get(`${acctID}`);
    alreadyOpen = true;
  }
  ipcSend('message', alreadyOpen ? 'retry login and scrape' : 'account opened');
  openAccountWindow(updateRef, acctID, alreadyOpen, accountWindow);
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

// extract the balance from an opened window, 
ipcMain.on('get_balance', (e, acctID) => {
  if (openAccounts.has(`${acctID}`)) {
    getBalances(`${acctID}`).then(message => {
      ipcSend(typeof (message) === 'string' ? 'message' : 'new_balance_available', message);
    })
      .catch(err => console.error(err));
  } else {
    console.log('Main: unable to retrieve balance until window is open');
  }
});

