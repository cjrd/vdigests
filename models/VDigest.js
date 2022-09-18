/*global require exports*/

const User = require('./User');
const shortid = require('shortid');
const pathUtils = require('../utils/fpaths');

const { DataTypes } = require('sequelize');
const sequelize = require('./sequelize');

const DEFAULT_DIGEST = Object.freeze({
  author: '',
  title: 'Video Digest',
  chapters: [],
});

const VDigest = sequelize.define('VDigest', {
  id: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: shortid.generate,
    primaryKey: true,
  },
  ytid: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  pubdisplay: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  rawTransName: {
    type: DataTypes.STRING,
  },
  sentSepTransName: {
    type: DataTypes.STRING,
  },
  nSentences: {
    type: DataTypes.INTEGER,
  },
  videoName: {
    type: DataTypes.STRING,
  },
  videoLength: {
    type: DataTypes.FLOAT,
  },
  puburl: {
    type: DataTypes.STRING,
  },
  audioName: {
    type: DataTypes.STRING,
  },
  alignTrans: {
    // just json and not jsonb for now because
    // I don't think we need to query it at all
    type: DataTypes.JSON,
  },
  uploadUser: {
    type: DataTypes.STRING,
    references: {
      model: User,
      key: 'id',
    },
  },
  state: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  anyedit: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    defaultValue: 'New Video Digest',
  },
  digest: {
    type: DataTypes.JSON,
    defaultValue: DEFAULT_DIGEST,
  },

  // virtual fields
  isProcessing: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.state > 1;
    },
    set(value) {
      throw new Error('do not set virutal');
    },
  },
  isReady: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.state === 1;
    },
    set(value) {
      throw new Error('do not set virutal');
    },
  },
  getVideoFile: {
    type: DataTypes.VIRTUAL,
    get() {
      return pathUtils.getVideoFile(this.videoName);
    },
    set(value) {
      throw new Error('do not set virutal');
    },
  },
  getAudioFile: {
    type: DataTypes.VIRTUAL,
    get() {
      return pathUtils.getVideoFile(this.audioName);
    },
    set(value) {
      throw new Error('do not set virutal');
    },
  },
  getSSFile: {
    type: DataTypes.VIRTUAL,
    get() {
      return pathUtils.getSSTransFile(this.id);
    },
    set(value) {
      throw new Error('do not set virutal');
    },
  },
});

module.exports = { VDigest, DEFAULT_DIGEST };
