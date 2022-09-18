var _ = require('underscore');
const bcrypt = require('bcrypt-nodejs');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
var User = require('../models/User');
var secrets = require('./secrets');

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(async function (id, done) {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Sign in using Email and Password.

async function comparePassword(candidatePassword, userPassword) {
  return new Promise((resolve, reject) => {
    bcrypt.compare(candidatePassword, userPassword, function (err, isMatch) {
      if (err) {
        reject(err);
      } else {
        resolve(isMatch);
      }
    });
  });
}

passport.use(
  new LocalStrategy({ usernameField: 'email' }, async function (
    email,
    password,
    done
  ) {
    try {
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return done(null, false, { message: 'Email ' + email + ' not found' });
      }
      const isMatch = await comparePassword(password, user.password);
      if (isMatch) {
        return done(null, user);
      } else {
        return done(null, false, { message: 'Invalid email or password.' });
      }
    } catch (err) {
      return done(err);
    }
  })
);

// Login Required middleware.

exports.isAuthenticated = function (req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
};

// Authorization Required middleware.

exports.isAuthorized = function (req, res, next) {
  var provider = req.path.split('/').slice(-1)[0];

  if (_.findWhere(req.user.tokens, { kind: provider })) {
    next();
  } else {
    res.redirect('/auth/' + provider);
  }
};
