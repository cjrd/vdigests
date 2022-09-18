/*global define */
define([
  'backbone',
  'underscore',
  'jquery',
  'editing-interface/models/digest-model',
  'editing-interface/models/transcript-model',
  'editing-interface/models/chapter-model',
  'editing-interface/models/section-model',
  'editing-interface/utils/utils',
  'editing-interface/models/thumbnail-model',
], function (
  Backbone,
  _,
  $,
  DigestModel,
  TranscriptModel,
  ChapterModel,
  SectionModel,
  Utils,
  ThumbnailModel
) {
  const addThumbnails = async function (toAddThumbs) {
    for (const addThumb of toAddThumbs) {
      addThumb.addSec.set(
        'thumbnail',
        new ThumbnailModel({ data: addThumb.data, time: addThumb.time })
      );
    }

    const thumbsWithoutData = toAddThumbs.filter((addThumb) => !addThumb.data);
    for (const addThumb of thumbsWithoutData) {
      try {
        const data = await Utils.getScreenShot(addThumb.vdid, addThumb.time);
        addThumb.addSec.set(
          'thumbnail',
          new ThumbnailModel({ data, time: addThumb.time })
        );
      } catch (err) {
        // couldn't get the thumbnail - oh well!
      }
    }
  };

  return Backbone.Model.extend({
    defaults: function () {
      return {
        digest: new DigestModel(),
        transcript: new TranscriptModel(),
        ytid: '',
      };
    },

    url: function () {
      return `/digestdata/${this.id}?task=${this.attributes.task}`;
    },

    initialize: function () {
      var thisModel = this;

      // USE STATS
      window.editorModel = thisModel;
    },

    /**
     * Make sure we have at least one chapter in our digest and transcript
     */
    postInit: function () {
      var thisModel = this;

      // setup appropriate event listeners
      thisModel.listenTo(
        thisModel.get('transcript').get('words'),
        'change:startSection',
        thisModel.handleSectionChange
      );
      thisModel.listenTo(
        thisModel.get('transcript').get('words'),
        'change:startChapter',
        thisModel.handleChapterChange
      );

      // add init data if it exists
      if (thisModel.toAddDigest) {
        thisModel.useJSONData(thisModel.toAddDigest);
        // TODO: block the rest of the UI if this postInit throws an error
        thisModel.toAddDigest = null;
      }

      // mark the first chapter if no chapters are present
      var chaps = thisModel.get('digest').get('chapters');
      if (!chaps.length) {
        var fw = thisModel.get('transcript').get('words').first();
        fw.set('startChapter', true);
      }
    },

    /**
     * Listen for an event corresponing to a chapter change
     */
    handleChapterChange: function (chWord, newVal) {
      var thisModel = this,
        chaps = thisModel.get('digest').get('chapters'),
        chWordStTime = chWord.get('start');

      // USE STATS
      if (!window.changingSecChap) {
        if (newVal) {
          window.vdstats.nChapCreation.push(new Date().getTime());
        }
      }

      if (newVal) {
        var sec2Chap = chWord.get('startSection');
        // we're creating a new chapter
        var newChap = new ChapterModel({
            ytid: thisModel.get('ytid'),
            startWord: chWord,
            sec2Chap: sec2Chap,
          }),
          prevChWord = chWord.getPrevChapterStart();

        if (prevChWord) {
          var prevChap = chaps.findWhere({ startWord: prevChWord });
          var addSecs = prevChap.get('sections').filter(function (sec) {
            var sw = sec.get('startWord');
            return sw.get('start') >= chWordStTime;
          });
          prevChap.get('sections').remove(addSecs);
          newChap.get('sections').add(addSecs);
        }
        chaps.add(newChap);
      }
    },

    /**
     * Listen for an event corresponing to a section change
     */
    handleSectionChange: function (chWord, newVal) {
      var thisModel = this,
        chaps = thisModel.get('digest').get('chapters');

      if (!window.changingSecChap) {
        // USE STATS
        if (newVal) {
          window.vdstats.nSecCreation.push(new Date().getTime());
        } else {
          window.vdstats.nSecDeletion.push(new Date().getTime());
        }
      }

      if (newVal) {
        // we're adding a section
        var prevChapStWord = chWord.getPrevChapterStart(),
          prevSecStWord = chWord.getPrevSectionStart();

        if (chWord.get('startChapter')) {
          prevChapStWord = chWord;
        }
        if (!prevChapStWord) {
          throw Error('section marked without a chapter existing');
        }

        var prevChap = chaps.findWhere({ startWord: prevChapStWord }),
          newSection = new SectionModel({ startWord: chWord });
        prevChap.get('sections').add(newSection);
      } else {
        // we're removing a section TODO FIXME
        console.log('editor model false section');
      }
    },

    parse: function (inpData) {
      var thisModel = this,
        output = _.extend(thisModel.defaults(), thisModel.attributes);
      // todo, change the existing transcipt...
      output['transcript'] = new TranscriptModel(
        { words: inpData.transcript.words },
        { parse: true }
      );
      output['ytid'] = inpData.ytid;
      thisModel.toAddDigest = inpData;
      return output;
    },

    // TODO this technique needs major refactoring
    useJSONData: function (jsonData) {
      // parse the segment data
      var thisModel = this,
        words = thisModel.get('transcript').get('words'),
        inpData = jsonData.digest;

      // reset the transcript
      thisModel.get('transcript').resetState();

      if (inpData.title) {
        thisModel.get('digest').set('title', inpData.title);
      }
      if (inpData.author) {
        thisModel.get('digest').set('author', inpData.author);
      }
      if (jsonData.videoLength) {
        thisModel.get('digest').set('videoLength', jsonData.videoLength);
      }

      // TODO write converter for previous schema
      var parsechaps = [];
      _.each(inpData.chapters || inpData, function (chobj) {
        var outchap = {
          sections: [],
          startWord: null,
          title: chobj.title,
          ytid: chobj.ytid,
        };
        _.each(chobj.sections, function (sec) {
          var outsec = {
            summary: Array.isArray(sec.summary) ? sec.summary[0] : sec.summary,
            startWord: null,
            image_time: sec.thumbnail && sec.thumbnail.time,
            image_data: sec.thumbnail && sec.thumbnail.data,
          };

          // find the start word
          var closestWord = null,
            closestDist = Infinity,
            compTime = sec.start;
          words.each(function (wrd) {
            var dist = Math.abs(wrd.get('start') - compTime);
            if (dist < closestDist) {
              closestDist = dist;
              closestWord = wrd;
            }
          });
          outsec.startWord = closestWord;
          outchap.sections.push(outsec);
        });
        parsechaps.push(outchap);
      });

      var modelChaps = thisModel.get('digest').get('chapters'),
        toAddThumbs = [];
      // set the start word of the chapter
      _.each(parsechaps, function (chp) {
        var mchp;
        _.each(chp.sections, function (sec, i) {
          var addSec = null;
          if (i === 0) {
            sec.startWord.set('startChapter', true);
            mchp = modelChaps.findWhere({ startWord: sec.startWord });
            // FIXME hack
            mchp.swapping = true;
            mchp.set('title', chp.title);
            mchp.set('ytid', chp.ytid || thisModel.get('ytid'));
            // chapter has been created
          } else {
            sec.startWord.set('startSection', true);
          }
          addSec = mchp.get('sections').findWhere({ startWord: sec.startWord });
          if (addSec) {
            addSec.set('summary', sec.summary);
          } else {
            throw Error('unable to find section matching start word');
          }
          toAddThumbs.push({
            vdid: window.dataname,
            time: sec.image_time,
            addSec: addSec,
            data: sec.image_data,
          });
        });
        mchp.swapping = false;
      });
      addThumbnails(toAddThumbs);
    },
  });
});
