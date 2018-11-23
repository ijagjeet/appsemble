import Sequelize from 'sequelize';

import setupModels from '../setupModels';

/**
 * Create a temporary test database.
 *
 * The database will be deleted when it is closed.
 *
 * @param {string} spec The name of the test case.
 * @param {Object} options Additional sequelize options.
 */
export default async function testSchema(spec, options = {}) {
  const database = process.env.DATABASE_URL || 'mysql://root:password@localhost:3306';
  const root = new Sequelize(database, {
    logging: false,
    // XXX: This removes a pesky sequelize warning. Remove this when updating to sequelize@^5.
    operatorsAliases: Sequelize.Op.Aliases,
  });

  const dbName = root
    .escape(`appsemble_test_${spec}_${new Date().toISOString()}`)
    .replace(/'/g, '')
    .replace(/\W+/g, '_')
    .substring(0, 63)
    .toLowerCase();

  await root.query(`CREATE DATABASE ${dbName}`);
  const db = await setupModels({
    ...options,
    sync: true,
    uri: `${database.replace(/\/\w+$/, '')}/${dbName}`,
  });

  return {
    ...db,
    async close() {
      await db.close();

      await root.query(`DROP DATABASE ${dbName}`);
      await root.close();
    },
  };
}
