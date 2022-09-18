/*global define */
define([
  'backbone',
  'underscore',
  'jquery',
  'editing-interface/collections/section-collection',
  'editing-interface/models/section-model',
], function (Backbone, _, $, SectionCollection, SectionModel) {
  return Backbone.Model.extend({
    defaults: function () {
      return {
        sections: new SectionCollection(),
        startWord: null,
        title: '',
        ytid: '',
        start: null,
        end: null,
        length: null,
      };
    },

    initialize: function (args) {
      var thisModel = this,
        startWord = thisModel.get('startWord');

      // FIXME HACK to keep track of videos
      thisModel.set('vct', window.vct++);
      thisModel.switchStartWordListeners(null, startWord);

      // chapters should have at least one section
      if (thisModel.get('sections').length === 0 && !args.sec2Chap) {
        startWord.set('startSection', true, { silent: true });
        thisModel
          .get('sections')
          .add(new SectionModel({ startWord: startWord }));
      }

      // TODO DRY
      thisModel.on('change:start', function () {
        thisModel.set('length', thisModel.get('end') - thisModel.get('start'));
      });
      thisModel.on('change:end', function () {
        thisModel.set('length', thisModel.get('end') - thisModel.get('start'));
      });
    },

    getStartTime: function () {
      return this.get('start') || this.recomputeStartTime();
    },

    recomputeStartTime: function () {
      this.set('start', this.get('sections').models[0].getStartTime());
      return this.get('start');
    },

    getEndTime: function () {
      return this.get('end') || this.recomputeEndTime();
    },

    getEndWord: function () {
      var secs = this.get('sections').models;
      return secs[secs.length - 1].getEndWord();
    },

    recomputeEndTime: function () {
      var secs = this.get('sections');
      this.set('end', secs.models[secs.length - 1].getEndTime());
      return this.get('end');
    },

    getLength: function () {
      return this.get('length') || this.recomputeLength();
    },

    recomputeLength: function () {
      var start = this.getStartTime(),
        end = this.getEndTime(),
        length = end - start;
      this.set('length', length);
      return length;
    },

    getLengthString: function () {
      var clength = this.getLength(),
        mins = Math.floor(clength / 60),
        secs = Math.floor(clength % 60);
      return mins
        ? secs
          ? mins + ' min ' + secs + ' sec'
          : mins + ' min'
        : secs + ' sec';
    },

    switchStartWordListeners: function (oldWord, newWord) {
      var thisModel = this;

      // USE STATS
      if (oldWord) {
        window.vdstats.nChapMoves.push(new Date().getTime());
      }

      thisModel.set('startWord', newWord);
      thisModel.listenToOnce(
        newWord,
        'change:switchStartWord',
        thisModel.switchStartWordListeners
      );
      thisModel.listenTo(newWord, 'startVideo', function (stTime) {
        thisModel.trigger('startVideo', stTime);
      });
      thisModel.listenTo(newWord, 'change:startChapter', function (wrd, val) {
        if (!val) {
          // USE STATS
          window.vdstats.nChapDeletion.push(new Date().getTime());

          thisModel.destroy();
        }
      });

      // stop listening to the old word
      if (oldWord) {
        thisModel.stopListening(oldWord);
      }
      thisModel.set('start', newWord.get('start'));
    },
  });
});
