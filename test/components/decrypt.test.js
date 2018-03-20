const { encode, decode } = require('../../app/actions/decrypt');
const clean = require('../../app/test_results/temp.json');
const fse = require('fs-extra');


//fse.writeJSON('./app/test_results/temp.json', decode(clean.payload)).catch(err => console.error(err));
fse.writeJSON('./app/test_results/tempenc.json', encode(clean)).catch(err => console.error(err));