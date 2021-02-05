import { logger } from '@appsemble/node-utils';
import { DataTypes, Op, Sequelize } from 'sequelize';

export const key = '0.17.6';

/**
 * Summary:
 * - Remove soft deleted assets.
 * - Remove column Asset.deleted
 * - Remove soft deleted resources.
 * - Remove column Resource.deleted
 *
 * @param db - The sequelize database.
 */
export async function up(db: Sequelize): Promise<void> {
  const queryInterface = db.getQueryInterface();

  logger.warn('Deleting soft deleted assets');
  await queryInterface.bulkDelete('Asset', { [Op.not]: { deleted: null } });

  logger.warn('Deleting soft deleted resources');
  await queryInterface.bulkDelete('Resource', { [Op.not]: { deleted: null } });

  logger.info('Removing column Asset.deleted');
  await queryInterface.removeColumn('Asset', 'deleted');

  logger.info('Removing column Resource.deleted');
  await queryInterface.removeColumn('Resource', 'deleted');
}

/**
 * Summary:
 * - Add column Resource.deleted
 * - Add column Asset.deleted
 *
 * @param db - The sequelize database.
 */
export async function down(db: Sequelize): Promise<void> {
  const queryInterface = db.getQueryInterface();

  logger.info('Removing column Resource.deleted');
  await queryInterface.addColumn('Resource', 'deleted', { type: DataTypes.DATE });

  logger.info('Removing column Asset.deleted');
  await queryInterface.addColumn('Asset', 'deleted', { type: DataTypes.DATE });
}
