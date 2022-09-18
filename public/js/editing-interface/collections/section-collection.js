/*global define*/
define(['backbone', 'editing-interface/models/section-model'], function (
  Backbone,
  SectionModel
) {
  return Backbone.Collection.extend({
    model: SectionModel,
    comparator: function (sec1, sec2) {
      var c1sw = sec1.get('startWord'),
        c2sw = sec2.get('startWord');
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
