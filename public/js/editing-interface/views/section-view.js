/*global define */
define([
  'backbone',
  'underscore',
  'jquery',
  'text!templates/section-template.html',
], function (Backbone, _, $, tmpl) {
  var consts = {
    className: 'section-row',
    keyframeClass: 'keyframe-col',
    thumbClass: 'section-thumbnail',
    takeThumbClass: 'take-thumbnail-image',
    summaryDivClass: 'abs-summary',
    activeClass: 'active',
    secWordClass: 'secword',
    splitDownClass: 'split-down',
    mergeUpClass: 'merge-up',
  };

  var getSelectedText = function () {
    var text = '';
    if (typeof window.getSelection != 'undefined') {
      text = window.getSelection().toString();
    } else if (
      typeof document.selection != 'undefined' &&
      document.selection.type == 'Text'
    ) {
      text = document.selection.createRange().text;
    }
    return text;
  };

  function getLinksInSelection() {
    var selectedLinks = [];
    var range, containerEl, links, linkRange;
    if (window.getSelection) {
      var sel = window.getSelection();
      if (sel.getRangeAt && sel.rangeCount) {
        linkRange = document.createRange();
        for (var r = 0; r < sel.rangeCount; ++r) {
          range = sel.getRangeAt(r);
          containerEl = range.commonAncestorContainer;
          if (containerEl.nodeType != 1) {
            containerEl = containerEl.parentNode;
          }
          if (containerEl.nodeName.toLowerCase() == 'a') {
            selectedLinks.push(containerEl);
          } else {
            links = containerEl.getElementsByTagName('a');
            for (var i = 0; i < links.length; ++i) {
              linkRange.selectNodeContents(links[i]);
              if (
                linkRange.compareBoundaryPoints(range.END_TO_START, range) <
                  1 &&
                linkRange.compareBoundaryPoints(range.START_TO_END, range) > -1
              ) {
                selectedLinks.push(links[i]);
              }
            }
          }
        }
        linkRange.detach();
      }
    } else if (document.selection && document.selection.type != 'Control') {
      range = document.selection.createRange();
      containerEl = range.parentElement();
      if (containerEl.nodeName.toLowerCase() == 'a') {
        selectedLinks.push(containerEl);
      } else {
        links = containerEl.getElementsByTagName('a');
        linkRange = document.body.createTextRange();
        for (var j = 0; j < links.length; ++j) {
          linkRange.moveToElementText(links[j]);
          if (
            linkRange.compareEndPoints('StartToEnd', range) > -1 &&
            linkRange.compareEndPoints('EndToStart', range) < 1
          ) {
            selectedLinks.push(links[j]);
          }
        }
      }
    }
    return selectedLinks;
  }

  var addTextLink = function () {
    var selectedText = getSelectedText();
    if (selectedText) {
      var selLinks = getLinksInSelection();
      if (selLinks.length > 0) {
        document.execCommand('unlink', false, false);
      } else {
        var linkUrl = prompt('To what URL should this link go? ');
        if (linkUrl) {
          document.execCommand(
            'insertHTML',
            false,
            "<a target='_blank' href='" + linkUrl + "'>" + selectedText + '</a>'
          );
        }
      }
    }
  };

  return Backbone.View.extend({
    template: _.template(tmpl),
    id: function () {
      return this.model.cid;
    },
    className: function () {
      var retName =
        consts.className +
        (this.model.get('active') ? ' ' + consts.activeClass : '');
      retName += this.model.get('summary').length ? '' : ' empty';
      return retName;
    },

    events: {
      'keyup .abs-summary': 'summaryKeyUp',
      'keydown .abs-summary': 'summaryKeyDown',
      'click .remove-section': 'removeSection',
      'blur .abs-summary': 'blurSummary',
      'focus .abs-summary': 'focusSummary',
      click: 'clickSection',
    },

    initialize: function () {
      var thisView = this,
        thisModel = thisView.model;

      // listen for thumbnail changes
      thisView.listenTo(thisModel, 'change:thumbnail', function (mdl) {
        var $img = $('<img>');
        $img.addClass(consts.thumbClass);
        $img.attr('src', mdl.get('thumbnail').get('data'));
        var $kfel = thisView.$el.find('.' + consts.keyframeClass);
        $kfel.find('img').remove();
        $kfel.prepend($img);
      });

      thisView.listenTo(thisModel, 'change:active', function (chp, val) {
        if (val) {
          thisView.$el.addClass(consts.activeClass);
        } else {
          thisView.$el.removeClass(consts.activeClass);
        }
      });

      thisView.listenTo(thisModel, 'change:summary', function (mdl, val) {
        if (!this.typing) {
          thisView.$el.find('.' + consts.summaryDivClass).html(val);
        }
      });

      thisView.listenTo(thisModel, 'gainfocus', function (mdl, val) {
        window.setTimeout(function () {
          thisView.$el.focus();
        }, 600);
      });

      // remove the view if the underlying model is removed
      thisView.listenTo(thisModel, 'remove', function (mdl) {
        thisView.remove();
      });
    },

    render: function () {
      var thisView = this;
      thisView.$el.html(thisView.template(thisView.model.attributes));
      // apply the dynamic classname
      thisView.$el.attr('class', _.result(this, 'className'));
      window.setTimeout(function () {
        thisView.el.focus();
      }, 500);
      return thisView;
    },

    blurSummary: function () {
      var thisView = this,
        startWord = thisView.model.get('startWord');
      thisView.$el.removeClass('focused');
      thisView.$el.attr('class', _.result(thisView, 'className'));
      startWord.trigger('unhighlight-section', startWord);
    },

    focusSummary: function (evt) {
      var thisView = this,
        startWord = thisView.model.get('startWord');
      thisView.$el.addClass('focused');
      startWord.trigger('unhighlight-section', startWord);
      startWord.trigger('highlight-section', startWord);
    },

    summaryKeyDown: function (evt) {
      // handle links/unlinks
      if (evt.ctrlKey) {
        if (evt.keyCode == 76) {
          // 76 is L (link) -- toggle link
          addTextLink();
        }
      }
    },

    summaryKeyUp: function (evt) {
      var thisView = this,
        curTar = evt.currentTarget,
        text = curTar.innerHTML;
      if (text !== thisView.model.get('summary')) {
        thisView.typing = true;
        thisView.model.set('summary', text);
        thisView.typing = false;
        // USE STATS
        window.vdstats.nSummaryEdits.push(new Date().getTime());
      }
      //this.$el.attr('class', _.result(this, 'className'));
    },

    removeSection: function (evt) {
      var thisView = this,
        thisModel = thisView.model;
      // TODO for now, make sure it's not the first section
      thisModel.get('startWord').set('startSection', false);
    },

    takeThumbnailImage: function (evt) {
      var thisView = this,
        thisModel = thisView.model;
      thisModel.trigger('captureThumbnail', thisModel);
      evt.stopPropagation();

      // USE STATS
      window.vdstats.nKeyFrameChanges.push(new Date().getTime());
    },

    startVideo: function () {
      var thisView = this,
        thisModel = thisView.model;
      thisModel.trigger('startVideo', thisModel.get('startWord').get('start'));
    },

    mergeSectionUp: function () {
      if (window.transView) {
        var thisView = this,
          stWord = thisView.model.get('startWord'),
          pchapModel = stWord.getPrevChapterStart(true);

        // TODO have to get chapter start, change it
        window.vdstats.nChap2Sec.push(new Date().getTime());
        window.changingSecChap = true;

        // make sure we're not changing the first chapter
        if (pchapModel.getPrevSectionStart()) {
          pchapModel.set('startChapter', false);
          window.transView.changeStartSection(pchapModel, true);
          // USE STATS
          window.changingSecChap = false;
        }

        // get the next section (if it exists and change to a chapter)
        var nxtSecWord = stWord.getNextSectionStart();
        if (nxtSecWord) {
          window.transView.changeStartSection(nxtSecWord, false);
          nxtSecWord.set('startChapter', true);
        }
      } else {
        alert(
          'unable to split chapter -- transcript object did not load correctly. Try saving then reloading.'
        );
      }
    },

    mergeSectionDown: function () {
      if (window.transView) {
        var thisView = this,
          stWord = thisView.model.get('startWord'),
          nchapModel = stWord.getNextChapterStart(true);

        // check that we have a next chapter
        if (nchapModel) {
          nchapModel.set('startChapter', false);
          window.transView.changeStartSection(nchapModel, true);
        }

        // get the prev section (if it exists and change to a chapter)
        var prevSecWord = stWord.getPrevSectionStart(true);
        if (prevSecWord) {
          window.transView.changeStartSection(prevSecWord, false);
          prevSecWord.set('startChapter', true);
        }
      } else {
        alert(
          'unable to split chapter -- transcript object did not load correctly. Try saving then reloading.'
        );
      }
    },

    clickSection: function (evt) {
      var thisView = this,
        startWord = thisView.model.get('startWord'),
        $tar = $(evt.target);

      if ($tar.hasClass(consts.takeThumbClass)) {
        thisView.takeThumbnailImage(evt);
      } else if (
        $tar.hasClass(consts.thumbClass) ||
        (window.viewing && !$tar.attr('href'))
      ) {
        thisView.startVideo();
      } else if ($tar.hasClass(consts.splitDownClass)) {
        thisView.mergeSectionDown();
      } else if ($tar.hasClass(consts.mergeUpClass)) {
        thisView.mergeSectionUp();
      } else {
        startWord.trigger('focus', startWord);
        thisView.$el.find('.' + consts.summaryDivClass).focus();
      }
    },
  });
});
