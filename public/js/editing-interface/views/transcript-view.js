/*global define */
define([
  'backbone',
  'underscore',
  'jquery',
  'text!templates/transcript-template.html',
], function (Backbone, _, $, tmpl) {
  var consts = {
    wordClass: 'word',
    transWordsClass: 'transcript-words',
    startChapterClass: 'start-chapter-marker',
    startSectionClass: 'start-section-marker',
    startChapScrollClass: 'start-chapter-scroll-marker',
    startSecScrollClass: 'start-section-scroll-marker',
    mcId: 'main-container',
    segStClass: 'start-marker',
    dragChapClass: 'drag-chapter-word',
    dragSecClass: 'drag-section-word',
    transWrapId: 'transcript-wrap',
    jspTrackClass: 'jspTrack',
    scrollMarkPrefix: 'scrollmark-',
    activeClass: 'active',
    secWordClass: 'secword',
    bpDragClass: 'bpdrag',
  };

  return Backbone.View.extend({
    template: _.template(tmpl),

    events: {
      mousedown: 'transMouseDown',
      mouseup: 'transMouseUp',
      'mouseenter .word': 'wordMouseOver',
      'mouseleave .word': 'wordMouseLeave',
    },

    initialize: function () {
      var thisView = this,
        words = thisView.model.get('words');
      // set up model listeners
      thisView.listenTo(
        words,
        'change:startSection',
        thisView.changeStartSection
      );
      thisView.listenTo(
        words,
        'change:startChapter',
        thisView.changeStartChapter
      );
      thisView.listenTo(words, 'sectionToChapter', thisView.sectionToChapter);
      thisView.listenTo(words, 'change:active', thisView.changeHighlight);
      thisView.listenTo(words, 'focus', thisView.focusOnWord);
      thisView.listenTo(words, 'highlight-section', thisView.highlightSection);
      thisView.listenTo(
        words,
        'unhighlight-section',
        thisView.unHighlightSection
      );
    },

    /**
     * Render the transcript words
     */
    render: function () {
      var thisView = this;
      thisView.$el.html(thisView.template(thisView.model.toJSON()));

      return thisView;
    },

    /**
     * decide whether to highlight a word
     */
    changeHighlight: function (wrd, val) {
      var $wrd = $('#' + wrd.cid);
      if (val) {
        $wrd.addClass(consts.activeClass);
      } else {
        $wrd.removeClass(consts.activeClass);
      }
    },

    /**
     * Mouse over a word in the transcript view
     */
    wordMouseOver: function (evt) {
      var thisView = this;

      // if we're draging a marker
      if (thisView.$mdel && thisView.$mdel.mdStartPt) {
        // slight pause for smoother dragging
        var $curTar = $(evt.currentTarget);
        thisView.$mdel.$curWord = $curTar;
        thisView.lastEnterTimeout = window.setTimeout(function () {
          var widx = $curTar.data('idx'),
            revIndex = thisView.$mdel.revIndex,
            fwdIndex = thisView.$mdel.fwdIndex,
            $mdel = thisView.$mdel,
            $placeMdl = $curTar;
          if (widx < revIndex) {
            $placeMdl = $mdel.$minWord;
            $curTar.removeClass(thisView.$mdel.mouseOverClass);
          } else if (widx > fwdIndex) {
            $placeMdl = $mdel.$maxWord;
          } else {
            $curTar.addClass(thisView.$mdel.mouseOverClass);
          }
          $placeMdl.before($mdel);
          thisView.moveScrollMarker($mdel);

          // highlight from the marker to the next marker
          var $words = this.$words || $('.word');
          $words.removeClass(consts.secWordClass);
          thisView.highlightSection(null, $placeMdl.data('idx'), fwdIndex);
        }, 30);
      }
    },

    /**
     * Mouseleave a word in the transcript view
     */
    wordMouseLeave: function (evt) {
      var thisView = this;
      if (thisView.$mdel) {
        var $curTar = $(evt.currentTarget);
        $curTar.removeClass(thisView.$mdel.mouseOverClass);
      }
      if (thisView.lastEnterTimeout) {
        window.clearTimeout(thisView.lastEnterTimeout);
      }
    },

    /**
     * mouseup on the transcript area
     */
    transMouseUp: function (evt) {
      var thisView = this,
        thisModel = thisView.model,
        $tar = $(evt.target);

      // remove no-dragging class
      $(document.body).removeClass(consts.bpDragClass);

      // if we mousedowned on a word model
      if (thisView.$mdel) {
        $('.' + thisView.$mdel.mouseOverClass).removeClass(
          thisView.$mdel.mouseOverClass
        );
        var $newWord = thisView.$mdel.$curWord,
          oldWord = thisView.$mdel.origWordModel,
          words = thisView.model.get('words');

        if ($newWord) {
          var newId = $newWord.attr('id');
          if (newId !== oldWord.cid) {
            thisModel.changeBreakStart(oldWord, words.get(newId));
          }
        } else if (
          oldWord &&
          ((oldWord.prev && oldWord.prev.cid) || oldWord.cid) == $tar.attr('id')
        ) {
          var chstWord = oldWord.getPrevChapterStart(true),
            secWord = oldWord.getPrevSectionStart(true);

          oldWord = oldWord.prev || oldWord;

          // USE STATS
          window.vdstats.nVideoStartsFromTrans.push(new Date().getTime());
          window.startFromTran = true;

          chstWord.trigger('startVideo', oldWord.get('start'));
          secWord.trigger('infocus');

          // USE STATS
          window.setTimeout(function () {
            window.startFromTran = false;
          }, 800);
        }
        thisView.$mdel = null;
      }
    },

    /**
     * Listen for mousedowns on the transcript:
     * (i) normal click: start playing the video
     * (ii) shift click: create a new section
     * (iii) ctril+shift click: create a new chapter
     */
    transMouseDown: function (evt) {
      var thisView = this,
        thisModel = thisView.model,
        words = thisModel.get('words'),
        $tar = $(evt.target);
      // do nothing if we're mousedowning on a breakpoint

      thisView.$mdel = $tar;

      // add a section/chapter break
      if (evt.metaKey || evt.ctrlKey) {
        var $wordEl = $tar,
          changeType = 'startSection';

        if (evt.altKey) {
          changeType = 'startChapter';
        }

        // make sure we have a valid word element
        if (!$wordEl.hasClass(consts.wordClass)) {
          // check descendants
          var $tmpWordEl = $wordEl.find('.' + consts.wordClass).first();
          // check parents
          if (!$tmpWordEl.length) {
            $tmpWordEl = $wordEl.closest('.' + consts.wordClass);
          }
          // check siblings
          if (!$tmpWordEl.length) {
            $tmpWordEl = $wordEl.nextAll('.' + consts.wordClass).first();
            if (!$tmpWordEl.length) {
              $tmpWordEl = $wordEl.prevAll('.' + consts.wordClass);
            }
          }
          // throw an error if we can't find a word element
          if (!$tmpWordEl.length) {
            throw Error('unable to find word element near click');
          }
          $wordEl = $tmpWordEl;
        }

        var stWordModel = words.get($wordEl.attr('id'));
        // do nothing if the word already starts a section/chapter
        if (
          stWordModel.get('startChapter') ||
          stWordModel.get('startSection')
        ) {
          if (
            changeType === 'startChapter' &&
            !stWordModel.get('startChapter')
          ) {
            // change section to a chapter

            // USE STATS
            window.vdstats.nSec2Chap.push(new Date().getTime());
            window.changingSecChap = true;

            thisView.changeStartSection(stWordModel, false);
            stWordModel.set('startChapter', true);

            // USE STATS
            window.changingSecChap = false;
          } else if (
            changeType === 'startSection' &&
            stWordModel.get('startChapter')
          ) {
            // change chapter to section

            // USE STATS
            window.vdstats.nChap2Sec.push(new Date().getTime());
            window.changingSecChap = true;

            // make sure we're not changing the first chapter
            if (stWordModel.getPrevSectionStart()) {
              stWordModel.set('startChapter', false);
              thisView.changeStartSection(stWordModel, true);

              // USE STATS
              window.changingSecChap = false;
            }
          }
          return;
        } else {
          // word does not already start a section/chapter
          stWordModel.set(changeType, true);
        }
      } // end alt-key
      else {
        // mouse down without modifier
        var $fWord = thisView.$mdel.next();
        if ($fWord.size() === 0) {
          // try the next paragraph
          $fWord = thisView.$mdel.parent().next().children().first();
        }
        thisView.$mdel.origIndex = $fWord.data('idx');

        // make sure we leave the original segment
        if (thisView.$mdel.origIndex === 0) {
          return;
        }

        thisView.$mdel.mdStartPt = thisView.$mdel.hasClass(consts.segStClass);
        thisView.$mdel.isChap = thisView.$mdel.hasClass(
          consts.startChapterClass
        );

        var revIndex = 1,
          fwdIndex = Infinity,
          $mdel = thisView.$mdel;

        // TODO some of this may be extra work for certain cases
        thisView.$mdel.mouseOverClass = $mdel.isChap
          ? consts.dragChapClass
          : consts.dragSecClass;
        // get the forward section/chapter index
        var fwordModel = words.get($fWord.attr('id'));
        if ($fWord.hasClass(consts.wordClass)) {
          thisView.$mdel.origWordModel = fwordModel;
          var fstartModel = fwordModel.getNextSectionStart();
          if (fstartModel) {
            //fstartModel = fstartModel.prev;
            var $maxWord = $('#' + fstartModel.cid);
            $mdel.$maxWord = $maxWord;
            fwdIndex = $maxWord.data('idx');
          }
        }
        // get the backward section/chapter index
        if ($fWord.hasClass(consts.wordClass)) {
          var bstartModel = fwordModel.getPrevSectionStart();
          if (bstartModel) {
            //maneebstartModel = bstartModel.next;
            var $minWord = $('#' + bstartModel.cid);
            $mdel.$minWord = $minWord;
            revIndex = $minWord.data('idx');
          }
        }
        $mdel.revIndex = revIndex;
        $mdel.fwdIndex = fwdIndex;

        if (thisView.$mdel.mdStartPt) {
          // disable selection on the body when dragging a breakpoint
          $(document.body).addClass(consts.bpDragClass);
        }
      }
    },

    changeStartSection: function (wmodel, newVal) {
      var thisView = this;

      if (!newVal || !wmodel.get('startChapter')) {
        var $secEl = thisView.changeSpanIndicator(
          wmodel,
          newVal,
          consts.startSectionClass
        );
        if (newVal) {
          // add marker to the scrollbar
          var mpos = thisView.getScrollMarkPercent($secEl);
          if (mpos > -1) {
            thisView.addScrollMarker(
              mpos,
              consts.startSecScrollClass,
              $secEl.attr('id')
            );
          }
        } else {
          // else remove the marker if one is present before the given word
          thisView.removeScrollMarker($secEl.attr('id'));
        }
      }
    },

    changeStartChapter: function (wmodel, newVal) {
      var thisView = this,
        $chapEl = thisView.changeSpanIndicator(
          wmodel,
          newVal,
          consts.startChapterClass
        );
      if (newVal) {
        // add marker to the scrollbar
        var mpos = thisView.getScrollMarkPercent($chapEl);
        if (mpos > -1) {
          thisView.addScrollMarker(
            mpos,
            consts.startChapScrollClass,
            $chapEl.attr('id')
          );
        }
      } else {
        // remove the marker from the scrollbar
        thisView.removeScrollMarker($chapEl.attr('id'));
      }
    },

    changeSpanIndicator: function (wmodel, newVal, spanClass) {
      var thisView = this,
        $wel = thisView.$el.find('#' + wmodel.cid),
        $startEl;
      if (newVal) {
        $startEl = $('<span>');
        $startEl.attr('id', Math.random().toString(36).substr(10));
        $startEl.addClass(spanClass);
        $startEl.addClass(consts.segStClass);
        $startEl.insertBefore($wel);
      } else {
        $startEl = $wel.prev();
        if ($startEl.hasClass(consts.segStClass)) {
          $startEl.remove();
        } else {
          $startEl = $();
        }
      }
      return $startEl;
    },

    sectionToChapter: function (startWord) {
      var thisView = this;
      // remove the section marker
      thisView.changeStartSection(startWord, false);
      // add a chapter marker
      thisView.changeStartChapter(startWord, true);
    },

    addScrollMarker: function (pos, mclass, relid) {
      var thisView = this,
        $mc = thisView.$mc || $('#' + consts.mcId),
        $smark = $('<div>');
      $smark.addClass(mclass);
      $smark.css('top', pos + '%');
      $smark.attr('id', consts.scrollMarkPrefix + relid);
      $mc.append($smark);
      thisView.$mc = $mc;
    },

    removeScrollMarker: function (relid) {
      var $mpiece = $('#' + consts.scrollMarkPrefix + relid);
      $mpiece.remove();
    },

    moveScrollMarker: function ($corrEl) {
      var thisView = this,
        pos = thisView.getScrollMarkPercent($corrEl),
        $scrollEl = $('#' + consts.scrollMarkPrefix + $corrEl.attr('id'));
      if (pos > -1) {
        $scrollEl.css('top', pos + '%');
      }
      return $scrollEl;
    },

    // TODO normalize by the size of the el
    getScrollMarkPercent: function ($transEl) {
      var thisView = this,
        per =
          ($transEl.position().top /
            thisView.$el.find('.' + consts.transWordsClass).height()) *
          100;
      return per;
    },

    focusOnWord: function (fword) {
      if (window.jspApi) {
        window.jspApi.scrollToElement('#' + fword.cid, true, true);
      }
    },

    highlightSection: function (fword, thisIdx, nextIdx) {
      // get the idxs
      var nextWord = nextIdx ? null : fword.getNextSectionStart();
      (nextIdx =
        typeof nextIdx === 'undefined'
          ? nextWord
            ? $('#' + nextWord.cid).data('idx')
            : Infinity
          : nextIdx),
        (thisIdx =
          typeof thisIdx === 'undefined'
            ? $('#' + fword.cid).data('idx')
            : thisIdx);

      // mark the appropriate words TODO need to unmark them
      var $words = this.$words || $('.word');
      var $useWords = $words.filter(function (i, wrd) {
        var idx = wrd.getAttribute('data-idx');
        return idx >= thisIdx && idx < nextIdx;
      });
      $useWords.addClass(consts.secWordClass);
      this.$words = $words;
    },

    unHighlightSection: function (wrd) {
      $('.' + consts.secWordClass).removeClass(consts.secWordClass);
    },
  });
});
