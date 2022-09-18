/*global define */
define(['backbone', 'underscore', 'jquery'], function (Backbone, _, $) {
  return Backbone.View.extend({
    template: null,

    /**
     * Renders the transcript and digest subviews and returns the complete editing view
     */
    render: function () {
      var thisView = this;

      if (thisView.template) {
        // prep the editor template
        thisView.$el.html(thisView.template(thisView.model.toJSON()));
      }

      // now add the digest and transcript view components to the editor template shell using the assign method
      var assignObj = thisView.getAssignedObject();
      thisView.assign(assignObj);
      thisView.postRender();
      thisView.delegateEvents();
      return thisView;
    },

    /**
     * Overwrite in the subclass
     */
    postRender: function () {},

    /**
     * Return the "assign" object {selector: rendered element}
     */
    getAssignedObject: function () {
      throw Error("implement in 'subclass'");
    },

    /**
     * Assign subviews: method groked from
     * http://ianstormtaylor.com/assigning-backbone-subviews-made-even-cleaner/
     */
    assign: function (selector, view) {
      var selectors;
      if (_.isObject(selector)) {
        selectors = selector;
      } else {
        selectors = {};
        selectors[selector] = view;
      }
      if (!selectors) return;
      _.each(
        selectors,
        function (view, selector) {
          view.setElement(this.$(selector)).render();
        },
        this
      );
    },
  });
});
