const fse = require('fs-extra');
const { getAllUpdates } = require('./getbalances');

const writePath = `${process.argv[2]}\\accountList.json`;
const config = `${process.argv[2]}\\${process.argv[3]}`;

let configPath;

console.log(`UpdateAll called with ${config}`);

fse.readJSON(config)
  .then(result => {
    configPath = result.config.updatePath;
    return fse.readJSON(writePath);
  })
  .then(acct => getAllUpdates(configPath, acct.accountList))
  .then(data => {
    console.log('getAllUpdates: got updated account balance data');
    console.log(`getAllUpates: writing to ${writePath}`);
    return fse.writeFile(`${writePath}`, `{ "accountList": ${JSON.stringify(data)} }`);
  })
  .then(() => console.log('getAllUpdates: file updated'))
  .catch((error) => {
    console.error(error);
  });
