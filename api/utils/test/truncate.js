export default async function truncate(models) {
  await Promise.all(
    Object.entries(models)
      .filter(([key]) => !/^(sequelize|close)$/i.test(key))
      .map(([, model]) => model.destroy({ where: {}, force: true })),
  );
}
