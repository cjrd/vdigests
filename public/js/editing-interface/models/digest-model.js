/*global define */
define([
  'backbone',
  'underscore',
  'jquery',
  'editing-interface/collections/chapter-collection',
  'editing-interface/models/chapter-model',
], function (Backbone, _, $, ChapterCollection, ChapterModel) {
  return Backbone.Model.extend({
    defaults: function () {
      return {
        title: '',
        author: '',
        chapters: new ChapterCollection(),
        videoLength: -1,
      };
    },

    initialize: function () {
      var thisModel = this,
        chaps = thisModel.get('chapters');

      // add remove and move events on chapters should recompute all start and stop times
      thisModel.listenTo(chaps, 'add', function (chp) {
        // recompute the ends of all chapters
        thisModel.recomputeChapEnds();
      });

      thisModel.listenTo(chaps, 'change:start', function () {
        // recompute the ends of all chapters
        thisModel.recomputeChapEnds();
      });

      thisModel.listenTo(chaps, 'remove', function (chp) {
        // make sure we have remaining sections
        if (chp.get('sections').length == 0) {
          return;
        }

        // move the remaining sections
        var chpStartTime = chp
            .get('sections')
            .models[0].get('startWord')
            .get('start'),
          closestChapter,
          curMin = Infinity;
        chaps.each(function (ochap) {
          var cstime = ochap
              .get('sections')
              .models[0].get('startWord')
              .get('start'),
            tDiff = chpStartTime - cstime;

          if (tDiff > 0 && tDiff < curMin) {
            curMin = tDiff;
            closestChapter = ochap;
          }
        });

        if (closestChapter) {
          closestChapter.get('sections').add(chp.get('sections').models);
        } else {
          console.log('chapter removed with no preceeding chapter');
        }
        // recompute the ends of all chapters
        thisModel.recomputeChapEnds();
      });
    },

    recomputeChapEnds: function () {
      var thisModel = this;
      thisModel.get('chapters').each(function (chap) {
        chap.recomputeEndTime();
      });
    },
  });
});
