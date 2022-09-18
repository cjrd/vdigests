/**
 * Error related utility functions
 */

/*global require exports*/

exports.returnError = function (res, errMsg, next, errCode) {
  errCode = errCode || 400;
  res.writeHead(errCode, { 'content-type': 'application/json' });
  res.end('{"error":"' + errMsg + '"}');
};
