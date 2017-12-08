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

import { getDropBoxPath } from './actions/getdropbox';

const exec = require('child_process').exec;

let checkAccount = true;

let dropBoxPath = '';
const openAccounts = new Map();
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
    pathArray = config.config.updatePath;
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
    mainWindow.show();
    mainWindow.focus();
    getAllData(mainWindow.webContents)
      .then(result => {
        return result.map(item => {
          if (mainWindow) mainWindow.webContents.send(item.dataType, item.value);
          return item;
        }).filter(val => (val.dataType === 'accountList'))
      })
      .then((result) => {
        if (mainWindow) mainWindow.webContents.send('ready');
        const todayDate = new Date();
        if (checkAccount &&
          (result.reduce(val => val).value.findIndex(val => val.balanceDate === todayDate.toISOString().split('T')[0]) === -1)) {
          checkAccount = false;
          if (mainWindow) updateAccounts(mainWindow.webContents);
        }
        console.log(chalk.green('all promises resolved'));
        return 'done';
      })
      .catch(err => {
        if (mainWindow) {
          mainWindow.webContents.send('message', `Error with getting initial data ${err}`);

          mainWindow.webContents.send('message', 'ready');
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
const updateAccounts = (target) => {
  new Promise((resolve, reject) => {
    exec(`node ./app/actions/updateall.js "${dropBoxPath}" "config.json"`, (err, stdout, stderr) => {
      console.error(chalk.red(`${stderr}`));
      if (err || stderr) {
        if (mainWindow) {
          mainWindow.webContents.send('message', 'Error executing updateall');
        }
        return reject(stderr);
      }
      console.log(chalk.green('updateAccounts: '), stdout);
      return resolve('accountList');
    });
  })
    .then(account => getData(account))
    .then(results => {
      if (target) target.send(results.dataType, results.value);
      return 'done';
    })
    .catch(err => {
      console.error(chalk.red(`${err}`));
      if (mainWindow) {
        mainWindow.webContents.send('message', `Error updating Accounts ${JSON.stringify(err)}`);
      }
    });
};

const getData = (dataType) => new Promise((resolve, reject) => {
  // mainWindow.webContents.send('message', `Loading ${dataType} data`);
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

const getAllData = (target) => {
  target.webContents.send('message', 'Loading local data files...');
  return Promise.all(['budgetList', 'customLedger', 'accountList'].map(getData));
};

const openAccountWindow = (updateRef, acctID) => {
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

  // When the account is closed, delete it from the map of open accounts
  viewerWindow.on('closed', () => {
    console.log(chalk.green(`Main: window closed: ${acctID}`));
    openAccounts.delete(`${acctID}`);
  });

  viewerWindow.webContents.once('did-finish-load', e => {
    console.log(chalk.green(`finished Loading, inserting login information`));
    viewerWindow.webContents.executeJavaScript(
      `document.querySelector("${login.target}").value = "${login.value}"; document.querySelector("${pwd.target}").value = "${pwd.value}"`
    );
  });

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
  if (mainWindow) mainWindow.webContents.send('message', 'ready');
});

ipcMain.on('update', e => {
  console.log(chalk.green('Main: received update request from window'), e.sender.currentIndex);
  if (mainWindow) updateAccounts(mainWindow.webContents);
});

ipcMain.on('writeOutput', (e, dataType, value) => {
  console.log(chalk.green(`Main: received call to update ${dataType} from window`), e.sender.currentIndex);
  fse.writeFile(`${dropBoxPath}\\${dataType}.json`, `{ "${dataType}": ${JSON.stringify(value)}}`, err => {
    if (err) {
      if (mainWindow) {
        mainWindow.webContents.send('message', `${err.name}: ${err.message}`);
      }
    }
  });
});

ipcMain.on('updateLedger', e => {
  console.log(chalk.green('Main: received call to update ledger from window'), e.sender.currentIndex);
  getData('customLedger')
    .then(results => {
      if (mainWindow) {
        mainWindow.webContents.send(results.dataType, results.value);
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
  console.log(chalk.green(`Main: received call to open window for ${acctID}`));
  let alreadyOpen = false;
  // check to see if window already opened - if so just give it the focus
  if (openAccounts.has(`${acctID}`)) {
    console.log(chalk.green(`Main: match found with id ${openAccounts.get(`${acctID}`).id}`));
    BrowserWindow.fromId(openAccounts.get(`${acctID}`).id).focus();
    alreadyOpen = true;
  }
  if (!alreadyOpen) {
    // else open new window
    openAccountWindow(updateRef, acctID);
  }
});

ipcMain.on('get_exchange', (event) => {
  console.log(chalk.green(`Main: received call to open exchange window`));
  let alreadyOpen = false;
  // check to see if window already opened - if so just give it the focus
  if (openAccounts.has('exchange')) {
    console.log(chalk.green(`Main: match found with id ${openAccounts.get('exchange').id}`));
    BrowserWindow.fromId(openAccounts.get('exchange').id).focus();
    alreadyOpen = true;
  }
  if (!alreadyOpen) {
    // else open new window
    openExchangeWindow();
  }
})

