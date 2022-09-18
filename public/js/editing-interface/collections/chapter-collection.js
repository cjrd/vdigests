/*global define*/
define(['backbone', 'editing-interface/models/chapter-model'], function (
  Backbone,
  ChapterModel
) {
  return Backbone.Collection.extend({
    model: ChapterModel,

    initialize: function () {
      var thisModel = this;
      thisModel.on('change:state', function () {
        thisModel.trigger.apply('change:state', arguments);
      });
    },

    comparator: function (ch1, ch2) {
      var c1sw = ch1.get('startWord'),
        c2sw = ch2.get('startWord');
      if (!c1sw) {
        return 1;
      } else if (!c2sw) {
        return -1;
      } else {
        return c1sw.get('start') > c2sw.get('start') ? 1 : -1;
      }
    },
  });
});
