import { parse } from 'node:querystring';

import { loggerMiddleware } from '@appsemble/node-utils';
import { api, convertToCsv } from '@appsemble/utils';
import { notFound } from '@hapi/boom';
import cors from '@koa/cors';
import { parse as parseCSV } from 'csv-parse';
import Koa, { Middleware } from 'koa';
import compose from 'koa-compose';
import compress from 'koa-compress';
import range from 'koa-range';
import { bodyParser, bufferParser, Parser } from 'koas-body-parser';
import { koas } from 'koas-core';
import { operations } from 'koas-operations';
import { parameters } from 'koas-parameters';
import { security, SecurityOptions } from 'koas-security';
import { serializer } from 'koas-serializer';
import { specHandler } from 'koas-spec-handler';
import { statusCode } from 'koas-status-code';
import { swaggerUI } from 'koas-swagger-ui';
import { Configuration } from 'webpack';

import * as controllers from '../controllers/index.js';
import { appMapper } from '../middleware/appMapper.js';
import { boomMiddleware } from '../middleware/boom.js';
import { conditional } from '../middleware/conditional.js';
import { frontend } from '../middleware/frontend.js';
import pkg from '../package.json' assert { type: 'json' };
import { appRouter, studioRouter } from '../routes/index.js';
import { argv } from './argv.js';
import { authentication } from './authentication.js';
import { Mailer } from './email/Mailer.js';

const xWwwFormUrlencodedParser: Parser<unknown> = async (body, mediaTypeObject, options, ctx) => {
  const buffer = await bufferParser(body, mediaTypeObject, options, ctx);
  const data = parse(String(buffer));
  return data;
};

const csvParser: Parser<unknown[]> = (body) =>
  new Promise((resolve, reject) => {
    body.pipe(
      parseCSV({ bom: true, columns: true }, (error, records) => {
        if (error) {
          reject(error);
        } else {
          resolve(records);
        }
      }),
    );
  });

interface CreateServerOptions {
  /**
   * Additional middleware to inject before any other middleware.
   *
   * This is used for testing purposes.
   */
  middleware?: Middleware;

  /**
   * Webpack configurations to serve using Webpack dev server middleware.
   */
  webpackConfigs?: Configuration[];
}

export async function createServer({
  middleware,
  webpackConfigs,
}: CreateServerOptions = {}): Promise<Koa> {
  const app = new Koa();
  app.keys = [argv.secret];
  app.proxy = argv.proxy;
  if (middleware) {
    app.use(middleware);
  }
  app.use(loggerMiddleware());
  app.use(boomMiddleware());
  app.use(range);
  Object.assign(app.context, { mailer: new Mailer(argv) });

  if (process.env.NODE_ENV === 'production') {
    app.use(compress());
  }

  if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'production') {
    app.use(await frontend(webpackConfigs));
  }

  app.use(
    appMapper(
      compose([
        conditional((ctx) => ctx.path.startsWith('/api') || ctx.path === '/oauth2/token', cors()),
        koas(api(pkg.version, argv), [
          specHandler(),
          swaggerUI({ url: '/api-explorer' }),
          security(authentication() as SecurityOptions),
          parameters(),
          bodyParser({
            parsers: {
              'application/x-www-form-urlencoded': xWwwFormUrlencodedParser,
              'text/csv': csvParser,
              '*/*': bufferParser,
            },
          }),
          serializer({
            serializers: {
              'application/xml': (body: string) => body,
              'text/csv': convertToCsv,
            },
          }),
          statusCode(),
          operations({ controllers }),
        ]),
        ({ path }, next) => {
          if (path.startsWith('/api/')) {
            throw notFound('URL not found');
          }
          return next();
        },
        studioRouter,
      ]),
      appRouter,
    ),
  );

  return app;
}
