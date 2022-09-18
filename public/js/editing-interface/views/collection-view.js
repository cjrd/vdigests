/*global define */
define(['backbone', 'underscore', 'jquery'], function (Backbone, _, $) {
  var consts = {
    chapterWrapClass: 'chapter-wrap',
  };

  return Backbone.View.extend({
    initialize: function () {},

    render: function () {
      var thisView = this;
      thisView.$el.html('');
      thisView.model.each(function (mdl) {
        var cmpView = new thisView.ComponentView({ model: mdl });
        thisView.$el.append(cmpView.render().$el);
      });
      return thisView;
    },
  });
});
