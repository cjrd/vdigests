/*global define*/
define(['backbone', 'editing-interface/models/word-model'], function (
  Backbone,
  WordModel
) {
  return Backbone.Collection.extend({
    model: WordModel,
    comparator: function (w1, w2) {
      // keep the words ordered by start time
      return w1.get('start') > w2.get('start') ? 1 : -1;
    },
  });
});
