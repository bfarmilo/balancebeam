const { encode, decode } = require('../../app/actions/decrypt');
const fse = require('fs-extra');

const encodedFile = 'C:\\Users\\bfarm\\Dropbox (Personal)\\Swap\\Budget\\config.json';
const decodedFile = './app/test_results/tempdec.json';

const DECODE = false;
const ENCODE = true;

const readConfig = (inFile, outFile, encodeMode=true) => {
    fse.readJSON(inFile)
    .then(clean => {
        return fse.writeJSON(outFile, encodeMode ? encode(clean) : decode(clean.payload))
    })
    .catch(err => console.error(err));

}

//readConfig(decodedFile, encodedFile, ENCODE);
readConfig(encodedFile, decodedFile, DECODE);