/**
 * GET /screenshot
 * Return a screenshot of the given video at the given time
 */
/*global require exports Buffer*/
const fs = require('fs');
const { VDigest } = require('../models/VDigest');
const path = require('path');
const pathUtils = require('../utils/fpaths');
const { paths: spaths } = require('../config/settings');
const { exec } = require('child_process');
const { returnError } = require('../utils/errors');
const { getSmallVideo } = require('./video-download');

exports.getScreenShot = async function (req, res, next) {
  const vdid = req.query.id;
  const time = req.query.time.substr(0, 6) || 0;
  let usetime;

  try {
    usetime = Number(time);
    if (usetime < 0) {
      throw new Error('screenshot time is out of bounds');
    }
  } catch (e) {
    returnError(
      res,
      'time must be a nonegative number and indicate the the second value of the screenshot',
      next
    );
  }

  let vd;
  try {
    vd = await VDigest.findByPk(vdid);
  } catch (err) {
    returnError(
      res,
      'cannot create a screenshot: unable to find the given video digest',
      next
    );
    return;
  }
  if (!vd || !vd.videoName) {
    returnError(
      res,
      'cannot create a screenshot: unable to find the given video digest',
      next
    );
    return;
  }

  usetime = Math.min(usetime, vd.videoLength - 0.3); // TODO fix the screenshot edge case
  const ytid = vd.videoName;
  try {
    await getSmallVideo({ ytid });
  } catch (err) {
    // file doesn't exist
    returnError(
      res,
      'cannot create a screenshot: unable to get the given video',
      next
    );
    return;
  }

  const videoFile = vd.getVideoFile;
  const outssFile = pathUtils.getScreenShotFile(ytid, usetime);
  const cmd =
    'nice -n 10 ffmpeg -ss ' +
    usetime +
    ' -i ' +
    videoFile +
    ' -f image2 -vframes 1 -y ' +
    outssFile;
  console.log(cmd);

  exec(cmd, function (err2) {
    console.log('finished execution');

    if (err2) {
      returnError(res, 'system error while taking screenshot', next);
      return;
    }
    fs.readFile(outssFile, function (err3, img) {
      if (err2) {
        returnError(res, 'system error while taking screenshot', next);
        return;
      }
      const base64Image =
        'data:image/jpeg;base64,' +
        new Buffer(img, 'binary').toString('base64');
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end(base64Image);
    });
  });
};
