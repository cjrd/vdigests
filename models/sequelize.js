const { Sequelize } = require('sequelize');

let sequelize;
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: true,
  });
} else {
  // local dev with sqlite
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'local-database.sqlite',
    logging: false,
  });
}

module.exports = sequelize;
