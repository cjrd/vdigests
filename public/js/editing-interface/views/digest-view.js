/*global define */
define([
  'backbone',
  'underscore',
  'jquery',
  'text!templates/digest-template.html',
  'editing-interface/views/compound-view',
  'editing-interface/views/collection-view',
  'editing-interface/views/chapter-view',
], function (
  Backbone,
  _,
  $,
  tmpl,
  CompoundBackboneView,
  CollectionView,
  ChapterView
) {
  var consts = {
    chapterWrapClass: 'digest-chapters-wrap',
    chapterClass: 'chapter',
    digestWrapId: 'digest-wrap',
    editorWrapClass: 'editor-wrap',
    mainTitleId: 'maintitle',
    authorTitleId: 'authortitle',
    videoLengthId: 'videolength',
  };

  return CompoundBackboneView.extend({
    template: _.template(tmpl),

    events: {
      'blur #maintitle': function (evt) {
        var thisView = this;
        thisView.model.set('title', $(evt.currentTarget).text());
      },
      'blur #authortitle': function (evt) {
        var thisView = this;
        thisView.model.set('author', $(evt.currentTarget).text());
      },
    },

    initialize: function () {
      var thisView = this,
        chaps = thisView.model.get('chapters');

      // add chapters
      thisView.listenTo(chaps, 'add', function (newChap) {
        var cindex = chaps.indexOf(newChap),
          $chapEls = thisView.$el.find('.' + consts.chapterClass),
          newChapView = new ChapterView({ model: newChap }),
          $newEl = newChapView.render().$el;
        if (cindex > 0) {
          $chapEls.eq(cindex - 1).after($newEl);
        } else {
          thisView.$el.find('.' + consts.chapterWrapClass).prepend($newEl);
        }
      });

      // remove chapters
      thisView.listenTo(chaps, 'remove', function (removedChap) {
        thisView.$el.find('#' + removedChap.cid).remove();
      });

      // title change
      thisView.listenTo(thisView.model, 'change:title', function (mdl, val) {
        thisView.$el.find('#' + consts.mainTitleId).text(val);
      });

      // author change
      thisView.listenTo(thisView.model, 'change:author', function (mdl, val) {
        thisView.$el.find('#' + consts.authorTitleId).text(val);
      });

      // videoLength change
      thisView.listenTo(thisView.model, 'change:videoLength', function (
        mdl,
        val
      ) {
        thisView.$el
          .find('#' + consts.videoLengthId)
          .text(thisView.getVideoLengthString());
      });

      thisView.listenTo(chaps, 'change:state', function (chp, val) {
        if (!window.preppingVideo && val === 1) {
          // only let one video play at a time
          chaps.each(function (comChap) {
            if (comChap.cid !== chp.cid) {
              comChap.ytplayer && comChap.ytplayer.pauseVideo();
              comChap.trigger('showCover');
              comChap.set('prevplay', false);
            } else {
              comChap.set('prevplay', true);
            }
          });
        }
      });

      // listen to changes in the underlying videos & control/signal transcript updates accordingly
      // TODO clean up this function
      var curPlayingChap = null,
        curPlayingSec = null;
      thisView.checkPlayInterval = window.setInterval(function () {
        // monitor chapter changes
        if (thisView.chapTrans) {
          return;
        }

        if (
          curPlayingChap &&
          curPlayingChap.get('state') !== 1 &&
          curPlayingChap.get('state') === 3 &&
          !thisView.chapTrans
        ) {
          curPlayingSec && curPlayingSec.set('active', false);
          curPlayingChap = null;
          curPlayingSec = null;
          return;
        } else if (curPlayingChap && curPlayingChap.get('state') === 1) {
          var curTime = curPlayingChap.ytplayer.getCurrentTime(),
            curPlayEnd = curPlayingChap.getEndTime(),
            curPlayStart = curPlayingChap.getStartTime();
          if (curTime > curPlayEnd || curTime < curPlayStart) {
            // start the next video if it exists
            var nextChap = null,
              curNextEndTime = Infinity,
              curNextStartTime = 0,
              isEarly = curTime < curPlayStart;
            chaps.each(function (chp) {
              var endTime = chp.getEndTime(),
                startTime = chp.getStartTime();
              if (
                (isEarly &&
                  curTime > startTime &&
                  startTime >= curNextStartTime) ||
                (!isEarly && curTime < endTime && endTime <= curNextEndTime)
              ) {
                nextChap = chp;
                curNextEndTime = endTime;
                curNextStartTime = startTime;
              }
            });

            if (nextChap) {
              var prevChapPlayer = curPlayingChap.ytplayer;
              //curPlayingChap.set("active", false);
              curPlayingChap = nextChap;
              //curPlayingChap.set("active", true);

              // TODO move to chapter view
              curPlayingChap.ytplayer.seekTo &&
                curPlayingChap.ytplayer.seekTo(curTime, true);
              // TODO scroll if we're in viewing mode
              var ytel = curPlayingChap.ytplayer.a || curPlayingChap.ytplayer.d;
              if (ytel) {
                $.smoothScroll(
                  $(ytel.parentElement.parentElement).position().top - 120
                );
              }

              thisView.chapTrans = true;
              var transTimer = window.setInterval(function () {
                prevChapPlayer.pauseVideo();
                if (curPlayingChap.ytplayer.playVideo) {
                  curPlayingChap.ytplayer.playVideo();
                  thisView.chapTrans = false;
                  window.clearInterval(transTimer);
                }
              }, 30);
            }
          }

          // make the appropriate section active
          var curSecStart =
              (curPlayingSec && curPlayingSec.getStartTime()) || 0,
            curSecEnd =
              (curPlayingSec && curPlayingSec.getEndTime()) || Infinity;
          if (!curPlayingSec || curTime > curSecEnd || curTime < curSecStart) {
            var isSecEarly = curTime < curSecStart,
              curNextSecStart = 0,
              curNextSecEnd = Infinity;
            curTime += 0.03; // account for youtube irregularities
            curPlayingSec && curPlayingSec.set('active', false);
            curPlayingChap.get('sections').each(function (sec) {
              var secStart = sec.getStartTime(),
                secEnd = sec.getEndTime();
              if (
                (isSecEarly &&
                  curTime + 1 > secStart &&
                  secStart >= curNextSecStart) ||
                (!isSecEarly && curTime + 1 < secEnd && secEnd <= curNextSecEnd)
              ) {
                curPlayingSec = sec;
                curNextSecEnd = sec.getEndTime();
                curNextSecStart = sec.getStartTime();
              }
            });
            curPlayingSec && curPlayingSec.set('active', true);
          }

          // pass a "playing" event to the underlying section
          if (curPlayingSec && curPlayingSec.get('active')) {
            // account for small delay
            curPlayingSec.triggerActiveTime(curTime + 0.1);
          }
        } else {
          thisView.model.get('chapters').each(function (chap) {
            if (!window.preppingVideo && chap.get('state') === 1) {
              curPlayingChap = chap;
            }
          });
        }
      }, 40);
    },

    getVideoLengthString: function () {
      var thisView = this;
      return thisView.model
        ? '(' +
            Math.max(Math.round(thisView.model.get('videoLength') / 60), 1) +
            ' min)'
        : '';
    },

    /**
     * return the {selector: rendered element} object used in the superclass render function
     */
    getAssignedObject: function () {
      var thisView = this;

      // prep the subviews TODO iterate over all chapters
      thisView.chaptersView =
        thisView.chaptersView ||
        new CollectionView({ model: thisView.model.get('chapters') });
      thisView.chaptersView.ComponentView = ChapterView;

      // now add the digest and transcript view components to the editor template shell using the assign method
      var assignObj = {};
      assignObj['.' + consts.chapterWrapClass] = thisView.chaptersView;

      return assignObj;
    },
  });
});
