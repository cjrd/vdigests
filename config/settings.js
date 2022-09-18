/**
 * Global settings
 */
/*global require module __dirname*/

var mkdirp = require('mkdirp'),
  path = require('path'),
  ffdataPath = path.normalize(path.join(__dirname, '..', 'ffdata')),
  paths = {
    alignpy: path.join(ffdataPath, '../submods/p2fa-vislab/align.py'),
    alignpy: '../submods/p2fa-vislab/align.py',
    ffdata: ffdataPath,
    videos: path.join(ffdataPath, 'videos'),
    audio: path.join(ffdataPath, 'audio'),
    screenshots: path.join(ffdataPath, 'vdscreenshots'),
    ssTrans: path.join(ffdataPath, 'sstrans'),
    rawTrans: path.join(ffdataPath, 'rawtrans'),
    tmp: path.join(ffdataPath, 'tmp'),
  };

/** create the paths if they don't exist **/
for (var pth in paths) {
  if (paths.hasOwnProperty(pth)) {
    mkdirp(paths[pth]);
  }
}

module.exports = {
  paths,
  maxTransUploadSize: 21000000, // in bytes
  max_yt_length: 20000,
};
