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

const exec = require('child_process').exec;

let checkAccount = true;

let dropBoxPath = '';

let mainWindow = null;

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
    .catch(console.log);
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

  mainWindow.loadURL(`file://${__dirname}/app.html`);

  // now do all of the loading, firing events as you go

  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    mainWindow.show();
    mainWindow.focus();
    getAllData(mainWindow.webContents)
      .then((result) => result.map(item => {
        if (mainWindow) mainWindow.webContents.send(item.dataType, item.value);
        return item;
      }).filter(val => (val.dataType === 'accountList'))
      )
      .then((result) => {
        if (mainWindow) mainWindow.webContents.send('ready');
        const todayDate = new Date();
        if (checkAccount &&
          (result.reduce(val => val).value.findIndex(val => val.balanceDate === todayDate.toISOString().split('T')[0]) === -1)) {
          checkAccount = false;
          if (mainWindow) updateAccounts(mainWindow.webContents);
        }
        console.log('all promises resolved');
        return 'done';
      })
      .catch(err => {
        if (mainWindow) {
          mainWindow.webContents.send('message', `Error with getting initial data ${err}`);

          mainWindow.webContents.send('message', 'ready');
        }
      });
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
      console.error(stderr);
      if (err || stderr) {
        if (mainWindow) {
          mainWindow.webContents.send('message', 'Error executing updateall');
        }
        return reject(stderr);
      }
      return resolve('accountList');
    });
  })
    .then(account => getData(account))
    .then(results => {
      if (target) target.send(results.dataType, results.value);
      return 'done';
    })
    .catch(err => {
      console.error(err);
      if (mainWindow) {
        mainWindow.webContents.send('message', `Error updating Accounts ${JSON.stringify(err)}`);
      }
    });
};

const getData = (dataType) => new Promise((resolve, reject) => {
  // mainWindow.webContents.send('message', `Loading ${dataType} data`);
  console.log(`Main: Loading ${dropBoxPath}\\${dataType}.json`);
  fse.readJSON(`${dropBoxPath}\\${dataType}.json`)
    .then(resultData => {
      console.log(`Main: Good ${dataType} data`);
      return resolve({ dataType, value: resultData[dataType] });
    })
    .catch(err1 => {
      console.error(`Error getting ${dataType} data: ${err1}`);
      return reject(err1);
    });
});

const getAllData = (target) => {
  target.webContents.send('message', 'Loading local data files...');
  return Promise.all(['budgetList', 'customLedger', 'accountList'].map(getData));
};

// on startup

if (process.env.LOCALAPPDATA) {
  fse.readJSON(`${process.env.LOCALAPPDATA}//Dropbox//info.json`)
    .then(dropbox => {
      dropBoxPath = `${dropbox.personal.path}\\Swap\\Budget`;
      return console.log(`Main: Good DropBox Path:${dropBoxPath}`);
    })
    .catch(error => {
      if (mainWindow) {
        mainWindow.webContents.send('message', `Error with dropbox path ${error.name}: ${error.message}`);
      }
    });
}
// event listeners

ipcMain.on('recover', e => {
  console.log('Main: received error OK window', e.sender.currentIndex);
  if (mainWindow) mainWindow.webContents.send('message', 'ready');
});

ipcMain.on('update', e => {
  console.log('Main: received update request from window', e.sender.currentIndex);
  if (mainWindow) updateAccounts(mainWindow.webContents);
});

ipcMain.on('writeOutput', (e, dataType, value) => {
  console.log(`Main: received call to update ${dataType} from window`, e.sender.currentIndex);
  fse.writeFile(`${dropBoxPath}\\${dataType}.json`, `{ "${dataType}": ${JSON.stringify(value)}}`, err => {
    if (err) {
      if (mainWindow) {
        mainWindow.webContents.send('message', `${err.name}: ${err.message}`);
      }
    }
  });
});

ipcMain.on('updateLedger', e => {
  console.log('Main: received call to update ledger from window', e.sender.currentIndex);
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
