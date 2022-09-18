const sequelize = require('./sequelize');
const { DataTypes } = require('sequelize');
const User = require('./User');
const { VDigest } = require('./VDigest');

const Ownership = sequelize.define('Ownership', {
  UserId: {
    type: DataTypes.STRING,
    references: {
      model: User,
      key: 'id',
    },
  },
  VDigestId: {
    type: DataTypes.STRING,
    references: {
      model: VDigest,
      key: 'id',
    },
  },
});

User.belongsToMany(VDigest, { through: Ownership });
VDigest.belongsToMany(User, { through: Ownership });

module.exports = Ownership;
