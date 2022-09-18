/*global define */
define(['underscore', 'jquery', 'canvas2Image'], function (_, $, Canvas2Image) {
  var Utils = {};

  /**
   * Obtain a video screenshot from the server
   */
  Utils.getScreenShot = async function (vidid, time) {
    if (vidid === undefined || time === undefined) {
      throw Error('must set vidid and time parameters');
    }
    var url = '/screenshot?id=' + vidid + '&time=' + time;
    return await $.get(url);
  };

  // THX https://docs.djangoproject.com/en/dev/ref/contrib/csrf/
  Utils.getCookie = function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie != '') {
      var cookies = document.cookie.split(';');
      for (var i = 0; i < cookies.length; i++) {
        var cookie = $.trim(cookies[i]);
        // Does this cookie string begin with the name we want?
        if (cookie.substring(0, name.length + 1) == name + '=') {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  return Utils;
});
