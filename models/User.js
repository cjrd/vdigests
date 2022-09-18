var bcrypt = require('bcrypt-nodejs');
var crypto = require('crypto');
const shortid = require('shortid');
const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    defaultValue: shortid.generate,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  website: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    set(value) {
      /**
       * Hash the password for security.
       */
      const salt = bcrypt.genSaltSync(5);
      const hash = bcrypt.hashSync(value, salt);
      this.setDataValue('password', hash);
    },
  },
  resetPasswordToken: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  resetPasswordExpires: {
    type: DataTypes.DATE,
    allowNull: true,
  },
});

module.exports = User;
