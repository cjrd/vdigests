const {
  promises: fs,
  constants: { R_OK },
} = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { paths: spaths } = require('../config/settings');
const { youtubeUrlFromId } = require('./url-helpers');

async function getSmallVideo({ ytid }) {
  console.log('Checking video file for: ', ytid);
  const filename = `${ytid}.mp4`;
  const videoPath = path.join(spaths.videos, filename);
  try {
    await fs.access(videoPath, R_OK);
    // The file already exists
    console.log('Video file already downloaded for:', ytid);
    return;
  } catch (err) {
    // we need to download it
  }

  console.log('Downloading video file for:', ytid);

  // get the worst quality video because we only need it for screenshots
  const ytdlCommand = `youtube-dl -f worst --recode-video mp4 -o '${path.join(
    spaths.videos,
    `${ytid}.%(ext)s`
  )}' ${youtubeUrlFromId(ytid)}`;
  console.log('cmd: ' + ytdlCommand);
  return new Promise((resolve, reject) => {
    exec(ytdlCommand, async function (error, stdout, stderr) {
      if (error) {
        console.error('error:', error);
        console.error('stderror:', stderr);
        reject('unable to get YouTube video video');
      } else {
        try {
          // make sure it exists now
          await fs.access(videoPath, R_OK);
          console.log('Downloaded video file for: ', ytid);
          resolve();
        } catch (err) {
          console.error('error:', err);
          reject(err);
        }
      }
    });
  });
}

module.exports = {
  getSmallVideo,
};
