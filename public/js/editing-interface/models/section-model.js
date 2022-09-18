/*global define */
define([
  'backbone',
  'underscore',
  'jquery',
  'editing-interface/collections/section-collection',
], function (Backbone, _, $, SectionCollection) {
  return Backbone.Model.extend({
    defaults: function () {
      return {
        summary: '',
        startWord: null,
        thumbnail: null,
      };
    },

    initialize: function () {
      var thisModel = this,
        startWord = thisModel.get('startWord');
      thisModel.switchStartWordListeners(null, startWord);
    },

    toJSON: function () {
      var thisModel = this,
        outp = {};
      outp.start = thisModel.getStartTime();
      outp.end = thisModel.getEndTime();
      outp.summary = thisModel.get('summary');
      outp.thumbnail = thisModel.get('thumbnail').toJSON();
      return outp;
    },

    switchStartWordListeners: function (oldWord, newWord) {
      var thisModel = this;

      // USE STATS
      if (oldWord) {
        window.vdstats.nSecMoves.push(new Date().getTime());
      }

      thisModel.set('startWord', newWord);
      thisModel.listenToOnce(
        newWord,
        'change:switchStartWord',
        thisModel.switchStartWordListeners
      );
      thisModel.listenTo(
        newWord,
        'change:startSection',
        thisModel.handleSectionChange
      );
      thisModel.listenTo(newWord, 'infocus', thisModel.handleGainFocus);
      if (oldWord) {
        thisModel.stopListening(oldWord);
      }
      window.setTimeout(function () {
        thisModel.handleGainFocus();
      }, 200);
    },

    triggerActiveTime: function (activeTime) {
      this.get('startWord') &&
        this.get('startWord').trigger('activeTimeChange', activeTime);
    },

    handleSectionChange: function () {
      var thisModel = this;
      thisModel.destroy();
    },

    handleGainFocus: function () {
      var thisModel = this;
      thisModel.trigger('gainfocus');
    },

    getStartTime: function () {
      return this.get('startWord').get('start');
    },

    getEndTime: function () {
      return this.getEndWord().get('end');
    },

    getEndWord: function () {
      var sw = this.get('startWord'),
        curWord;
      if (sw.next) {
        curWord = this.get('startWord').next;
        while (curWord.next) {
          if (curWord.get('startSection')) {
            break;
          } else {
            curWord = curWord.next;
          }
        }
      } else {
        curWord = sw;
      }
      return curWord;
    },
  });
});
