var _ = require('underscore');
var async = require('async');
var crypto = require('crypto');
var nodemailer = require('nodemailer');
var passport = require('passport');
const User = require('../models/User');
const { VDigest } = require('../models/VDigest');
var secrets = require('../config/secrets');

/**
 * GET /login
 * Login page.
 */

exports.getLogin = function (req, res) {
  if (req.user) return res.redirect('/');
  res.render('account/login', {
    title: 'Login',
  });
};

/**
 * POST /login
 * Sign in using email and password.
 * @param email
 * @param password
 */

exports.postLogin = function (req, res, next) {
  req.assert('email', 'Email is not valid').isEmail();
  req.assert('password', 'Password cannot be blank').notEmpty();

  var errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/login');
  }

  passport.authenticate('local', function (err, user, info) {
    if (err) return next(err);
    if (!user) {
      req.flash('errors', { msg: info.message });
      return res.redirect('/login');
    }
    req.logIn(user, function (err) {
      if (err) return next(err);
      req.flash('success', { msg: 'Success! You are logged in.' });
      res.redirect('/'); // TODO
    });
  })(req, res, next);
};

/**
 * GET /logout
 * Log out.
 */

exports.logout = function (req, res) {
  req.logout();
  res.redirect('/');
};

/**
 * GET /signup
 * Signup page.
 */

exports.getSignup = function (req, res) {
  if (req.user) return res.redirect('/');
  res.render('account/signup', {
    title: 'Create Account',
  });
};

/**
 * POST /signup
 * Create a new local account.
 * @param email
 * @param password
 */

exports.postSignup = async function (req, res, next) {
  req.assert('email', 'Email is not valid').isEmail();
  req.assert('password', 'Password must be at least 4 characters long').len(4);
  req
    .assert('confirmPassword', 'Passwords do not match')
    .equals(req.body.password);
  req.assert('beta', 'Incorrect beta code').equals(secrets.betaPW);
  req
    .assert('name', 'Please fill in your name so we know what to call you =)')
    .notEmpty();

  var errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/signup');
  }

  const existingUser = await User.findOne({ where: { email: req.body.email } });
  if (existingUser) {
    req.flash('errors', {
      msg: 'Account with that email address already exists.',
    });
    return res.redirect('/signup');
  }

  try {
    const user = await User.create({
      email: req.body.email,
      password: req.body.password,
      name: req.body.name,
    });
    req.logIn(user, function (err) {
      if (err) return next(err);
      res.redirect('/');
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /account
 * Profile page.
 */

exports.getAccount = async function (req, res) {
  try {
    const user = await User.findByPk(req.user.id, {
      include: VDigest,
      through: {
        attributes: ['title', 'puburl', 'id'],
      },
    });
    res.render('account/profile', {
      title: 'Account Management',
      vds: user.VDigests,
    });
  } catch (err) {
    console.log(err); // TODO handle error
    req.flash('error', {
      msg: 'There was a problem loading your profile.',
    });
    res.redirect('/');
  }
};

/**
 * POST /account/profile
 * Update profile information.
 */

exports.postUpdateProfile = async function (req, res, next) {
  try {
    const user = await User.findByPk(req.user.id);
    user.email = req.body.email || '';
    user.name = req.body.name || '';
    user.location = req.body.location || '';
    user.website = req.body.website || '';
    await user.save();
    req.flash('success', { msg: 'Profile information updated.' });
    res.redirect('/account');
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /account/password
 * Update current password.
 * @param password
 */

exports.postUpdatePassword = async function (req, res, next) {
  req.assert('password', 'Password must be at least 4 characters long').len(4);
  req
    .assert('confirmPassword', 'Passwords do not match')
    .equals(req.body.password);

  var errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/account');
  }

  try {
    const user = await User.findByPk(req.user.id);
    user.password = req.body.password;
    await user.save();
    req.flash('success', { msg: 'Password has been changed.' });
    res.redirect('/account');
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /account/delete
 * Delete user account.
 * @param id - User ObjectId
 */

exports.postDeleteAccount = async function (req, res, next) {
  try {
    const user = await User.findByPk(req.user.id);
    if (user) {
      await user.destroy();
    }
    req.logout();
    res.redirect('/');
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /reset/:token
 * Reset Password page.
 */

exports.getReset = async function (req, res) {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }

  try {
    const user = await User.findOne({
      where: { resetPasswordToken: req.params.token },
    });
    console.log(
      'Reset expiration date:',
      user ? user.resetPasswordExpires : 'not found'
    );
    if (
      !user ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      req.flash('errors', {
        msg: 'Password reset token is invalid or has expired.',
      });
      return res.redirect('/forgot');
    }
    res.render('account/reset', {
      title: 'Password Reset',
    });
  } catch (err) {
    req.flash('errors', {
      msg: 'Password reset token is invalid or has expired.',
    });
    return res.redirect('/forgot');
  }
};

/**
 * POST /reset/:token
 * Process the reset password request.
 */

exports.postReset = async function (req, res, next) {
  req.assert('password', 'Password must be at least 4 characters long.').len(4);
  req.assert('confirm', 'Passwords must match.').equals(req.body.password);

  var errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('back');
  }

  try {
    const user = await User.findOne({
      where: { resetPasswordToken: req.params.token },
    });
    if (
      !user ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      req.flash('errors', {
        msg: 'Password reset token is invalid or has expired.',
      });
      return res.redirect('back');
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    await new Promise((resolve, reject) => {
      req.logIn(user, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    const smtpTransport = nodemailer.createTransport('SMTP', {
      service: 'Mailgun',
      auth: {
        user: secrets.mailgun.user,
        pass: secrets.mailgun.password,
      },
    });
    const mailOptions = {
      to: user.email,
      from: 'hackathon@starter.com',
      subject: 'Your Hackathon Starter password has been changed',
      text:
        'Hello,\n\n' +
        'This is a confirmation that the password for your account ' +
        user.email +
        ' has just been changed.\n',
    };
    await new Promise((resolve, reject) => {
      smtpTransport.sendMail(mailOptions, function (err) {
        req.flash('success', {
          msg: 'Success! Your password has been changed.',
        });
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    res.redirect('/');
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /forgot
 * Forgot Password page.
 */

exports.getForgot = function (req, res) {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  res.render('account/forgot', {
    title: 'Forgot Password',
  });
};

/**
 * POST /forgot
 * Create a random token, then the send user an email with a reset link.
 * @param email
 */

exports.postForgot = async function (req, res, next) {
  req.assert('email', 'Please enter a valid email address.').isEmail();

  var errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/forgot');
  }

  try {
    const token = await new Promise((resolve, reject) => {
      crypto.randomBytes(16, function (err, buf) {
        if (err) {
          reject(err);
        } else {
          var token = buf.toString('hex');
          resolve(token);
        }
      });
    });

    const user = await User.findOne({
      where: { email: req.body.email.toLowerCase() },
    });
    if (!user) {
      req.flash('errors', {
        msg: 'No account with that email address exists.',
      });
      return res.redirect('/forgot');
    }

    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    await user.save();

    const smtpTransport = nodemailer.createTransport('SMTP', {
      service: 'Mailgun',
      auth: {
        user: secrets.mailgun.user,
        pass: secrets.mailgun.password,
      },
    });
    const mailOptions = {
      to: user.email,
      from: 'hackathon@starter.com',
      subject: 'Reset your password on Hackathon Starter',
      text:
        'You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n' +
        'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
        'http://' +
        req.headers.host +
        '/reset/' +
        token +
        '\n\n' +
        'If you did not request this, please ignore this email and your password will remain unchanged.\n',
    };
    await new Promise((resolve, reject) => {
      smtpTransport.sendMail(mailOptions, function (err) {
        req.flash('info', {
          msg:
            'An e-mail has been sent to ' +
            user.email +
            ' with further instructions.',
        });
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    res.redirect('/forgot');
  } catch (err) {
    return next(err);
  }
};
