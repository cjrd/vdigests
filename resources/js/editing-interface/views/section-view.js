
/*global define */
define(["backbone", "underscore", "jquery", "text!templates/section-template.html"], function (Backbone, _, $, tmpl) {
  var consts = {
    className: "row summaryRow"
  };
  return Backbone.View.extend({
    template: _.template(tmpl),

    className: consts.className,

    events: {
      'keyup .abs-summary': "summaryKeyUp"
    },

    render: function () {
      var thisView = this;
      thisView.$el.html(thisView.template(thisView.model.toJSON()));
      return thisView;
    },

    summaryKeyUp: function (evt) {
      var thisView = this,
      $curTar = $(evt.currentTarget);
      console.log($curTar.text());
      thisView.model.set("summary", $curTar.text());
    }

  });
});
