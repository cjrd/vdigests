/*global define */
define([
  'backbone',
  'underscore',
  'jquery',
  'editing-interface/collections/word-collection',
], function (Backbone, _, $, WordCollection) {
  return Backbone.Model.extend({
    defaults: function () {
      return {
        words: new WordCollection(),
      };
    },

    initialize: function () {
      var thisModel = this,
        prevAW = null;
      thisModel.get('words').on('activeTimeChange', function (activeTime) {
        // linked list traversal to update the active word
        if (!prevAW) {
          prevAW = thisModel.get('words').models[0];
        }
        if (
          prevAW.get('start') > activeTime ||
          prevAW.get('end') < activeTime
        ) {
          // update the active word
          var isEarly = prevAW.get('start') > activeTime,
            curWord,
            dir = isEarly ? 'prev' : 'next';
          curWord = prevAW[dir];
          while (
            curWord &&
            (curWord.get('start') > activeTime ||
              curWord.get('end') < activeTime)
          ) {
            curWord = curWord[dir];
          }
          prevAW && prevAW.set('active', false);
          if (curWord) {
            curWord.set('active', true);
            prevAW = curWord;
          } else {
            prevAW = null;
          }
        }
      });
    },

    /**
     * Parse the transcript model
     */
    parse: function (resp, jqxhr) {
      var words = this.get('words') || this.defaults().words;
      words.add(resp.words);
      // make the words a "linked list" TODO can the words change?
      var prevWord = null;
      words.each(function (wrd, i) {
        if (prevWord) {
          wrd.id = i;
          prevWord.next = wrd;
          wrd.prev = prevWord;
        }
        prevWord = wrd;
      });
      return { words: words };
    },

    /**
     * Change the chapter/section breakpoint -- fire a custom event
     */
    changeBreakStart: function (oldStartModel, newStartModel) {
      var thisModel = this,
        oldStartChap = oldStartModel.get('startChapter'),
        oldStartSec = oldStartModel.get('startSection');
      oldStartModel.set('startChapter', false, { silent: true });
      oldStartModel.set('startSection', false, { silent: true });

      newStartModel.set('startChapter', oldStartChap, { silent: true });
      newStartModel.set('startSection', oldStartSec, { silent: true });
      oldStartModel.trigger(
        'change:switchStartWord',
        oldStartModel,
        newStartModel
      );
      newStartModel.trigger(
        'change:switchStartWord',
        oldStartModel,
        newStartModel
      );
    },

    resetState: function () {
      var thisModel = this;
      thisModel.get('words').each(function (wrd) {
        wrd.set('startChapter', false);
        wrd.set('startSection', false);
      });
    },
  });
});
