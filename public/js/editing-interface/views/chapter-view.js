/*global define */
define([
  'backbone',
  'underscore',
  'jquery',
  'text!templates/chapter-template.html',
  'editing-interface/views/compound-view',
  'editing-interface/views/section-view',
  'editing-interface/views/collection-view',
  'editing-interface/utils/utils',
  'editing-interface/models/thumbnail-model',
  'editing-interface/utils/player',
], function (
  Backbone,
  _,
  $,
  tmpl,
  CompoundBackboneView,
  SectionView,
  CollectionView,
  Utils,
  ThumbnailModel,
  Player
) {
  var consts = {
    sectionWrapClass: 'summary-column',
    activeClass: 'active',
    viewClass: 'chapter',
    absSummaryClass: 'abs-summary',
    chapHeaderClass: 'chapter-header',
    videoWrapClass: 'video-wrap',
    aspectWrapClass: 'aspect-wrap',
    coverClass: 'cover',
    imgHeight: 312,
    imgWidth: 566,
  };

  return CompoundBackboneView.extend({
    template: _.template(tmpl),
    className: consts.viewClass,

    events: {
      'keyup .chapter-header': function (evt) {
        var thisView = this;
        thisView.typing = true;
        thisView.model.set('title', evt.currentTarget.textContent);

        // USE STATS
        window.vdstats.nSubtitleEdits.push(new Date().getTime());
        thisView.typing = false;
      },
      'mouseover .section-row': 'sectionMouseOver',
      'mouseout .section-row': 'sectionMouseOut',
      'click .wysiwyg-add-chapter': 'wysiwygAddChapter',
      'click .cover': function () {
        var thisView = this;
        thisView.model.ytplayer && thisView.model.ytplayer.playVideo();
      },
      'click a': function () {
        var thisView = this;
        thisView.model.ytplayer &&
          thisView.model.ytplayer.stopVideo &&
          thisView.model.ytplayer.stopVideo();
      },
    },

    /**
     * Override
     */
    postRender: function () {
      var thisView = this,
        thisModel = thisView.model,
        vel = thisView.$el.find('.' + consts.videoWrapClass)[0],
        startTime = thisView.model.getStartTime();
      Player.inputVideo(
        vel,
        thisView.model.get('ytid'),
        thisView.model,
        Math.floor(startTime),
        startTime,
        'ytplayer'
      );
      var thisInterval = window.setInterval(function () {
        if (thisModel.ytplayer) {
          window.clearInterval(thisInterval);
          thisView.addVPlayerEvents();
          window.setTimeout(function () {
            thisView.showCover();
          }, 2000);
        }
      }, 500 * Math.random());

      // set the viewing time
      thisView.setViewingTime();
    },

    setViewingTime: function () {
      var thisView = this,
        thisModel = thisView.model;
      var $chaphead = thisView.$el.find('.' + consts.chapHeaderClass).first();
      $chaphead.attr('data-content', '(' + thisModel.getLengthString() + ')');
    },

    addVPlayerEvents: function () {
      var thisView = this;
      // listen for state changes & propagate to the model
      thisView.model.ytplayer.addEventListener('onStateChange', function (
        stobj
      ) {
        thisView.model.set('state', stobj.data);
      });
    },

    /**
     * Only render the summaries (avoid re-rendering the video)
     */
    renderSummariesOnly: function () {
      var thisView = this;
      thisView.assign(thisView.getAssignedObject());
    },

    initialize: function () {
      var thisView = this,
        thisModel = thisView.model,
        secs = thisModel.get('sections');

      thisView.listenTo(thisModel, 'change:title', function (mdl, val) {
        if (!thisView.typing) {
          val = val.trim();
          // in case we saved <br> from the old version of the code that
          // stored `innerHTML` instead of `textContent`
          const br = '<br>';
          while (val.endsWith(br)) {
            val = val.substring(0, val.length - br.length).trim();
          }
          thisView.$el.find('.' + consts.chapHeaderClass).html(val);
        }
      });

      // add screenshotes for existing sections
      secs.each(function (sec) {
        if (!sec.get('thumbnail')) {
          // TODO DRY
          window.setTimeout(function () {
            if (!sec.get('thumbnail')) {
              thisView.$el
                .find('#' + sec.cid + ' .' + consts.absSummaryClass)
                .focus();
              var $vid = thisView.$el.find('video');
              thisView.placeThumbnailInSec(sec);
            }
          }, 1000);
        }
      });

      // MODEL LISTENERS
      thisView.listenTo(thisModel, 'destroy', function (chp) {
        thisView.remove();
      });

      thisView.listenTo(thisModel, 'change:state', function (mdl, val) {
        if (val === 1) {
          thisView.$el.addClass(consts.activeClass);
          thisView.hideCover();
        } else {
          thisView.$el.removeClass(consts.activeClass);
        }
      });

      thisView.listenTo(thisModel, 'showCover', function (mdl, val) {
        thisModel.ytplayer &&
          thisModel.ytplayer.seekTo(thisModel.getStartTime(), true);
        thisView.showCover();
      });

      // 'add' section listener
      thisView.listenTo(secs, 'add', function (newSec) {
        thisView.assign(thisView.getAssignedObject());
        if (!thisView.model.swapping) {
          thisView.placeThumbnailInSec(newSec);
        }
        newSec.handleGainFocus();
      });

      // 'remove' section listener
      thisView.listenTo(secs, 'remove', function (remSec) {
        var nsecs = secs.length;
        if (nsecs === 0) {
          // we're out of sections: delete the chapter
          thisView.model.ytplayer &&
            thisView.model.ytplayer.stopVideo &&
            thisView.model.ytplayer.stopVideo();
          // TODO move this
          thisModel.get('startWord').set('startChapter', false);
          thisView.remove();
        } else if (
          remSec.get('startWord').cid === thisModel.get('startWord').cid
        ) {
          // we deleted the leading section but have another section that we can make the leading section
          var newStartWord = thisModel
              .get('sections')
              .models[0].get('startWord'),
            oldStartWord = thisModel.get('startWord');
          newStartWord.set('startChapter', true, { silent: true });
          // inform listeners that the word has changed from a section start to a chapter start
          newStartWord.trigger('sectionToChapter', newStartWord);
          oldStartWord.trigger(
            'change:switchStartWord',
            oldStartWord,
            newStartWord
          );
        }
      });

      // listen for play events from the underlying chapter
      thisView.listenTo(thisView.model, 'startVideo', thisView.startVideo);
      thisView.listenTo(
        thisView.model.get('sections'),
        'startVideo',
        thisView.startVideo
      );

      // listen for screenshot capture requests from sections
      thisView.listenTo(secs, 'captureThumbnail', function (secModel) {
        var time =
          thisModel.ytplayer &&
          thisModel.ytplayer.getCurrentTime &&
          thisModel.ytplayer.getCurrentTime();
        thisView.placeThumbnailInSec(secModel, time);
      });

      thisView.listenTo(thisModel, 'change:length', function () {
        thisView.setViewingTime();
      });
    }, // end initialize

    sectionMouseOver: function (evt) {
      var thisView = this;
      if (thisView.model.get('state') !== 1) {
        var $curTar = $(evt.currentTarget);
        thisView.showCover($curTar.find('img'));
      }
    },

    showCover: function ($img) {
      var thisView = this;
      $img =
        $img ||
        thisView.$el
          .find('.' + consts.sectionWrapClass)
          .first()
          .find('img')
          .first();
      var $curCover =
          thisView.$curCover || thisView.$el.find('.' + consts.coverClass),
        $imgClone = $img.clone(),
        // extract the cover dimensions
        $aspectWrap =
          thisView.$aspectWrap ||
          thisView.$el.find('.' + consts.aspectWrapClass),
        aspectWidth = $aspectWrap.outerWidth(),
        dispH = $aspectWrap.outerHeight(),
        dispW =
          Math.min(
            (((dispH / $img.height()) * $img.width()) / aspectWidth) * 100,
            100
          ) - 2; // TODO FIXME (where is the +2 coming from???)

      // set the cover dimensions
      $curCover.html($imgClone);
      $imgClone.width(dispW + '%');
      $curCover.show();

      // memoize the view els
      thisView.$curCover = $curCover;
      thisView.$aspectWrap = $aspectWrap;
    },

    /**
     * Mouseover the keyframe element: show the keyframe over the video
     */
    sectionMouseOut: function (evt) {
      var thisView = this;
      thisView.hideCover();
      if (!thisView.model.get('prevplay')) {
        thisView.showCover();
      }
    },

    hideCover: function () {
      var thisView = this,
        $curCover = thisView.$el.find('.' + consts.coverClass);
      $curCover.hide();
    },

    /**
     * Place a thumbnail in the given section at the given time (optional time)
     */
    placeThumbnailInSec: async function (sec, time) {
      var thisView = this;
      time = time || sec.getStartTime();
      window.setTimeout(function () {
        thisView.$el
          .find('#' + sec.cid + ' .' + consts.absSummaryClass)
          .focus();
      }, 200);

      sec.set('thumbnail', new ThumbnailModel({ time: time }));

      try {
        const newImgData = await Utils.getScreenShot(window.dataname, time);
        sec.set(
          'thumbnail',
          new ThumbnailModel({ data: newImgData, time: time })
        );
      } catch (err) {
        // couldn't get the thumbnail - oh well!
      }
    },

    /**
     * return the {selector: rendered element} object used in the superclass render function
     */
    getAssignedObject: function () {
      var thisView = this;

      // prep the subviews
      // prep the subviews TODO iterate over all chapters
      thisView.sectionsView =
        thisView.sectionsView ||
        new CollectionView({ model: thisView.model.get('sections') });
      thisView.sectionsView.ComponentView = SectionView;

      // now add the digest and transcript view components to the editor template shell using the assign method
      var assignObj = {};
      assignObj['.' + consts.sectionWrapClass] = thisView.sectionsView;

      return assignObj;
    },

    startVideo: function (stTime) {
      var thisView = this;
      // detect if video hasn't player
      // mute
      // play
      // pause
      // playk
      thisView.model.ytplayer.seekTo(stTime, true);
      thisView.model.ytplayer.playVideo();
    },

    wysiwygAddChapter: function (evt) {
      // create a new chapter before the last word of this chapter
      var thisView = this,
        csecs = thisView.model.get('sections'),
        lsec = csecs.models[csecs.models.length - 1],
        newChapWord = lsec.get('startWord').next;

      newChapWord.set('startChapter', true);
    },
  });
});
