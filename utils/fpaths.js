/**
 * Filepath utility function
 */

/*global require exports*/

const path = require('path');
const spaths = require('../config/settings').paths;

exports.getVideoFile = function (vid) {
  return path.join(spaths.videos, vid + '.mp4');
};

exports.getAudioFile = function (aid) {
  return path.join(spaths.videos, aid + '.wav');
};

exports.getScreenShotFile = function (base, time) {
  return path.join(spaths.screenshots, base + '--' + time + '.jpg');
};

exports.getSSTransFile = function (vid) {
  return path.join(spaths.ssTrans, 'ss-' + vid);
};
