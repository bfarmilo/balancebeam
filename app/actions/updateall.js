const fse = require('fs-extra');
const { getAllUpdates } = require('./getbalances');

// call with updateall.js path_to_json_files config_file_name [test]

const writePath = `${process.argv[2]}\\accountList.json`;
const config = `${process.argv[2]}\\${process.argv[3]}`;
const testMode = process.argv[4] === 'test';

let configPath;

console.log(`UpdateAll called with ${config} in ${testMode ? 'test' : 'normal'} mode`);

fse.readJSON(config)
  .then(result => {
    configPath = result.config.updatePath;
    return fse.readJSON(writePath);
  })
  .then(acct => getAllUpdates(configPath, acct.accountList, testMode))
  .then(data => {
    // console.log('getAllUpdates: got updated account balance data');
    // console.log(`getAllUpdates: writing to ${writePath}`);
    return fse.writeFile(`${writePath}`, `{ "accountList": ${JSON.stringify(data)} }`);
  })
  .then(() => console.log('getAllUpdates: file updated'))
  .catch((error) => {
    console.error(error);
  });
