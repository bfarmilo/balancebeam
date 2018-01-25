const encode = (input) => {
    return {payload: Buffer.from(JSON.stringify(input), 'utf8').toString('base64')}
}

const decode = (payload) => {
    return JSON.parse(Buffer.from(payload, 'base64').toString());
}

module.exports ={
    encode,
    decode
}