/*global define */
define([
  'backbone',
  'underscore',
  'jquery',
  'editing-interface/models/editor-model',
  'editing-interface/views/editor-view',
  'editing-interface/views/output-digest-view',
  'editing-interface/views/video-form-view',
  'editing-interface/models/video-form-model',
  'toastr',
], function (
  Backbone,
  _,
  $,
  EditorModel,
  EditorView,
  OutputView,
  VideoFormView,
  VideoFormModel,
  toastr
) {
  'use strict';

  var keepWindowSized = function () {
    // keep body size to the size of the viewport
    var $body = $(window.body),
      $maincon = $('#main-container');
    var setMCHeight = function (inHeight) {
      $maincon.height(inHeight);
    };
    var setBodyHeight = function (inHeight) {
      $body.height(inHeight);
    };
    var $window = $(window),
      navHeight = $('.navbar').eq(0).height();

    $window.resize(function () {
      setMCHeight($window.height() - navHeight);
      setBodyHeight($window.height());
    });
    setMCHeight($window.height() - navHeight);
    setBodyHeight($window.height());
  };

  /**
   * Central router to control URL state
   */
  return (function () {
    var consts = {
      editingId: 'editing-interface',
      editingClass: 'editing',
      viewingClass: 'viewing',
      videoFormId: 'video-form',
      pubClass: 'published',
    };

    var pvt = {};

    pvt.hideAllViews = function () {
      $('#' + consts.editingId).hide();
      $('#' + consts.viewingId).hide();
      $('#' + consts.videoFormId).hide();
    };

    return Backbone.Router.extend({
      navVideoId: function (vid) {
        this.navigate('edit/' + vid, { trigger: true, replace: false });
      },

      routes: {
        '': 'noParams',
        'edit/:params': 'editRoute',
        'preview/:params': 'viewRoute',
      },

      noParams: function () {
        var thisRoute = this,
          pname = window.location.pathname.split('/').filter(function (str) {
            return str.length;
          }),
          $body = thisRoute.$body || $(document.body);

        var vtype1 = pname[pname.length - 1],
          vtype2 = pname[pname.length - 2];
        thisRoute.$body = $body;

        if (vtype1 === 'editor' || vtype2 === 'editor') {
          keepWindowSized();
          if (!thisRoute.videoFormView) {
            thisRoute.videoFormView = new VideoFormView({
              model: new VideoFormModel(),
              router: thisRoute,
            });
            thisRoute.videoFormView.render();
          }
          pvt.hideAllViews();
          thisRoute.videoFormView.$el.show();
        } else if (pname[0] === 'view') {
          // vd viewing interface TODO the transcript is not needed
          $(document.body).addClass(consts.pubClass);
          const vdid = pname[1];
          thisRoute.viewRoute(vdid);
          $('#loading-image').show();
        } else {
          toastr.error(
            'incorrect URL format, should be /view/id/title or /editor#edit/id or /editor#preview/id'
          );
        }
      },

      /**
       * Main route for the viewing interface
       */
      viewRoute: function (dataname) {
        var thisRoute = this,
          $body = thisRoute.$body || $(document.body);
        thisRoute.$body = $body;
        if (!thisRoute.editorModel) {
          thisRoute.editRoute(dataname, true);
          return;
        }
        window.viewing = true;
        window.editing = false;

        $('[data-ph]').attr('contenteditable', false);
        $body.removeClass(consts.editingClass);
        $body.addClass(consts.viewingClass);
      },

      /**
       * Main route for editing interface
       * TODO allow input video to be specified as a param?
       */
      editRoute: function (dataname, toView) {
        var thisRoute = this,
          reloadTrans = true,
          $body = thisRoute.$body || $(document.body);
        thisRoute.$body = $body;
        // create the editor model which has the trans and digest views

        if (!toView) {
          keepWindowSized();
        }

        window.dataname = window.dataname || dataname;

        var showCallback = function () {
          thisRoute.$editingView =
            thisRoute.$editingView || $('#' + consts.editingId);
          $body.removeClass(consts.viewingClass);
          $body.addClass(consts.editingClass);
          window.viewing = false;
          window.editing = true;
          $('[data-ph]').attr('contenteditable', true);
          pvt.hideAllViews();
          thisRoute.$editingView.show();
        };

        if (!thisRoute.editorModel) {
          thisRoute.editorModel = new EditorModel({
            id: dataname,
            task: toView ? 'view' : 'edit',
          });
          thisRoute.editorView = new EditorView({
            model: thisRoute.editorModel,
          });
          thisRoute.editorModel.fetch({
            success: function (mdl, inobj) {
              // create the editor view
              // now  show the editor view
              $('#' + consts.editingId).html(thisRoute.editorView.render().el);
              thisRoute.editorModel.postInit();
              $('#loading-image').hide();
              if ($(document.body).hasClass(consts.pubClass)) {
                $('#about').show();
              }

              if (toView) {
                thisRoute.viewRoute(dataname);
              } else {
                showCallback();
              }
            },
            error: function (data, resp) {
              toastr.error(
                (resp.responseJSON && resp.responseJSON.error) ||
                  'unable to load the video digest'
              );
            }, // end error
          });
        } else {
          showCallback();
        }
      },
    });
  })();
});
