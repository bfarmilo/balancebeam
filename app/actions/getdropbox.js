const fse = require('fs-extra');

/**
 * getDropBoxPath returns the full path to the selected dropbox folder
 * @param type:string 'personal' or 'business', the dropbox path to return
 * @returns string, the full path to the resource
 **/

const getDropBoxPath = (type) => {
  return fse.readJSON(`${process.env.LOCALAPPDATA}//Dropbox//info.json`, 'utf8')
    .then(pathdata => Promise.resolve(pathdata[type.toLowerCase()].path))
    .catch(err2 => Promise.reject(`Error getting Dropbox path: ${err2}`));
};

module.exports = {
  getDropBoxPath
};
