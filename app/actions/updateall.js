const fse = require('fs-extra');
const { getAllUpdates } = require('./getbalances');
const { getDropBoxPath } = require('./getdropbox');

// call with updateall.js [test]

const filePath = '\\Swap\\Budget\\';
const testMode = process.argv[2] === 'test';

let configPath;
let configFile;
let accountFile;

console.log(`UpdateAll called in ${testMode ? 'test' : 'normal'} mode`);

const updateAll = (next) => {
  return getDropBoxPath('personal')
  .then(dropbox => {
    configFile = `${dropbox}${filePath}config.json`;
    accountFile = `${dropbox}${filePath}accountList.json`;
    return fse.readJSON(configFile);
  })
  .then(result => {
    configPath = result.config.updatePath;
    return fse.readJSON(accountFile);
  })
  .then(acct => getAllUpdates(configPath, acct.accountList, testMode))
  .then(data => {
    // console.log('getAllUpdates: got updated account balance data');
    // console.log(`getAllUpdates: writing to ${writePath}`);
    return fse.writeFile(accountFile, `{ "accountList": ${JSON.stringify(data)} }`);
  })
  .then(() => {
    console.log('getAllUpdates: file updated');
    return Promise.resolve(next);
  })
  .catch(error => {
    console.error(error);
    return Promise.reject(error);
  })
};

updateAll();

//module.exports = { updateAll };