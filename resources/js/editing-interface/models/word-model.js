
/*global define */
define(["backbone", "underscore", "jquery"], function (Backbone, _, $) {

  return Backbone.Model.extend({
    defaults: function () {
      return {
        start: -1,
        end: -1,
        word: "",
        alignedWord: "",
        speaker: -1,
        startSection: false,
        startChapter: false
      };
    },

    /**
     * Traverse the word linked list
     * goForward: true to search forward
     * breakType: {"Section", "Chapter"}
     * breakEnd: {"start"}
     * checkThisModel: true to check this model
     */
    traverseCheck: function (goForward, breakType, breakEnd, checkThisModel) {
      var thisModel = this,
          dir = goForward ? "next" : "prev",
          typeKey = breakEnd + breakType;
      if (checkThisModel && thisModel && thisModel.get(typeKey)) {
        return thisModel;
      }
      else if (!thisModel[dir]) {
        return null;
      } else {
        return thisModel[dir].traverseCheck(goForward, breakType, breakEnd, true);
      }
    },

    getPrevChapterStart: function () {
      return this.traverseCheck(false, "Chapter", "start");
    },

    getPrevSectionStart: function () {
      return this.traverseCheck(false, "Section", "start");
    },

    getNextChapterStart: function () {
      return this.traverseCheck(true, "Chapter", "start");
    },

    getNextSectionStart: function () {
      return this.traverseCheck(true, "Section", "start");
    }
  });
});
