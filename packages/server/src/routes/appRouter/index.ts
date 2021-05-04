import { noop, partialNormalized, partialSemver } from '@appsemble/utils';

import { tinyRouter } from '../../middleware/tinyRouter';
import { staticHandler } from '../static';
import { blockAssetHandler } from './blockAssetHandler';
import { blockCSSHandler } from './blockCSSHandler';
import { cssHandler } from './cssHandler';
import { iconHandler } from './iconHandler';
import { indexHandler } from './indexHandler';
import { manifestHandler } from './manifestHandler';
import { robotsHandler } from './robotsHandler';

const blockName = `(?<name>@${partialNormalized.source}/${partialNormalized.source})`;

export const appRouter = tinyRouter([
  {
    route: '/manifest.json',
    get: manifestHandler,
  },
  {
    route: '/robots.txt',
    get: robotsHandler,
  },
  {
    route: /^\/icon-(?<width>\d+)(x(?<height>\d+))?\.(?<format>png|tiff|webp)$/,
    get: iconHandler,
  },
  {
    route: new RegExp(
      `^/api/blocks/${blockName}/versions/(?<version>${partialSemver.source})/(?<filename>.+)$`,
    ),
    get: blockAssetHandler,
  },
  {
    route: '/core.css',
    get: cssHandler('coreStyle'),
  },
  {
    route: '/shared.css',
    get: cssHandler('sharedStyle'),
  },
  {
    route: new RegExp(`^/${blockName}\\.css`),
    get: blockCSSHandler,
  },
  {
    route: /(^|\/)\.well-known(\/|$)/,
    any: noop,
  },
  {
    route: '/index.html',
    get: indexHandler,
  },
  {
    route: /\.[a-z]\w*$/i,
    any: staticHandler('app'),
  },
  {
    route: /.*/,
    get: indexHandler,
  },
]);
