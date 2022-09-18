// populate the mongo db with existing aligned transcripts

// TODO figure out upload User
var fs = require('fs');
const User = require('../models/User');
const { VDigest } = require('../models/VDigest');
var execSync = require('execSync');
var spaths = require('../config/settings').paths;
var path = require('path');
var fpaths = require('../utils/fpaths');

var secrets = require('../config/secrets');
var mongoose = require('mongoose');
mongoose.connect(secrets.db);
mongoose.connection.on('error', function () {
  console.error(
    '✗ MongoDB Connection Error. Please make sure MongoDB is running.'
  );
});

var topops = [
  {
    ytid: 'usdJgEwMinM',
    videoName: 'usdJgEwMinM',
    videoLength: -1,
    alignTransName: 'usdJgEwMinM_aligned',
    uploadUser: '',
    state: 1,
    digest: {
      title: "The best stats you've ever seen (expert)",
      author: 'Hans Rosling',
    },
  },
  {
    ytid: 'usdJgEwMinM',
    videoName: 'usdJgEwMinM',
    videoLength: -1,
    alignTransName: 'usdJgEwMinM_aligned',
    uploadUser: '',
    state: 1,
    digest: {
      title: "The best stats you've ever seen (crowdsourced)",
      author: 'Hans Rosling',
    },
  },
  {
    ytid: '5P-srHlBy50',
    videoName: '5P-srHlBy50',
    videoLength: -1,
    alignTransName: '5P-srHlBy50_aligned',
    uploadUser: '',
    state: 1,
    digest: {
      title: 'The Power of Protyping (expert)',
      author: 'Scott Klemmer',
    },
  },
  {
    ytid: '5P-srHlBy50',
    videoName: '5P-srHlBy50',
    videoLength: -1,
    alignTransName: '5P-srHlBy50_aligned',
    uploadUser: '',
    state: 1,
    digest: {
      title: 'The Power of Protyping (crowdsourced)',
      author: 'Scott Klemmer',
    },
  },
  {
    ytid: 'ghgPq2wjQUQ',
    videoName: 'ghgPq2wjQUQ',
    videoLength: -1,
    alignTransName: 'ghgPq2wjQUQ_aligned',
    uploadUser: '',
    state: 1,
    digest: {
      title: 'US History Overview 1: Jamestown to the Civil War (expert)',
      author: 'Sal Khan',
    },
  },
  {
    ytid: 'ghgPq2wjQUQ',
    videoName: 'ghgPq2wjQUQ',
    videoLength: -1,
    alignTransName: 'ghgPq2wjQUQ_aligned',
    uploadUser: '',
    state: 1,
    digest: {
      title: 'US History Overview 1: Jamestown to the Civil War (crowdsourced)',
      author: 'Sal Khan',
    },
  },
];

var main = function () {
  console.log('starting main with admin email: ' + process.env.MYEMAIL);
  User.findOne({ email: process.env.MYEMAIL }, function (err, adminuser) {
    console.log('found user');
    if (err || !adminuser) {
      console.log('error obtaining admin user');
      return;
    }

    // find all of the videos and json files
    topops.forEach(function (popel) {
      var vfile = fpaths.getVideoFile(popel.videoName);
      popel.videoLength = execSync.exec(
        'ffprobe -loglevel error -show_streams ' +
          vfile +
          ' | grep duration= | cut -f2 -d= | head -n 1'
      ).stdout;
      console.log('video length is: ' + popel.videoLength);

      // read in the aligned trans
      var alignFile = path.join(spaths.tmp, popel.alignTransName + '.json');
      delete popel.alignTransName;
      console.log('reading' + alignFile);
      fs.readFile(alignFile, 'utf8', function (err2, aligndata) {
        if (err2 || !aligndata) {
          console.log('unable to read the aligned transcript: ' + err2);
          return;
        }
        var alignJson = JSON.parse(aligndata);
        alignJson.words[0].speaker = '0';

        // save the el
        popel.alignTrans = alignJson;
        popel.uploadUser = adminuser;
        var vdigest = new VDigest(popel);
        vdigest.save(function (err) {
          if (err) {
            console.log('unable to save the video digest');
            console.log(err);
            return;
          } else {
            adminuser.vdigests.push(vdigest);
            adminuser.save();
            console.log('sucessfully saved ' + popel.digest.title);
          }
        });
        // save the element
      });
    }); // end forEach
  });
};

if (require.main === module) {
  main();
}
