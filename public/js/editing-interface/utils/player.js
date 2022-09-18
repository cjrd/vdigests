/*global define YT*/

let allPlayers = [];

define(['jquery'], function ($) {
  var player = {
    allPlayers,
    inputVideo: function (
      container,
      ytid,
      vplayerObj,
      startTime,
      exactStartTime,
      setAttr
    ) {
      if (
        typeof window.YT == 'undefined' ||
        typeof window.YT.Player == 'undefined'
      ) {
        window.toLoadPlayers.push([
          container,
          ytid,
          vplayerObj,
          startTime,
          exactStartTime,
          setAttr,
        ]);
      } else {
        player.loadPlayer(
          container,
          ytid,
          vplayerObj,
          startTime,
          exactStartTime,
          setAttr
        );
      }
    },

    loadPlayer: function (
      container,
      ytid,
      vplayerObj,
      startTime,
      exactStartTime,
      setAttr
    ) {
      var pobj = new window.YT.Player(container, {
        videoId: ytid,
        playerVars: {
          controls: 1,
          autohide: 1,
          enablejsapi: 1,
          rel: 0,
          modestbranding: 1,
          showInfo: 0,
          start: startTime,
        },
        events: {
          onReady: function (event) {
            window.preppingVideo = true;
            event.target.playVideo();
            event.target.mute();
            window.setTimeout(function () {
              event.target.unMute();
              event.target.pauseVideo();
              event.target.pauseVideo();
              event.target.seekTo(exactStartTime);
              // event.target.setPlaybackQuality("small"); // TODO figure out how to reduce quality
              window.preppingVideo = false;
            }, 500);
          },
        },
      });

      // TODO fix edit/output hack
      if (setAttr) {
        vplayerObj[setAttr] = pobj;
      } else {
        vplayerObj[container.id] = pobj;
      }
      allPlayers.push(pobj);
    },
  };

  return player;
});
