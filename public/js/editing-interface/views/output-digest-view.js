// TODO remove hardcoding and cleanup!
/*global define */
define([
  'backbone',
  'underscore',
  'jquery',
  'text!templates/output-digest-template.html',
  'editing-interface/utils/player',
], function (Backbone, _, $, tmpl, Player) {
  var consts = {
    activeClass: 'active',
    activeRowClass: 'active-row',
    groupRowClass: 'groupRow',
    coverClass: 'cover',
    videoWrapClass: 'video-wrap',
  };

  return Backbone.View.extend({
    template: _.template(tmpl),
    events: {
      // listen for click events on sections, hover events on images
      'click .section': 'sectionClick',
      'click #return-to-editor': 'returnToEditor',
      'mouseover .section': 'sectionMouseOver',
      'mouseout .section': 'sectionMouseOut',
    },
    className: 'output-digest',
    render: function () {
      var thisView = this;
      thisView.rendered = false;
      thisView.$el.html(thisView.template(thisView.model.attributes));
      // now insert the youtube videos
      thisView.vplayers = {};
      var $vids = thisView.$el.find('.' + consts.videoWrapClass),
        nvids = $vids.length;
      var inputVid = function (vel, floorStartTime, exactStartTime) {
        Player.inputVideo(
          vel,
          'usdJgEwMinM',
          thisView.vplayers,
          floorStartTime,
          exactStartTime
        );
      };
      var lastEl = 0,
        siid = window.setInterval(function () {
          if (lastEl < nvids) {
            var exactStartTime = Number(
              $vids.eq(lastEl).parent().parent().data('start')
            );
            inputVid($vids[lastEl], Math.floor(exactStartTime), exactStartTime);
            lastEl += 1;
          } else {
            window.clearInterval(siid);
          }
        }, 100);

      // TODO add a proper loading screen
      var thisInterval = window.setInterval(function () {
        if (Object.keys(thisView.vplayers).length >= nvids) {
          window.clearInterval(thisInterval);
          thisView.rendered = true;
          thisView.addVPlayerEvents();
        }
      }, 100);
      thisView.delegateEvents();
      return thisView;
    },

    /**
     * Transition to vdigest preview
     */
    returnToEditor: function () {
      var locSplit = window.location.hash.split('/');
      window.location.hash = 'edit/' + locSplit.slice(1).join('/');
    },

    /**
     * Mouseover the keyframe element: show the keyframe over the video
     */
    sectionMouseOut: function (evt) {
      var $curTar = $(evt.currentTarget),
        $curGroup = $($curTar.closest('.' + consts.groupRowClass)),
        $curCover = $curGroup.find('.' + consts.coverClass);
      $curCover.hide();
    },

    /**
     * Mouseover the keyframe element: show the keyframe over the video
     */
    sectionMouseOver: function (evt) {
      var $curTar = $(evt.currentTarget),
        $curGroup = $($curTar.closest('.' + consts.groupRowClass)),
        $curCover = $curGroup.find('.' + consts.coverClass);
      if (!$curGroup.hasClass(consts.activeRowClass)) {
        var imgClone = $curTar.find('img').clone();
        $curCover.html(imgClone);

        $curCover.height();
        $curCover.width();
        $curCover.show();
      }
    },

    /**
     * Clicking on a section should start the video at that location
     */
    sectionClick: function (evt) {
      var thisView = this,
        curTar = evt.currentTarget,
        startTime = Number(curTar.getAttribute('data-start')),
        vidWrapId = curTar.getAttribute('data-chapter'),
        vid = thisView.vplayers[vidWrapId],
        activeClass = consts.activeClass;
      vid.seekTo(startTime, true);
      vid.playVideo();
      $('.' + activeClass).removeClass(activeClass);
      $(curTar).addClass(activeClass);
    },

    addVPlayerEvents: function () {
      var thisView = this;

      // listen for state changes
      _.each(thisView.vplayers, function (vp) {
        vp.addEventListener('onStateChange', function (stobj) {
          if (stobj.data === 1) {
            // playing a each
            _.each(thisView.vplayers, function (vpe) {
              if (stobj.target != vpe) {
                vpe.stopVideo();
              } else {
                $(vpe.a)
                  .parent()
                  .find('.' + consts.coverClass)
                  .hide();
              }
            });
          }
        });
      });

      // monitor the current playing time of the currently playing video
      // play/focus-on the appropriate chapter for the given playing time
      if (thisView.checkPlayInterval) {
        window.clearInterval(thisView.checkPlayInterval);
      }
      // TODO is there a better way to do this?
      var curPlaying = null,
        curPlayEnd = Infinity,
        curPlayStart = 0,
        $activeSecEl = null,
        activeSecStart = 0,
        activeSecEnd = Infinity;
      thisView.checkPlayInterval = window.setInterval(function () {
        if (curPlaying && curPlaying.getPlayerState() === 1) {
          var curTime = curPlaying.getCurrentTime();
          if (curTime > curPlayEnd || curTime < curPlayStart) {
            // start the next video if it exists
            var nextVP = null,
              curNextEndTime = Infinity,
              curNextStartTime = 0,
              isEarly = curTime < curPlayStart;
            _.each(thisView.vplayers, function (vpe) {
              var gp = vpe.a.parentElement.parentElement,
                endTime = Number(gp.getAttribute('data-end')),
                startTime = Number(gp.getAttribute('data-start'));
              if (
                (isEarly &&
                  curTime > startTime &&
                  startTime >= curNextStartTime) ||
                (!isEarly && curTime < endTime && endTime <= curNextEndTime)
              ) {
                nextVP = vpe;
                curNextEndTime = endTime;
                curNextStartTime = startTime;
              }
            });
            if (nextVP) {
              curPlaying.pauseVideo();
              curPlaying = nextVP;
              curPlayStart = curNextStartTime;
              curPlayEnd = curNextEndTime;
              curPlaying.seekTo(curTime, true);
              $.smoothScroll($(curPlaying.a.parentElement).offset().top - 300);
              //curPlaying.playVideo();
              window.setTimeout(function () {
                curPlaying.playVideo();
              }, 100);
            }
          }

          // make the appropriate section active
          if (
            !$activeSecEl ||
            curTime > activeSecEnd ||
            curTime < activeSecStart
          ) {
            $activeSecEl && $activeSecEl.removeClass(consts.activeClass);
            var isSecEarly = curTime < activeSecStart,
              curNextSecStart = 0,
              curNextSecEnd = Infinity;
            curTime += 0.1; // account for youtube irregularities
            $('.section').each(function (ii, secEl) {
              var secStart = Number(secEl.getAttribute('data-start')),
                secEnd = Number(secEl.getAttribute('data-end'));
              if (
                (isSecEarly &&
                  curTime > secStart &&
                  secStart >= curNextSecStart) ||
                (!isSecEarly && curTime < secEnd && secEnd <= curNextSecEnd)
              ) {
                curNextSecEnd = secEnd;
                curNextSecStart = secStart;
                $activeSecEl = secEl;
              }
            });
            $activeSecEl = $($activeSecEl);
            $activeSecEl.addClass(consts.activeClass);
            activeSecStart = curNextSecStart;
            activeSecEnd = curNextSecEnd;

            // make the parent chapter active
            $('.' + consts.activeRowClass).removeClass(consts.activeRowClass);
            $activeSecEl
              .closest('.' + consts.groupRowClass)
              .addClass(consts.activeRowClass);
          }
        } else {
          _.each(thisView.vplayers, function (vp) {
            if (vp.getPlayerState && vp.getPlayerState() === 1) {
              curPlaying = vp;
              var gpEl = curPlaying.a.parentElement.parentElement;
              curPlayEnd = gpEl.getAttribute('data-end');
              curPlayStart = gpEl.getAttribute('data-start');
            }
          });
        }
      }, 50);
    },
  });
});
