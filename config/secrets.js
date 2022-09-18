module.exports = {
  db: process.env.MONGODB_URI || 'mongodb://localhost:27017/vdigest',

  betaPW: process.env.BETA_PASSWORD || 'somepw',

  sessionSecret: process.env.SESSION_SECRET || 'somesessionsecret',

  mailgun: {
    user: process.env.MAILGUN_USER,
    password: process.env.MAILGUN_PASSWORD,
  },

  adminEmail: 'amypavel@gmail.com',
};
