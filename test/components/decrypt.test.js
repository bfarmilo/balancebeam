const { encode, decode, encryptDecrypt } = require('../../app/actions/decrypt');
const fse = require('fs-extra');

const encodedFile = 'C:\\Users\\bfarm\\Dropbox (Personal)\\Swap\\Budget\\config.json';
const decodedFile = './app/test_results/tempdec.json';
const tempEnc = './app/test_results/tempenc.json';
const crypto = require('crypto');

const DECODE = false;
const ENCODE = true;

const readConfig = async (inFile, outFile, encodeMode, password = '') => {
    try {
        let inputContents = await fse.readJSON(inFile);
        let outputContents;
        if (password === '') {
            outputContents = encodeMode ? encode(inputContents) : decode(inputContents.payload);
        } else {
            outputContents = await encryptDecrypt(password, inputContents, encodeMode);
        }
        await fse.writeJSON(outFile, outputContents);
        return Promise.resolve(outputContents);
    } catch {
        err => Promise.reject(err)
    };
}

//first create a sandboxed decoded file
/*readConfig(encodedFile, decodedFile, DECODE, '')
    .then(firstResult => {
        console.log(firstResult); // this is now a decoded file we can use
        return readConfig(decodedFile, encodedFile, ENCODE, process.env.BALANCE);
    })*/


const newHash = crypto.createHash('SHA256').update(process.env.BALANCE).digest('hex');
readConfig(encodedFile, decodedFile, DECODE, newHash)
    .then(decoded => console.log(decoded))
    .catch(err => console.error(err));


//readConfig(decodedFile, encodedFile, ENCODE);
//readConfig(encodedFile, decodedFile, DECODE);