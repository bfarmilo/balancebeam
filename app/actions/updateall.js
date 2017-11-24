const fse = require('fs-extra');
const { getAllUpdates } = require('./getbalances');
const { getDropBoxPath } = require('./getdropbox');

// call with updateall.js path_to_json_files config_file_name [test]

const filePath = '\\Swap\\Budget\\';
const testMode = process.argv[2] === 'test';

let configPath;
let configFile;
let accountFile;

console.log(`UpdateAll called in ${testMode ? 'test' : 'normal'} mode`);

getDropBoxPath('personal')
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
  .then(() => console.log('getAllUpdates: file updated'))
  .catch((error) => {
    console.error(error);
  });
