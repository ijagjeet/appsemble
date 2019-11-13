import { DataTypes } from 'sequelize';
import { generateVAPIDKeys } from 'web-push';

export default {
  key: '0.9.1',

  async up(db) {
    const queryInterface = db.getQueryInterface();

    await queryInterface.addColumn('App', 'vapidPublicKey', {
      type: DataTypes.STRING,
      allowNull: false,
    });

    await queryInterface.addColumn('App', 'vapidPrivateKey', {
      type: DataTypes.STRING,
      allowNull: false,
    });

    await queryInterface.createTable('AppSubscription', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      endpoint: { type: DataTypes.STRING, allowNull: false },
      p256dh: { type: DataTypes.STRING, allowNull: false },
      auth: { type: DataTypes.STRING, allowNull: false },
      AppId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'App',
          key: 'id',
        },
      },
      UserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'User',
          key: 'id',
        },
      },
      created: { allowNull: false, type: DataTypes.DATE },
      updated: { allowNull: false, type: DataTypes.DATE },
      deleted: { allowNull: true, type: DataTypes.DATE },
    });

    const allApps = await db.query('SELECT id FROM `App`', {
      raw: true,
      type: db.QueryTypes.SELECT,
    });

    await Promise.all(
      allApps.map(({ id }) => {
        const keys = generateVAPIDKeys();
        return db.query('UPDATE `App` SET vapidPublicKey = ?, vapidPrivateKey = ? WHERE id = ?', {
          replacements: [keys.publicKey, keys.privateKey, id],
          type: db.QueryTypes.UPDATE,
        });
      }),
    );
  },

  async down(db) {
    const queryInterface = db.getQueryInterface();

    await queryInterface.removeColumn('App', 'vapidPublicKey');
    await queryInterface.removeColumn('App', 'vapidPrivateKey');
    await queryInterface.dropTable('AppSubscription');
  },
};
