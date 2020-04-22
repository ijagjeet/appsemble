import { createInstance } from 'axios-test-instance';
import Koa from 'koa';

import boomMiddleware from '../../middleware/boom';
import { Organization } from '../../models';
import { closeTestSchema, createTestSchema, truncate } from '../../utils/test/testSchema';
import appRouter from '.';

let request;

beforeAll(createTestSchema('organizationcsshandler'));

beforeAll(async () => {
  request = await createInstance(
    new Koa()
      .use((ctx, next) => {
        ctx.argv = { host: 'http://localhost' };
        Object.defineProperty(ctx, 'origin', { value: 'http://app.org.localhost' });
        return next();
      })
      .use(boomMiddleware())
      .use(appRouter),
  );
});

afterEach(truncate);

afterAll(async () => {
  await request.close();
});

afterAll(closeTestSchema);

it('should serve organization core CSS', async () => {
  const org = await Organization.create({
    id: 'org',
    coreStyle: 'body { color: green; }',
    sharedStyle: 'body { color: purple; }',
  });
  await org.createApp({
    definition: {},
    path: 'app',
    vapidPrivateKey: '',
    vapidPublicKey: '',
  });
  const response = await request.get('/organization/core.css');
  expect(response).toMatchObject({
    status: 200,
    headers: {
      'content-type': 'text/css; charset=utf-8',
    },
    data: 'body { color: green; }',
  });
});

it('should serve organization shared CSS', async () => {
  const org = await Organization.create({
    id: 'org',
    coreStyle: 'body { color: green; }',
    sharedStyle: 'body { color: purple; }',
  });
  await org.createApp({
    definition: {},
    path: 'app',
    vapidPrivateKey: '',
    vapidPublicKey: '',
  });
  const response = await request.get('/organization/shared.css');
  expect(response).toMatchObject({
    status: 200,
    headers: {
      'content-type': 'text/css; charset=utf-8',
    },
    data: 'body { color: purple; }',
  });
});

it('should handle if an app is not found', async () => {
  const response = await request.get('/organization/core.css');
  expect(response).toMatchObject({
    status: 404,
    data: {
      error: 'Not Found',
      message: 'Not Found',
      statusCode: 404,
    },
  });
});
