/*global define */
define(['backbone', 'underscore', 'jquery'], function (Backbone, _, $) {
  return Backbone.Model.extend({
    defaults: function () {
      return {
        data: '',
        time: -1,
      };
    },
  });
});
