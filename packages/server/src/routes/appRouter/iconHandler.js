import getApp from '../../utils/getApp';
import serveIcon from '../serveIcon';

export default async function iconHandler(ctx) {
  const { params } = ctx;
  const app = await getApp(ctx, {
    attributes: ['definition', 'icon'],
    raw: true,
  });
  const width = Number(params.width);
  const height = Number(params.height || params.width);
  const { format } = params;
  const opaque = 'opaque' in ctx.request.query || format === 'jpg' || format === 'tiff';
  let background;

  if (opaque) {
    const { themeColor = '#ffffff', splashColor = themeColor } = app.definition.theme || {};
    background = splashColor;
  }

  await serveIcon(ctx, { background, format, height, icon: app && app.icon, width });
}
