const crypto = require('crypto');

const encryptDecrypt = (password, input, encode) => new Promise((resolve, reject) => {
    try {
        const ALGORITHM = 'AES-256-CBC';
        const HASH = 'SHA256';
        let iv;

        const inputIsObject = typeof (input) === 'object';
        let data;
        if (encode) {
            iv = crypto.randomBytes(16);
            const hash = Buffer.from(crypto.createHash(HASH).update(password).digest('hex'), 'hex');
            // encode mode is only used to update the files. Best to do this on the server side.
            // if the input is a JSON object, convert to string
            data = inputIsObject ? JSON.stringify(input) : input;
            // encrypt
            encryptor = crypto.createCipheriv(ALGORITHM, hash, iv);
            encryptor.setEncoding('hex');
            encryptor.write(data, 'utf8', 'hex');
            encryptor.end();
            const payload = encryptor.read();
            // return the encrypted data in an object with key=payload;
            return resolve({ iv:iv.toString('hex'), payload });
        } else {
            // for decode mode, if the input is an object pull off the payload
            data = inputIsObject ? input.payload : input;
            iv = Buffer.from(input.iv, 'hex');
            // in decode mode, password should be the hashed password
            const key = Buffer.from(password, 'hex');
            // decrypt
            const decryptor = crypto.createDecipheriv(ALGORITHM, key, iv);
            let decrypted = decryptor.update(data, 'hex', 'utf8');
            decrypted += decryptor.final('utf8');
            // return an object
            return resolve(JSON.parse(decrypted));
        }
    } catch (err) {
        return reject(err);
    }
});

const encode = (input) => {
    return { payload: Buffer.from(JSON.stringify(input), 'utf8').toString('base64') }
}

const decode = (payload) => {
    return JSON.parse(Buffer.from(payload, 'base64').toString());
}

module.exports = {
    encode,
    decode,
    encryptDecrypt
}