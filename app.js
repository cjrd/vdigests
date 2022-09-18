/**
 * Module dependencies.
 */

var express = require('express');
var cookieParser = require('cookie-parser');
var compress = require('compression');
var session = require('express-session');
var bodyParser = require('body-parser');
var logger = require('morgan');
var errorHandler = require('errorhandler');
var csrf = require('lusca').csrf();
var methodOverride = require('method-override');
var sslRedirect = require('heroku-ssl-redirect');
const sequelize = require('./models/sequelize');
// load models
require('./models');

sequelize.sync();

var fs = require('fs');
var https = require('https');

const SequelizeStore = require('connect-session-sequelize')(session.Store);
var flash = require('express-flash');
var path = require('path');
var passport = require('passport');
var expressValidator = require('express-validator');
var connectAssets = require('connect-assets');

/**
 * Load controllers.
 */

var homeController = require('./controllers/home');
var userController = require('./controllers/user');
var contactController = require('./controllers/contact');
var editorController = require('./controllers/editor-controller');
var screenShotController = require('./controllers/screenshot');
var vdlistController = require('./controllers/vdlist');

/**
 * API keys + Passport configuration.
 */

var secrets = require('./config/secrets');
var passportConf = require('./config/passport');

/**
 * Create Express server.
 */

var app = express();

function initServer() {
  var hour = 3600000;
  var day = hour * 24;
  var week = day * 7;

  /**
   * CSRF Whitelist
   */

  // TODO fix
  var whitelist = ['/newvd'];

  /**
   * Express configuration.
   */

  /**
   * CORS
   */
  app.all('/*', function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept'
    );
    next();
  });

  app.set('port', process.env.PORT || 3000);
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'jade');
  app.use(sslRedirect());
  app.use(
    connectAssets({
      paths: ['public/css', 'public/js', 'public/img'],
      helperContext: app.locals,
      servePath: 'vdstatic',
      compress: false, // connect-assets doesn't support es6+, I think? we'll compress with terser in the build process
    })
  );
  app.use(compress());
  app.use(logger('dev'));
  app.use(bodyParser.json({ limit: '100mb' }));
  app.use(bodyParser.urlencoded({ limit: '100mb' }));
  app.use(expressValidator());
  app.use(methodOverride());
  app.use(cookieParser());
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(function (req, res, next) {
    // AMy change
    next();
    // if (whitelist.indexOf(req.path) !== -1) next();
    // else csrf(req, res, next);
  });
  app.use(function (req, res, next) {
    res.locals.user = req.user;
    res.locals.prod = process.env.NODE_ENV === 'production';
    next();
  });
  app.use(flash());

  app.use(
    '/:extra(videodigests)?',
    express.static(path.join(__dirname, 'public'), { maxAge: week })
  );
  app.use(function (req, res, next) {
    // Keep track of previous URL to redirect back to
    // original destination after a successful login.
    if (req.method !== 'GET') return next();
    var path = req.path.split('/')[1];
    if (/(auth|login|logout|signup)$/i.test(path)) return next();
    req.session.returnTo = req.path;
    next();
  });

  // TODO: make this more informative
  app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(500).send('Sorry, something broke!');
  });

  /**
   * Application routes.
   */
  var extraPath = ':extra?/?';
  // var extraPath = "";
  app.get('/:extra(videodigests)?', homeController.index);
  // TODO separate editor from the viewer
  app.get('/' + extraPath + 'view/:vdid', editorController.getEditor);
  app.get('/' + extraPath + 'view/:vdid/:slug', editorController.getEditor);
  app.get('/' + extraPath + 'editor', editorController.getEditor);
  app.get('/' + extraPath + 'tutorial', homeController.tutorial);

  // TODO make more restful
  app.get('/' + extraPath + 'digestdata/:vdid', editorController.getDigestData);
  app.post(
    '/' + extraPath + 'digestpublish/:vdid',
    passportConf.isAuthenticated,
    editorController.postPublishDigest
  );
  app.get('/' + extraPath + 'autoseg/:vdid', editorController.getAutoSeg);

  // TODO add Authorization
  app.post(
    '/' + extraPath + 'digestdata/:vdid',
    editorController.postDigestData
  );
  app.get('/' + extraPath + 'checkstatus', editorController.getStatus);
  app.get('/' + extraPath + 'screenshot', screenShotController.getScreenShot);
  app.post('/' + extraPath + 'newvd', editorController.postNewVD);
  // Disable "latest" page for now
  // app.get('/' + extraPath + 'latest', vdlistController.getVDList);
  app.get('/' + extraPath + 'login', userController.getLogin);
  app.post('/' + extraPath + 'login', userController.postLogin);
  app.get('/' + extraPath + 'logout', userController.logout);
  app.get('/' + extraPath + 'forgot', userController.getForgot);
  app.post('/' + extraPath + 'forgot', userController.postForgot);
  app.get('/' + extraPath + 'reset/:token', userController.getReset);
  app.post('/' + extraPath + 'reset/:token', userController.postReset);
  app.get('/' + extraPath + 'signup', userController.getSignup);
  app.post('/' + extraPath + 'signup', userController.postSignup);
  app.get('/' + extraPath + 'contact', contactController.getContact);
  app.post('/' + extraPath + 'contact', contactController.postContact);
  app.get(
    '/' + extraPath + 'account',
    passportConf.isAuthenticated,
    userController.getAccount
  );
  app.post(
    '/' + extraPath + 'account/profile',
    passportConf.isAuthenticated,
    userController.postUpdateProfile
  );
  app.post(
    '/' + extraPath + 'account/password',
    passportConf.isAuthenticated,
    userController.postUpdatePassword
  );
  app.post(
    '/' + extraPath + 'account/delete',
    passportConf.isAuthenticated,
    userController.postDeleteAccount
  );

  app.use(errorHandler());
}

const sessionStore = new SequelizeStore({
  db: sequelize,
});

app.use(
  session({
    secret: secrets.sessionSecret,
    store: sessionStore,
    resave: false,
    proxy: true,
  })
);

sessionStore.sync();
sequelize.sync();

/**
 * Start Express server.
 */

initServer();

app.listen(app.get('port'), function () {
  console.log(
    ' ✔ Express server listening on port %d in %s mode',
    app.get('port'),
    app.get('env')
  );
});

module.exports = app;
