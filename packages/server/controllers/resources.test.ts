import { createFormData } from '@appsemble/node-utils';
import { Resource as ResourceType } from '@appsemble/types';
import { TeamRole, uuid4Pattern } from '@appsemble/utils';
import { request, setTestApp } from 'axios-test-instance';
import stripIndent from 'strip-indent';
import webpush from 'web-push';

import {
  App,
  AppMember,
  AppSubscription,
  Asset,
  Member,
  Organization,
  Resource,
  ResourceVersion,
  Team,
  TeamMember,
  User,
} from '../models/index.js';
import { setArgv } from '../utils/argv.js';
import { createServer } from '../utils/createServer.js';
import {
  authorizeApp,
  authorizeClientCredentials,
  authorizeStudio,
  createTestUser,
} from '../utils/test/authorization.js';
import { useTestDatabase } from '../utils/test/testSchema.js';

let organization: Organization;
let member: Member;
let user: User;
let originalSendNotification: typeof webpush.sendNotification;

const exampleApp = (orgId: string, path = 'test-app'): Promise<App> =>
  App.create({
    definition: {
      name: 'Test App',
      defaultPage: 'Test Page',
      resources: {
        testResource: {
          views: {
            testView: {
              roles: ['Reader'],
              remap: {
                'object.from': {
                  name: {
                    'string.format': {
                      template: '{id}-{foo}',
                      values: { id: { prop: 'id' }, foo: { prop: 'foo' } },
                    },
                  },
                  randomValue: 'Some random value',
                },
              },
            },
            publicView: {
              roles: ['$public'],
              remap: { 'object.assign': { public: { static: true } } },
            },
            authorView: {
              roles: ['$author'],
              remap: { 'object.assign': { author: { static: true } } },
            },
          },
          schema: {
            type: 'object',
            required: ['foo'],
            properties: {
              foo: { type: 'string' },
              bar: { type: 'string' },
              fooz: { type: 'string' },
              baz: { type: 'string' },
              number: { type: 'number' },
              boolean: { type: 'boolean' },
              integer: { type: 'integer' },
              object: { type: 'object' },
              array: { type: 'array' },
            },
          },
          roles: ['$public'],
          create: {
            hooks: {
              notification: {
                subscribe: 'all',
                data: {
                  title: 'This is the title of a created testResource',
                  content: [
                    {
                      'string.format': {
                        template: 'This is the created resource {id}’s body: {foo}',
                        values: { id: [{ prop: 'id' }], foo: [{ prop: 'foo' }] },
                      },
                    },
                  ],
                },
              },
            },
          },
          update: {
            hooks: {
              notification: {
                subscribe: 'both',
              },
            },
          },
        },
        testResourceB: {
          schema: {
            type: 'object',
            required: ['bar'],
            properties: { bar: { type: 'string' }, testResourceId: { type: 'number' } },
          },
          roles: ['$public'],
          references: {
            testResourceId: {
              resource: 'testResource',
              create: {
                trigger: ['update'],
              },
            },
          },
        },
        testResourceNone: {
          schema: {
            type: 'object',
            required: ['bar'],
            properties: { bar: { type: 'string' } },
          },
          roles: ['$none'],
        },
        testResourceAuthorOnly: {
          schema: {
            type: 'object',
            required: ['foo'],
            properties: { foo: { type: 'string' } },
          },
          create: { roles: ['$author'] },
          count: { roles: ['$author'] },
          delete: { roles: ['$author'] },
          get: { roles: ['$author'] },
          query: { roles: ['$author'] },
          update: { roles: ['$author'] },
        },
        secured: {
          schema: { type: 'object' },
          create: {
            roles: ['Admin'],
          },
          query: {
            roles: ['Reader'],
          },
        },
        testResourceTeam: {
          schema: {
            type: 'object',
            required: ['foo'],
            properties: { foo: { type: 'string' } },
          },
          get: { roles: ['$author', '$team:member'] },
          query: { roles: ['$team:member'] },
          count: { roles: ['$team:member'] },
          update: { roles: ['$team:member'] },
          create: { roles: ['$team:member'] },
          delete: { roles: ['$team:member'] },
        },
        testResourceTeamManager: {
          schema: {
            type: 'object',
            required: ['foo'],
            properties: { foo: { type: 'string' } },
          },
          query: { roles: ['$author', '$team:manager'] },
          update: { roles: ['$team:manager'] },
          create: { roles: ['$team:manager'] },
          delete: { roles: ['$team:manager'] },
        },
        testExpirableResource: {
          expires: '10m',
          schema: {
            type: 'object',
            required: ['foo'],
            properties: { foo: { type: 'string' } },
          },
          roles: ['$public'],
        },
        testPrivateResource: {
          schema: {
            type: 'object',
            required: ['foo'],
            properties: { foo: { type: 'string' } },
          },
          roles: [],
          count: {
            roles: ['$public'],
          },
        },
        testAssets: {
          schema: {
            type: 'object',
            properties: {
              file: { type: 'string', format: 'binary' },
              file2: { type: 'string', format: 'binary' },
              string: { type: 'string' },
            },
          },
          roles: ['$public'],
        },
        testHistoryTrue: {
          roles: ['$public'],
          history: true,
          schema: {
            type: 'object',
            properties: {
              string: { type: 'string' },
            },
          },
        },
        testHistoryDataTrue: {
          roles: ['$public'],
          history: { data: true },
          schema: {
            type: 'object',
            properties: {
              string: { type: 'string' },
            },
          },
        },
        testHistoryDataFalse: {
          roles: ['$public'],
          history: { data: false },
          schema: {
            type: 'object',
            properties: {
              string: { type: 'string' },
            },
          },
        },
      },
      security: {
        default: {
          role: 'Reader',
          policy: 'invite',
        },
        roles: {
          Visitor: {},
          Reader: {},
          Admin: {
            inherits: ['Reader'],
          },
        },
      },
    },
    path,
    vapidPublicKey: 'a',
    vapidPrivateKey: 'b',
    OrganizationId: orgId,
  });

useTestDatabase(import.meta);

beforeAll(async () => {
  setArgv({ host: 'http://localhost', secret: 'test' });
  const server = await createServer();
  await setTestApp(server);
  originalSendNotification = webpush.sendNotification;
});

beforeEach(async () => {
  import.meta.jest.useFakeTimers({ now: 0 });
  user = await createTestUser();
  organization = await Organization.create({
    id: 'testorganization',
    name: 'Test Organization',
  });
  member = await Member.create({
    UserId: user.id,
    OrganizationId: organization.id,
    role: 'Maintainer',
  });
});

afterAll(() => {
  webpush.sendNotification = originalSendNotification;
});

describe('getResourceById', () => {
  it('should be able to fetch a resource', async () => {
    const app = await exampleApp(organization.id);

    const resource = await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'bar' },
    });
    const response = await request.get(`/api/apps/${app.id}/resources/testResource/${resource.id}`);

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "foo": "bar",
        "id": 1,
      }
    `);
  });

  it('should be able to fetch a resource view', async () => {
    const app = await exampleApp(organization.id);

    const resource = await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'bar' },
    });
    await AppMember.create({ AppId: app.id, UserId: user.id, role: 'Reader' });
    authorizeApp(app);
    const response = await request.get(
      `/api/apps/${app.id}/resources/testResource/${resource.id}`,
      { params: { view: 'testView' } },
    );

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "name": "1-bar",
        "randomValue": "Some random value",
      }
    `);
  });

  it('should be able to fetch a public resource view', async () => {
    const app = await exampleApp(organization.id);

    const resource = await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'bar' },
    });

    const response = await request.get(
      `/api/apps/${app.id}/resources/testResource/${resource.id}`,
      { params: { view: 'publicView' } },
    );

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "foo": "bar",
        "id": 1,
        "public": true,
      }
    `);
  });

  it('should return 404 for non-existing resource views', async () => {
    const app = await exampleApp(organization.id);

    const resource = await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'bar' },
    });
    await AppMember.create({ AppId: app.id, UserId: user.id, role: 'Reader' });
    authorizeApp(app);
    const response = await request.get(
      `/api/apps/${app.id}/resources/testResource/${resource.id}`,
      { params: { view: 'missingView' } },
    );

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 404 Not Found
      Content-Type: application/json; charset=utf-8

      {
        "error": "Not Found",
        "message": "View missingView does not exist for resource type testResource",
        "statusCode": 404,
      }
    `);
  });

  it('should check for authentication when using resource views', async () => {
    const app = await exampleApp(organization.id);

    const resource = await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'bar' },
    });
    const response = await request.get(
      `/api/apps/${app.id}/resources/testResource/${resource.id}`,
      { params: { view: 'testView' } },
    );

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 401 Unauthorized
      Content-Type: application/json; charset=utf-8

      {
        "error": "Unauthorized",
        "message": "User is not logged in.",
        "statusCode": 401,
      }
    `);
  });

  it('should check for the correct role when using resource views', async () => {
    const app = await exampleApp(organization.id);

    const resource = await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'bar' },
    });
    await AppMember.create({ AppId: app.id, UserId: user.id, role: 'Visitor' });
    authorizeApp(app);
    const response = await request.get(
      `/api/apps/${app.id}/resources/testResource/${resource.id}`,
      { params: { view: 'testView' } },
    );

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 403 Forbidden
      Content-Type: application/json; charset=utf-8

      {
        "error": "Forbidden",
        "message": "User does not have sufficient permissions.",
        "statusCode": 403,
      }
    `);
  });

  it('should be able to fetch a resource you are a team member of', async () => {
    const app = await exampleApp(organization.id);
    const team = await Team.create({ name: 'Test Team', AppId: app.id });
    const userB = await User.create({ timezone: 'Europe/Amsterdam' });
    await TeamMember.create({ TeamId: team.id, UserId: user.id, role: TeamRole.Member });
    await TeamMember.create({ TeamId: team.id, UserId: userB.id, role: TeamRole.Member });

    await AppMember.create({ AppId: app.id, UserId: user.id, role: 'Member' });
    await AppMember.create({ AppId: app.id, UserId: userB.id, role: 'Member' });

    const resource = await Resource.create({
      AppId: app.id,
      type: 'testResourceTeam',
      data: { foo: 'bar' },
      AuthorId: userB.id,
    });
    authorizeStudio();
    const response = await request.get(
      `/api/apps/${app.id}/resources/testResourceTeam/${resource.id}`,
    );

    expect(response).toMatchInlineSnapshot(
      { data: { $author: { id: expect.any(String) } } },
      `
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$author": {
          "id": Any<String>,
          "name": null,
        },
        "$created": "1970-01-01T00:00:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "foo": "bar",
        "id": 1,
      }
    `,
    );
  });

  it('should not be able to fetch a resource you are not a team member of', async () => {
    const app = await exampleApp(organization.id);
    const team = await Team.create({ name: 'Test Team', AppId: app.id });
    const userB = await User.create({ timezone: 'Europe/Amsterdam' });
    await TeamMember.create({ TeamId: team.id, UserId: userB.id, role: TeamRole.Member });

    await AppMember.create({ AppId: app.id, UserId: userB.id, role: 'Member' });
    await AppMember.create({ AppId: app.id, UserId: user.id, role: 'Member' });

    const resource = await Resource.create({
      AppId: app.id,
      type: 'testResourceTeam',
      data: { foo: 'bar' },
      AuthorId: userB.id,
    });

    authorizeApp(app);
    const response = await request.get(
      `/api/apps/${app.id}/resources/testResourceTeam/${resource.id}`,
    );

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 404 Not Found
      Content-Type: application/json; charset=utf-8

      {
        "error": "Not Found",
        "message": "Resource not found",
        "statusCode": 404,
      }
    `);
  });

  it('should not be able to fetch a resources of a different app', async () => {
    const appA = await exampleApp(organization.id);
    const appB = await exampleApp(organization.id, 'app-b');

    const resource = await Resource.create({
      AppId: appA.id,
      type: 'testResource',
      data: { foo: 'bar' },
    });
    const responseA = await request.get(
      `/api/apps/${appB.id}/resources/testResource/${resource.id}`,
    );
    const responseB = await request.get(
      `/api/apps/${appB.id}/resources/testResourceB/${resource.id}`,
    );

    expect(responseA).toMatchInlineSnapshot(`
      HTTP/1.1 404 Not Found
      Content-Type: application/json; charset=utf-8

      {
        "error": "Not Found",
        "message": "Resource not found",
        "statusCode": 404,
      }
    `);
    expect(responseB).toMatchInlineSnapshot(`
      HTTP/1.1 404 Not Found
      Content-Type: application/json; charset=utf-8

      {
        "error": "Not Found",
        "message": "Resource not found",
        "statusCode": 404,
      }
    `);
  });

  it('should return the resource author when fetching a single resource if it has one', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'foo', bar: 1 },
      AuthorId: user.id,
    });

    const response = await request.get(`/api/apps/${app.id}/resources/testResource/${resource.id}`);

    expect(response).toMatchInlineSnapshot(
      { data: { $author: { id: expect.any(String) } } },
      `
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$author": {
          "id": Any<String>,
          "name": "Test User",
        },
        "$created": "1970-01-01T00:00:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "bar": 1,
        "foo": "foo",
        "id": 1,
      }
    `,
    );
  });

  it('should ignore id in the data fields', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { id: 23, foo: 'foo', bar: 1 },
      AuthorId: user.id,
    });

    const response = await request.get(`/api/apps/${app.id}/resources/testResource/${resource.id}`);

    expect(response).toMatchInlineSnapshot(
      { data: { $author: { id: expect.any(String) } } },
      `
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$author": {
          "id": Any<String>,
          "name": "Test User",
        },
        "$created": "1970-01-01T00:00:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "bar": 1,
        "foo": "foo",
        "id": 1,
      }
    `,
    );
  });

  it('should not fetch expired resources', async () => {
    const app = await exampleApp(organization.id);
    const {
      data: { id },
    } = await request.post<ResourceType>(`/api/apps/${app.id}/resources/testExpirableResource`, {
      foo: 'test',
    });

    const responseA = await request.get(
      `/api/apps/${app.id}/resources/testExpirableResource/${id}`,
    );

    // The resource expires after 10 minutes.
    import.meta.jest.advanceTimersByTime(601e3);

    const responseB = await request.get(
      `/api/apps/${app.id}/resources/testExpirableResource/${id}`,
    );

    expect(responseA).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$expires": "1970-01-01T00:10:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "foo": "test",
        "id": 1,
      }
    `);
    expect(responseB).toMatchInlineSnapshot(`
      HTTP/1.1 404 Not Found
      Content-Type: application/json; charset=utf-8

      {
        "error": "Not Found",
        "message": "Resource not found",
        "statusCode": 404,
      }
    `);
  });

  it('should allow organization app editors to get resources using Studio', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      AppId: app.id,
      type: 'testResourceAuthorOnly',
      data: { foo: 'bar' },
    });
    authorizeStudio();
    const response = await request.get(
      `/api/apps/${app.id}/resources/testResourceAuthorOnly/${resource.id}`,
    );
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "foo": "bar",
        "id": 1,
      }
    `);
  });

  it('should not allow organization members to get resources using Studio', async () => {
    await member.update({
      role: 'Member',
    });
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      AppId: app.id,
      type: 'testResourceAuthorOnly',
      data: { foo: 'bar' },
    });
    authorizeStudio();
    const response = await request.get(
      `/api/apps/${app.id}/resources/testResourceAuthorOnly/${resource.id}`,
    );
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 403 Forbidden
      Content-Type: application/json; charset=utf-8

      {
        "error": "Forbidden",
        "message": "User does not have sufficient permissions.",
        "statusCode": 403,
      }
    `);
  });

  it('should allow organization app editors to get resources using client credentials', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      AppId: app.id,
      type: 'testResourceAuthorOnly',
      data: { foo: 'bar' },
    });
    await authorizeClientCredentials('resources:read');
    const response = await request.get(
      `/api/apps/${app.id}/resources/testResourceAuthorOnly/${resource.id}`,
    );
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "foo": "bar",
        "id": 1,
      }
    `);
  });

  it('should not allow organization members to get resources using client credentials', async () => {
    await member.update({
      role: 'Member',
    });
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      AppId: app.id,
      type: 'testResourceAuthorOnly',
      data: { foo: 'bar' },
    });
    await authorizeClientCredentials('resources:read');
    const response = await request.get(
      `/api/apps/${app.id}/resources/testResourceAuthorOnly/${resource.id}`,
    );
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 403 Forbidden
      Content-Type: application/json; charset=utf-8

      {
        "error": "Forbidden",
        "message": "User does not have sufficient permissions.",
        "statusCode": 403,
      }
    `);
  });
});

describe('queryResources', () => {
  it('should be able to fetch all resources of a type', async () => {
    const app = await exampleApp(organization.id);

    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'bar' },
    });
    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'baz' },
    });
    await Resource.create({ AppId: app.id, type: 'testResourceB', data: { bar: 'baz' } });

    const response = await request.get(`/api/apps/${app.id}/resources/testResource`);

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      [
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "foo": "bar",
          "id": 1,
        },
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "foo": "baz",
          "id": 2,
        },
      ]
    `);
  });

  it('should be possible to filter properties using $select', async () => {
    const app = await exampleApp(organization.id);

    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'bar', bar: 'foo', fooz: 'baz', baz: 'fooz' },
    });
    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'baz', bar: 'fooz', fooz: 'bar', baz: 'foo' },
    });

    const response = await request.get(`/api/apps/${app.id}/resources/testResource`, {
      params: { $select: 'id,foo,bar' },
    });

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      [
        {
          "bar": "foo",
          "foo": "bar",
          "id": 1,
        },
        {
          "bar": "fooz",
          "foo": "baz",
          "id": 2,
        },
      ]
    `);
  });

  it('should trim spaces in $select properties', async () => {
    const app = await exampleApp(organization.id);

    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'bar', bar: 'foo', fooz: 'baz', baz: 'fooz' },
    });
    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'baz', bar: 'fooz', fooz: 'bar', baz: 'foo' },
    });

    const response = await request.get(`/api/apps/${app.id}/resources/testResource`, {
      params: { $select: '  fooz ,    baz     ' },
    });

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      [
        {
          "baz": "fooz",
          "fooz": "baz",
        },
        {
          "baz": "foo",
          "fooz": "bar",
        },
      ]
    `);
  });

  it('should ignore unknown properties in $select', async () => {
    const app = await exampleApp(organization.id);

    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'bar', bar: 'foo', fooz: 'baz', baz: 'fooz' },
    });
    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'baz', bar: 'fooz', fooz: 'bar', baz: 'foo' },
    });

    const response = await request.get(`/api/apps/${app.id}/resources/testResource`, {
      params: { $select: 'unknown' },
    });

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      [
        {},
        {},
      ]
    `);
  });

  it('should be possible to query resources without credentials with the $none role', async () => {
    const app = await exampleApp(organization.id);
    await Resource.create({
      AppId: app.id,
      AuthorId: user.id,
      type: 'testResourceNone',
      data: { bar: 'bar' },
    });

    const response = await request.get(`/api/apps/${app.id}/resources/testResourceNone`);
    expect(response).toMatchInlineSnapshot(
      { data: [{ $author: { id: expect.any(String) } }] },
      `
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      [
        {
          "$author": {
            "id": Any<String>,
            "name": "Test User",
          },
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "bar": "bar",
          "id": 1,
        },
      ]
    `,
    );
  });

  it('should be possible to query resources as author', async () => {
    const app = await exampleApp(organization.id);
    await AppMember.create({ AppId: app.id, UserId: user.id, role: 'Admin' });
    const userB = await User.create({ timezone: 'Europe/Amsterdam' });
    await AppMember.create({ AppId: app.id, UserId: userB.id, role: 'Admin' });

    await Resource.create({
      AppId: app.id,
      AuthorId: user.id,
      type: 'testResourceAuthorOnly',
      data: { foo: 'bar' },
    });
    await Resource.create({
      AppId: app.id,
      AuthorId: userB.id,
      type: 'testResourceAuthorOnly',
      data: { foo: 'baz' },
    });
    await Resource.create({ AppId: app.id, type: 'testResourceB', data: { bar: 'baz' } });

    authorizeApp(app);
    const response = await request.get(`/api/apps/${app.id}/resources/testResourceAuthorOnly`);

    expect(response).toMatchInlineSnapshot(
      { data: [{ $author: { id: expect.any(String) } }] },
      `
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      [
        {
          "$author": {
            "id": Any<String>,
            "name": "Test User",
          },
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "foo": "bar",
          "id": 1,
        },
      ]
    `,
    );
  });

  it('should only fetch resources from team members', async () => {
    const app = await exampleApp(organization.id);
    const team = await Team.create({ name: 'Test Team', AppId: app.id });
    const userB = await User.create({ timezone: 'Europe/Amsterdam' });
    const userC = await User.create({ timezone: 'Europe/Amsterdam' });
    await TeamMember.create({ TeamId: team.id, UserId: user.id, role: TeamRole.Member });
    await TeamMember.create({ TeamId: team.id, UserId: userB.id, role: TeamRole.Member });

    await AppMember.create({ AppId: app.id, UserId: user.id, role: 'Member' });

    await Resource.create({
      AppId: app.id,
      type: 'testResourceTeam',
      data: { foo: 'bar' },
      AuthorId: user.id,
    });
    await Resource.create({
      AppId: app.id,
      type: 'testResourceTeam',
      data: { foo: 'baz' },
      AuthorId: userB.id,
    });
    await Resource.create({
      AppId: app.id,
      type: 'testResourceTeam',
      data: { foo: 'foo' },
      AuthorId: userC.id,
    });

    authorizeApp(app);
    const response = await request.get(`/api/apps/${app.id}/resources/testResourceTeam`);
    expect(response).toMatchInlineSnapshot(
      { data: [{ $author: { id: expect.any(String) } }, { $author: { id: expect.any(String) } }] },
      `
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      [
        {
          "$author": {
            "id": Any<String>,
            "name": "Test User",
          },
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "foo": "bar",
          "id": 1,
        },
        {
          "$author": {
            "id": Any<String>,
            "name": null,
          },
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "foo": "baz",
          "id": 2,
        },
      ]
    `,
    );
  });

  it('should only fetch resources as an author or team manager', async () => {
    const app = await exampleApp(organization.id);
    const appB = await exampleApp(organization.id, 'test-app-2');

    const team = await Team.create({ name: 'Test Team', AppId: app.id });
    const teamB = await Team.create({ name: 'Test Team 2', AppId: app.id });
    // Create a team from a different app where the user is a manager,
    // These should not be included in the result.
    const teamC = await Team.create({ name: 'Test Team different app', AppId: appB.id });

    const userB = await User.create({ timezone: 'Europe/Amsterdam' });
    const userC = await User.create({ timezone: 'Europe/Amsterdam' });
    await TeamMember.create({ TeamId: team.id, UserId: user.id, role: TeamRole.Manager });
    await TeamMember.create({ TeamId: teamB.id, UserId: userB.id, role: TeamRole.Member });
    await TeamMember.create({ TeamId: team.id, UserId: userC.id, role: TeamRole.Member });
    await TeamMember.create({ TeamId: teamC.id, UserId: user.id, role: TeamRole.Manager });
    await TeamMember.create({ TeamId: teamC.id, UserId: userC.id, role: TeamRole.Member });

    await AppMember.create({ AppId: app.id, UserId: user.id, role: 'Member' });

    await Resource.create({
      AppId: app.id,
      type: 'testResourceTeamManager',
      data: { foo: 'bar' },
      AuthorId: user.id,
    });
    await Resource.create({
      AppId: app.id,
      type: 'testResourceTeamManager',
      data: { foo: 'baz' },
      AuthorId: userB.id,
    });
    await Resource.create({
      AppId: app.id,
      type: 'testResourceTeamManager',
      data: { foo: 'foo' },
      AuthorId: userC.id,
    });
    await Resource.create({
      AppId: appB.id,
      type: 'testResourceTeamManager',
      data: { foo: 'baar' },
      AuthorId: user.id,
    });
    await Resource.create({
      AppId: appB.id,
      type: 'testResourceTeamManager',
      data: { foo: 'baaar' },
      AuthorId: userC.id,
    });

    authorizeApp(app);
    const response = await request.get(`/api/apps/${app.id}/resources/testResourceTeamManager`);

    expect(response).toMatchInlineSnapshot(
      { data: [{ $author: { id: expect.any(String) } }, { $author: { id: expect.any(String) } }] },
      `
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      [
        {
          "$author": {
            "id": Any<String>,
            "name": "Test User",
          },
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "foo": "bar",
          "id": 1,
        },
        {
          "$author": {
            "id": Any<String>,
            "name": null,
          },
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "foo": "foo",
          "id": 3,
        },
      ]
    `,
    );
  });

  it('should be able to limit the amount of resources', async () => {
    const app = await exampleApp(organization.id);

    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'bar' },
    });
    await Resource.create({ AppId: app.id, type: 'testResource', data: { foo: 'baz' } });

    const response = await request.get(`/api/apps/${app.id}/resources/testResource?$top=1`);

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      [
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "foo": "bar",
          "id": 1,
        },
      ]
    `);
  });

  it('should be able to sort fetched resources', async () => {
    const app = await exampleApp(organization.id);

    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'bar' },
    });
    import.meta.jest.advanceTimersByTime(20e3);
    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'baz' },
    });

    const responseA = await request.get(
      `/api/apps/${app.id}/resources/testResource?$orderby=foo asc`,
    );
    expect(responseA).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      [
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "foo": "bar",
          "id": 1,
        },
        {
          "$created": "1970-01-01T00:00:20.000Z",
          "$updated": "1970-01-01T00:00:20.000Z",
          "foo": "baz",
          "id": 2,
        },
      ]
    `);

    const responseB = await request.get(
      `/api/apps/${app.id}/resources/testResource?$orderby=foo desc`,
    );
    expect(responseB).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      [
        {
          "$created": "1970-01-01T00:00:20.000Z",
          "$updated": "1970-01-01T00:00:20.000Z",
          "foo": "baz",
          "id": 2,
        },
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "foo": "bar",
          "id": 1,
        },
      ]
    `);

    const responseC = await request.get(
      `/api/apps/${app.id}/resources/testResource?$orderby=$created asc`,
    );
    expect(responseC).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      [
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "foo": "bar",
          "id": 1,
        },
        {
          "$created": "1970-01-01T00:00:20.000Z",
          "$updated": "1970-01-01T00:00:20.000Z",
          "foo": "baz",
          "id": 2,
        },
      ]
    `);

    const responseD = await request.get(
      `/api/apps/${app.id}/resources/testResource?$orderby=$created desc`,
    );
    expect(responseD).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      [
        {
          "$created": "1970-01-01T00:00:20.000Z",
          "$updated": "1970-01-01T00:00:20.000Z",
          "foo": "baz",
          "id": 2,
        },
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "foo": "bar",
          "id": 1,
        },
      ]
    `);
  });

  it('should be able to filter fields when fetching resources', async () => {
    const app = await exampleApp(organization.id);
    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'foo' },
    });
    await Resource.create({ AppId: app.id, type: 'testResource', data: { foo: 'bar' } });

    const response = await request.get(
      `/api/apps/${app.id}/resources/testResource?$filter=foo eq 'foo'`,
    );

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      [
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "foo": "foo",
          "id": 1,
        },
      ]
    `);
  });

  it('should be able to filter multiple fields when fetching resources', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'foo', bar: 1 },
    });
    await Resource.create({ AppId: app.id, type: 'testResource', data: { foo: 'bar', bar: 2 } });

    const response = await request.get(`/api/apps/${app.id}/resources/testResource`, {
      params: { $filter: `contains(foo, 'oo') and id le ${resource.id}` },
    });

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      [
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "bar": 1,
          "foo": "foo",
          "id": 1,
        },
      ]
    `);
  });

  it('should be able to filter by author', async () => {
    const app = await exampleApp(organization.id);
    const userB = await User.create({ timezone: 'Europe/Amsterdam' });
    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'foo', bar: 1 },
      AuthorId: user.id,
    });
    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'bar', bar: 2 },
      AuthorId: userB.id,
    });

    const response = await request.get(`/api/apps/${app.id}/resources/testResource`, {
      params: { $filter: `$author/id eq ${userB.id}` },
    });

    expect(response).toMatchInlineSnapshot(
      { data: [{ $author: { id: expect.any(String) } }] },
      `
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      [
        {
          "$author": {
            "id": Any<String>,
            "name": null,
          },
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "bar": 2,
          "foo": "bar",
          "id": 2,
        },
      ]
    `,
    );
  });

  it('should be able to combine multiple functions when fetching resources', async () => {
    const app = await exampleApp(organization.id);
    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'foo', bar: 1 },
    });
    import.meta.jest.advanceTimersByTime(20e3);
    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'bar', bar: 2 },
    });

    const response = await request.get(`/api/apps/${app.id}/resources/testResource`, {
      params: { $filter: "contains(foo, 'oo') or foo eq 'bar'", $orderby: '$updated desc' },
    });

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      [
        {
          "$created": "1970-01-01T00:00:20.000Z",
          "$updated": "1970-01-01T00:00:20.000Z",
          "bar": 2,
          "foo": "bar",
          "id": 2,
        },
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "bar": 1,
          "foo": "foo",
          "id": 1,
        },
      ]
    `);
  });

  it('should return the resource authors if it has them', async () => {
    const app = await exampleApp(organization.id);
    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'foo', bar: 1 },
      AuthorId: user.id,
      EditorId: user.id,
    });

    const response = await request.get(`/api/apps/${app.id}/resources/testResource`);

    expect(response).toMatchInlineSnapshot(
      { data: [{ $author: { id: expect.any(String) }, $editor: { id: expect.any(String) } }] },
      `
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      [
        {
          "$author": {
            "id": Any<String>,
            "name": "Test User",
          },
          "$created": "1970-01-01T00:00:00.000Z",
          "$editor": {
            "id": Any<String>,
            "name": "Test User",
          },
          "$updated": "1970-01-01T00:00:00.000Z",
          "bar": 1,
          "foo": "foo",
          "id": 1,
        },
      ]
    `,
    );
  });

  it('should not fetch expired resources', async () => {
    const app = await exampleApp(organization.id);
    await request.post<ResourceType>(`/api/apps/${app.id}/resources/testExpirableResource`, {
      foo: 'test',
      $expires: '1970-01-01T00:05:00.000Z',
    });
    await request.post<ResourceType>(`/api/apps/${app.id}/resources/testExpirableResource`, {
      foo: 'bar',
    });

    const responseA = await request.get(`/api/apps/${app.id}/resources/testExpirableResource`);

    // The resource A expires after 5 minutes.
    import.meta.jest.advanceTimersByTime(301e3);

    const responseB = await request.get(`/api/apps/${app.id}/resources/testExpirableResource`);

    expect(responseA).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      [
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$expires": "1970-01-01T00:05:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "foo": "test",
          "id": 1,
        },
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$expires": "1970-01-01T00:10:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "foo": "bar",
          "id": 2,
        },
      ]
    `);
    expect(responseB).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      [
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$expires": "1970-01-01T00:10:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "foo": "bar",
          "id": 2,
        },
      ]
    `);
  });

  it('should allow organization app editors to query resources using Studio', async () => {
    const app = await exampleApp(organization.id);
    await Resource.create({
      AppId: app.id,
      type: 'testResourceAuthorOnly',
      data: { foo: 'bar' },
    });
    authorizeStudio();
    const response = await request.get(`/api/apps/${app.id}/resources/testResourceAuthorOnly`);

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      [
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "foo": "bar",
          "id": 1,
        },
      ]
    `);
  });

  it('should not allow organization members to query resources using Studio', async () => {
    await member.update({
      role: 'Member',
    });
    const app = await exampleApp(organization.id);
    await Resource.create({
      AppId: app.id,
      type: 'testResourceAuthorOnly',
      data: { foo: 'bar' },
    });
    authorizeStudio();
    const response = await request.get(`/api/apps/${app.id}/resources/testResourceAuthorOnly`);
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 403 Forbidden
      Content-Type: application/json; charset=utf-8

      {
        "error": "Forbidden",
        "message": "User does not have sufficient permissions.",
        "statusCode": 403,
      }
    `);
  });

  it('should allow organization app editors to query resources using client credentials', async () => {
    const app = await exampleApp(organization.id);
    await Resource.create({
      AppId: app.id,
      type: 'testResourceAuthorOnly',
      data: { foo: 'bar' },
    });
    await authorizeClientCredentials('resources:read');
    const response = await request.get(`/api/apps/${app.id}/resources/testResourceAuthorOnly`);
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      [
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "foo": "bar",
          "id": 1,
        },
      ]
    `);
  });

  it('should not allow organization members to query resources using client credentials', async () => {
    await member.update({
      role: 'Member',
    });
    const app = await exampleApp(organization.id);
    await Resource.create({
      AppId: app.id,
      type: 'testResourceAuthorOnly',
      data: { foo: 'bar' },
    });
    await authorizeClientCredentials('resources:read');
    const response = await request.get(`/api/apps/${app.id}/resources/testResourceAuthorOnly`);
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 403 Forbidden
      Content-Type: application/json; charset=utf-8

      {
        "error": "Forbidden",
        "message": "User does not have sufficient permissions.",
        "statusCode": 403,
      }
    `);
  });

  it('should make actions private by default', async () => {
    const app = await exampleApp(organization.id);
    await Resource.create({
      AppId: app.id,
      type: 'testPrivateResource',
      data: { foo: 'bar' },
    });
    const response = await request.get(`/api/apps/${app.id}/resources/testPrivateResource`);
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 403 Forbidden
      Content-Type: application/json; charset=utf-8

      {
        "error": "Forbidden",
        "message": "This action is private.",
        "statusCode": 403,
      }
    `);
  });

  it('should be able to fetch a resource view', async () => {
    const app = await exampleApp(organization.id);
    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'bar' },
    });
    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'baz' },
    });
    await Resource.create({ AppId: app.id, type: 'testResource', data: { bar: 'baz' } });

    await AppMember.create({ AppId: app.id, UserId: user.id, role: 'Reader' });
    authorizeApp(app);
    const response = await request.get(`/api/apps/${app.id}/resources/testResource`, {
      params: { view: 'testView' },
    });

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      [
        {
          "name": "1-bar",
          "randomValue": "Some random value",
        },
        {
          "name": "2-baz",
          "randomValue": "Some random value",
        },
        {
          "name": "3-",
          "randomValue": "Some random value",
        },
      ]
    `);
  });

  it('should be able to fetch a public resource view', async () => {
    const app = await exampleApp(organization.id);
    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'bar' },
    });
    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'baz' },
    });
    await Resource.create({ AppId: app.id, type: 'testResource', data: { bar: 'baz' } });

    const response = await request.get(`/api/apps/${app.id}/resources/testResource`, {
      params: { view: 'publicView' },
    });

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      [
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "foo": "bar",
          "id": 1,
          "public": true,
        },
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "foo": "baz",
          "id": 2,
          "public": true,
        },
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "bar": "baz",
          "id": 3,
          "public": true,
        },
      ]
    `);
  });

  it('should return 404 for non-existing resource views', async () => {
    const app = await exampleApp(organization.id);

    await AppMember.create({ AppId: app.id, UserId: user.id, role: 'Reader' });
    authorizeApp(app);
    const response = await request.get(`/api/apps/${app.id}/resources/testResource`, {
      params: { view: 'missingView' },
    });

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 404 Not Found
      Content-Type: application/json; charset=utf-8

      {
        "error": "Not Found",
        "message": "View missingView does not exist for resource type testResource",
        "statusCode": 404,
      }
    `);
  });

  it('should check for authentication when using resource views', async () => {
    const app = await exampleApp(organization.id);

    const response = await request.get(`/api/apps/${app.id}/resources/testResource`, {
      params: { view: 'testView' },
    });

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 401 Unauthorized
      Content-Type: application/json; charset=utf-8

      {
        "error": "Unauthorized",
        "message": "User is not logged in.",
        "statusCode": 401,
      }
    `);
  });

  it('should check for the correct role when using resource views', async () => {
    const app = await exampleApp(organization.id);

    await AppMember.create({ AppId: app.id, UserId: user.id, role: 'Visitor' });
    authorizeApp(app);
    const response = await request.get(`/api/apps/${app.id}/resources/testResource`, {
      params: { view: 'testView' },
    });

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 403 Forbidden
      Content-Type: application/json; charset=utf-8

      {
        "error": "Forbidden",
        "message": "User does not have sufficient permissions.",
        "statusCode": 403,
      }
    `);
  });
});

describe('countResources', () => {
  it('should be able to count all resources of a type', async () => {
    const app = await exampleApp(organization.id);

    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'bar' },
    });
    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'baz' },
    });

    const responseA = await request.get(`/api/apps/${app.id}/resources/testResource/$count`);
    const responseB = await request.get(
      `/api/apps/${app.id}/resources/testExpirableResource/$count`,
    );

    expect(responseA).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      2
    `);
    expect(responseB).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      0
    `);
  });

  it('should apply filters', async () => {
    const app = await exampleApp(organization.id);

    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'bar' },
    });
    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'baz' },
    });
    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'baz' },
    });

    const response = await request.get(
      `/api/apps/${app.id}/resources/testResource/$count?$filter=foo eq 'baz'`,
    );

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      2
    `);
  });

  it('should only count resources the user has access to', async () => {
    const app = await exampleApp(organization.id);
    await AppMember.create({ AppId: app.id, UserId: user.id, role: 'Reader' });

    await Resource.create({
      AppId: app.id,
      type: 'testResourceAuthorOnly',
      data: { foo: 'bar' },
      AuthorId: user.id,
    });
    await Resource.create({
      AppId: app.id,
      type: 'testResourceAuthorOnly',
      data: { foo: 'baz' },
    });

    authorizeApp(app);
    const response = await request.get(
      `/api/apps/${app.id}/resources/testResourceAuthorOnly/$count`,
    );

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      1
    `);
  });

  it('should only count resources from team members', async () => {
    const app = await exampleApp(organization.id);
    const team = await Team.create({ name: 'Test Team', AppId: app.id });
    const userB = await User.create({ timezone: 'Europe/Amsterdam' });
    const userC = await User.create({ timezone: 'Europe/Amsterdam' });
    await TeamMember.create({ TeamId: team.id, UserId: user.id, role: TeamRole.Member });
    await TeamMember.create({ TeamId: team.id, UserId: userB.id, role: TeamRole.Member });

    await AppMember.create({ AppId: app.id, UserId: user.id, role: 'Member' });

    await Resource.create({
      AppId: app.id,
      type: 'testResourceTeam',
      data: { foo: 'bar' },
      AuthorId: user.id,
    });
    await Resource.create({
      AppId: app.id,
      type: 'testResourceTeam',
      data: { foo: 'baz' },
      AuthorId: userB.id,
    });
    await Resource.create({
      AppId: app.id,
      type: 'testResourceTeam',
      data: { foo: 'foo' },
      AuthorId: userC.id,
    });

    authorizeApp(app);
    const response = await request.get(`/api/apps/${app.id}/resources/testResourceTeam/$count`);
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      2
    `);
  });

  it('should only count resources from team members based on the member team filter as a member', async () => {
    const app = await exampleApp(organization.id);
    const team = await Team.create({ name: 'Test Team', AppId: app.id });
    const userB = await User.create({ timezone: 'Europe/Amsterdam' });
    const userC = await User.create({ timezone: 'Europe/Amsterdam' });
    await TeamMember.create({ TeamId: team.id, UserId: user.id, role: TeamRole.Member });
    await TeamMember.create({ TeamId: team.id, UserId: userB.id, role: TeamRole.Member });

    await AppMember.create({ AppId: app.id, UserId: user.id, role: 'Member' });

    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'bar' },
      AuthorId: user.id,
    });
    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'baz' },
      AuthorId: userB.id,
    });
    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'foo' },
      AuthorId: userC.id,
    });

    authorizeApp(app);
    const response = await request.get(
      `/api/apps/${app.id}/resources/testResource/$count?$team=member`,
    );
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      2
    `);
  });

  it('should only count resources from team members based on the member team filter as a manager', async () => {
    const app = await exampleApp(organization.id);
    const team = await Team.create({ name: 'Test Team', AppId: app.id });
    const userB = await User.create({ timezone: 'Europe/Amsterdam' });
    const userC = await User.create({ timezone: 'Europe/Amsterdam' });
    await TeamMember.create({ TeamId: team.id, UserId: user.id, role: TeamRole.Manager });
    await TeamMember.create({ TeamId: team.id, UserId: userB.id, role: TeamRole.Member });

    await AppMember.create({ AppId: app.id, UserId: user.id, role: 'Member' });

    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'bar' },
      AuthorId: user.id,
    });
    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'baz' },
      AuthorId: userB.id,
    });
    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'foo' },
      AuthorId: userC.id,
    });

    authorizeApp(app);
    const response = await request.get(
      `/api/apps/${app.id}/resources/testResource/$count?$team=member`,
    );
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      2
    `);
  });

  it('should not count resources from team members based on the member team filter as not a member', async () => {
    const app = await exampleApp(organization.id);
    const team = await Team.create({ name: 'Test Team', AppId: app.id });
    const userB = await User.create({ timezone: 'Europe/Amsterdam' });
    const userC = await User.create({ timezone: 'Europe/Amsterdam' });
    await TeamMember.create({ TeamId: team.id, UserId: userB.id, role: TeamRole.Member });

    await AppMember.create({ AppId: app.id, UserId: user.id, role: 'Member' });

    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'bar' },
      AuthorId: user.id,
    });
    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'baz' },
      AuthorId: userB.id,
    });
    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'foo' },
      AuthorId: userC.id,
    });

    authorizeApp(app);
    const response = await request.get(
      `/api/apps/${app.id}/resources/testResource/$count?$team=member`,
    );
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      0
    `);
  });

  it('should only count resources from team members based on the manager team filter as a member', async () => {
    const app = await exampleApp(organization.id);
    const team = await Team.create({ name: 'Test Team', AppId: app.id });
    const userB = await User.create({ timezone: 'Europe/Amsterdam' });
    const userC = await User.create({ timezone: 'Europe/Amsterdam' });
    await TeamMember.create({ TeamId: team.id, UserId: user.id, role: TeamRole.Member });
    await TeamMember.create({ TeamId: team.id, UserId: userB.id, role: TeamRole.Member });

    await AppMember.create({ AppId: app.id, UserId: user.id, role: 'Member' });

    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'bar' },
      AuthorId: user.id,
    });
    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'baz' },
      AuthorId: userB.id,
    });
    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'foo' },
      AuthorId: userC.id,
    });

    authorizeApp(app);
    const response = await request.get(
      `/api/apps/${app.id}/resources/testResource/$count?$team=manager`,
    );
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      0
    `);
  });

  it('should only count resources from team members based on the manager team filter as a manager', async () => {
    const app = await exampleApp(organization.id);
    const team = await Team.create({ name: 'Test Team', AppId: app.id });
    const userB = await User.create({ timezone: 'Europe/Amsterdam' });
    const userC = await User.create({ timezone: 'Europe/Amsterdam' });
    await TeamMember.create({ TeamId: team.id, UserId: user.id, role: TeamRole.Manager });
    await TeamMember.create({ TeamId: team.id, UserId: userB.id, role: TeamRole.Member });

    await AppMember.create({ AppId: app.id, UserId: user.id, role: 'Member' });

    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'bar' },
      AuthorId: user.id,
    });
    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'baz' },
      AuthorId: userB.id,
    });
    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'foo' },
      AuthorId: userC.id,
    });

    authorizeApp(app);
    const response = await request.get(
      `/api/apps/${app.id}/resources/testResource/$count?$team=manager`,
    );
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      2
    `);
  });

  it('should override general action roles', async () => {
    const app = await exampleApp(organization.id);
    await Resource.create({
      AppId: app.id,
      type: 'testPrivateResource',
      data: { foo: 'bar' },
    });
    const response = await request.get(`/api/apps/${app.id}/resources/testPrivateResource/$count`);
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      1
    `);
  });

  it('should not count resources from team members based on the manager team filter as not a team member', async () => {
    const app = await exampleApp(organization.id);
    const team = await Team.create({ name: 'Test Team', AppId: app.id });
    const userB = await User.create({ timezone: 'Europe/Amsterdam' });
    const userC = await User.create({ timezone: 'Europe/Amsterdam' });
    await TeamMember.create({ TeamId: team.id, UserId: userB.id, role: TeamRole.Member });

    await AppMember.create({ AppId: app.id, UserId: user.id, role: 'Member' });

    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'bar' },
      AuthorId: user.id,
    });
    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'baz' },
      AuthorId: userB.id,
    });
    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'foo' },
      AuthorId: userC.id,
    });

    authorizeApp(app);
    const response = await request.get(
      `/api/apps/${app.id}/resources/testResource/$count?$team=manager`,
    );
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      0
    `);
  });
});

describe('updateResources', () => {
  it('should be able to update existing resources', async () => {
    const app = await exampleApp(organization.id);

    const { data: resources } = await request.post<{ foo: string }[]>(
      `/api/apps/${app.id}/resources/testResource`,
      [{ foo: 'bar' }, { foo: 'baz' }],
    );
    const response = await request.put(`/api/apps/${app.id}/resources/testResource`, [
      { ...resources[0], foo: 'baa' },
      { ...resources[1], foo: 'zaa' },
    ]);

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      [
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "foo": "baa",
          "id": 1,
        },
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "foo": "zaa",
          "id": 2,
        },
      ]
    `);
  });

  it('should accept text/csv', async () => {
    const app = await exampleApp(organization.id);

    const { data: resources } = await request.post<{ id: string }[]>(
      `/api/apps/${app.id}/resources/testResource`,
      [
        { foo: 'bar', bar: '00' },
        { foo: 'baz', bar: '11' },
      ],
    );

    const response = await request.put(
      `/api/apps/${app.id}/resources/testResource`,
      stripIndent(`
        id,foo,integer,boolean,number,object,array\r
        ${resources[0].id},a,42,true,3.14,{},[]\r
        ${resources[1].id},A,1337,false,9.8,{},[]\r
      `)
        .replace(/^\s+/, '')
        .replace(/ +$/g, ''),
      { headers: { 'content-type': 'text/csv' } },
    );
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      [
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "array": [],
          "boolean": true,
          "foo": "a",
          "id": 1,
          "integer": 42,
          "number": 3.14,
          "object": {},
        },
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "array": [],
          "boolean": false,
          "foo": "A",
          "id": 2,
          "integer": 1337,
          "number": 9.8,
          "object": {},
        },
      ]
    `);
  });

  it('should accept assets as form data with multiple resources', async () => {
    const app = await exampleApp(organization.id);
    const resources = await request.post<ResourceType[]>(
      `/api/apps/${app.id}/resources/testAssets`,
      createFormData({
        resource: [{ string: 'A' }, { string: 'B', file: '0' }],
        assets: [Buffer.from('Test resource B')],
      }),
    );

    const response = await request.put<ResourceType[]>(
      `/api/apps/${app.id}/resources/testAssets`,
      createFormData({
        resource: [
          { id: resources.data[0].id, string: 'A', file: '0' },
          { id: resources.data[1].id, string: 'B updated' },
        ],
        assets: [Buffer.from('Test Resource A')],
      }),
    );

    const assets = await Asset.findAll({ raw: true });
    expect(assets).toStrictEqual([
      {
        AppId: app.id,
        ResourceId: 1,
        UserId: null,
        created: new Date('1970-01-01T00:00:00.000Z'),
        data: Buffer.from('Test Resource A'),
        filename: null,
        id: response.data[0].file,
        mime: 'application/octet-stream',
        name: null,
        updated: new Date('1970-01-01T00:00:00.000Z'),
      },
    ]);
    expect(Buffer.from('Test Resource A').equals(assets[0].data)).toBe(true);
    expect(response).toMatchInlineSnapshot(
      {
        data: [{ file: expect.stringMatching(/^[0-f]{8}(?:-[0-f]{4}){3}-[0-f]{12}$/) }, {}],
      },
      `
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      [
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "file": StringMatching /\\^\\[0-f\\]\\{8\\}\\(\\?:-\\[0-f\\]\\{4\\}\\)\\{3\\}-\\[0-f\\]\\{12\\}\\$/,
          "id": 1,
          "string": "A",
        },
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "id": 2,
          "string": "B updated",
        },
      ]
    `,
    );
  });

  it('should not be able to update existing resources if one of them is missing an ID', async () => {
    const app = await exampleApp(organization.id);

    const { data: resources } = await request.post<{ foo: string }[]>(
      `/api/apps/${app.id}/resources/testResource`,
      [{ foo: 'bar' }, { foo: 'baz' }],
    );
    const response = await request.put(`/api/apps/${app.id}/resources/testResource`, [
      { foo: 'baa' },
      { ...resources[1], foo: 'zaa' },
    ]);

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 400 Bad Request
      Content-Type: application/json; charset=utf-8

      {
        "data": [
          {
            "foo": "baa",
          },
        ],
        "error": "Bad Request",
        "message": "List of resources contained a resource without an ID.",
        "statusCode": 400,
      }
    `);
  });

  it('should not be able to update existing resources if one the resources don’t exist', async () => {
    const app = await exampleApp(organization.id);

    const { data: resources } = await request.post<{ foo: string }[]>(
      `/api/apps/${app.id}/resources/testResource`,
      [{ foo: 'bar' }, { foo: 'baz' }],
    );
    const response = await request.put(`/api/apps/${app.id}/resources/testResource`, [
      { id: 1000, foo: 'baa' },
      { ...resources[1], foo: 'zaa' },
    ]);

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 400 Bad Request
      Content-Type: application/json; charset=utf-8

      {
        "data": [
          {
            "foo": "baa",
            "id": 1000,
          },
        ],
        "error": "Bad Request",
        "message": "One or more resources could not be found.",
        "statusCode": 400,
      }
    `);
  });

  it('should keep an old resource version including data if history is true', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      AppId: app.id,
      type: 'testHistoryTrue',
      data: { string: 'rev1' },
    });
    const response = await request.put(`/api/apps/${app.id}/resources/testHistoryTrue`, [
      { string: 'rev2', id: resource.id },
    ]);
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      [
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "id": 1,
          "string": "rev2",
        },
      ]
    `);
    await resource.reload();
    expect(resource.data).toStrictEqual({
      string: 'rev2',
    });
    const [resourceVersion] = await ResourceVersion.findAll({ raw: true });
    expect(resourceVersion).toStrictEqual({
      ResourceId: resource.id,
      UserId: null,
      created: new Date(),
      data: { string: 'rev1' },
      id: expect.stringMatching(uuid4Pattern),
    });
  });

  it('should keep an old resource version including data if history.data is true', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      AppId: app.id,
      type: 'testHistoryDataTrue',
      data: { string: 'rev1' },
    });
    const response = await request.put(`/api/apps/${app.id}/resources/testHistoryDataTrue`, [
      { string: 'rev2', id: resource.id },
    ]);
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      [
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "id": 1,
          "string": "rev2",
        },
      ]
    `);
    await resource.reload();
    expect(resource.data).toStrictEqual({
      string: 'rev2',
    });
    const [resourceVersion] = await ResourceVersion.findAll({ raw: true });
    expect(resourceVersion).toStrictEqual({
      ResourceId: resource.id,
      UserId: null,
      created: new Date(),
      data: { string: 'rev1' },
      id: expect.stringMatching(uuid4Pattern),
    });
  });

  it('should keep an old resource version excluding data if history.data is false', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      AppId: app.id,
      type: 'testHistoryDataFalse',
      data: { string: 'rev1' },
    });
    const response = await request.put(`/api/apps/${app.id}/resources/testHistoryDataFalse`, [
      { string: 'rev2', id: resource.id },
    ]);
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      [
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "id": 1,
          "string": "rev2",
        },
      ]
    `);
    await resource.reload();
    expect(resource.data).toStrictEqual({
      string: 'rev2',
    });
    const [resourceVersion] = await ResourceVersion.findAll({ raw: true });
    expect(resourceVersion).toStrictEqual({
      ResourceId: resource.id,
      UserId: null,
      created: new Date(),
      data: null,
      id: expect.stringMatching(uuid4Pattern),
    });
  });
});

describe('createResource', () => {
  it('should be able to create a new resource', async () => {
    const app = await exampleApp(organization.id);

    const resource = { foo: 'bar' };
    const response = await request.post(`/api/apps/${app.id}/resources/testResource`, resource);

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 201 Created
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "foo": "bar",
        "id": 1,
      }
    `);
  });

  it('should validate resources', async () => {
    const app = await exampleApp(organization.id);

    const resource = {};
    const response = await request.post(`/api/apps/${app.id}/resources/testResource`, resource);

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 400 Bad Request
      Content-Type: application/json; charset=utf-8

      {
        "data": {
          "errors": [
            {
              "argument": "foo",
              "instance": {},
              "message": "requires property "foo"",
              "name": "required",
              "path": [],
              "property": "instance",
              "schema": {
                "properties": {
                  "$clonable": {
                    "type": "boolean",
                  },
                  "$expires": {
                    "format": "date-time",
                    "type": "string",
                  },
                  "array": {
                    "type": "array",
                  },
                  "bar": {
                    "type": "string",
                  },
                  "baz": {
                    "type": "string",
                  },
                  "boolean": {
                    "type": "boolean",
                  },
                  "foo": {
                    "type": "string",
                  },
                  "fooz": {
                    "type": "string",
                  },
                  "id": {
                    "type": "integer",
                  },
                  "integer": {
                    "type": "integer",
                  },
                  "number": {
                    "type": "number",
                  },
                  "object": {
                    "type": "object",
                  },
                },
                "required": [
                  "foo",
                ],
                "type": "object",
              },
              "stack": "instance requires property "foo"",
            },
          ],
        },
        "error": "Bad Request",
        "message": "Resource validation failed",
        "statusCode": 400,
      }
    `);
  });

  it('should check if an app has a specific resource definition', async () => {
    const app = await exampleApp(organization.id);

    const response = await request.get(`/api/apps/${app.id}/resources/thisDoesNotExist`);
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 404 Not Found
      Content-Type: application/json; charset=utf-8

      {
        "error": "Not Found",
        "message": "App does not have resources called thisDoesNotExist",
        "statusCode": 404,
      }
    `);
  });

  it('should check if an app has any resource definitions', async () => {
    const app = await App.create({
      definition: { name: 'Test App', defaultPage: 'Test Page' },
      path: 'test-app',
      vapidPublicKey: 'a',
      vapidPrivateKey: 'b',
      OrganizationId: organization.id,
    });
    const response = await request.get(`/api/apps/${app.id}/resources/thisDoesNotExist`);

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 404 Not Found
      Content-Type: application/json; charset=utf-8

      {
        "error": "Not Found",
        "message": "App does not have resources called thisDoesNotExist",
        "statusCode": 404,
      }
    `);
  });

  it('should calculate resource expiration', async () => {
    const app = await exampleApp(organization.id);
    const response = await request.post(`/api/apps/${app.id}/resources/testExpirableResource`, {
      foo: 'test',
    });

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 201 Created
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$expires": "1970-01-01T00:10:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "foo": "test",
        "id": 1,
      }
    `);
  });

  it('should set resource expiration', async () => {
    const app = await exampleApp(organization.id);
    const response = await request.post(`/api/apps/${app.id}/resources/testExpirableResource`, {
      foo: 'test',
      $expires: '1970-01-01T00:05:00.000Z',
    });

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 201 Created
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$expires": "1970-01-01T00:05:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "foo": "test",
        "id": 1,
      }
    `);
  });

  it('should not set resource expiration if given date has already passed', async () => {
    // 10 minutes
    import.meta.jest.advanceTimersByTime(600e3);

    const app = await exampleApp(organization.id);
    const response = await request.post(`/api/apps/${app.id}/resources/testExpirableResource`, {
      foo: 'test',
      $expires: '1970-01-01T00:05:00.000Z',
    });

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 400 Bad Request
      Content-Type: application/json; charset=utf-8

      {
        "data": {
          "errors": [
            {
              "instance": "1970-01-01T00:05:00.000Z",
              "message": "has already passed",
              "path": [
                "$expires",
              ],
              "property": "instance.$expires",
              "stack": "instance.$expires has already passed",
            },
          ],
        },
        "error": "Bad Request",
        "message": "Resource validation failed",
        "statusCode": 400,
      }
    `);
  });

  it('should accept assets as form data', async () => {
    const app = await exampleApp(organization.id);
    const response = await request.post<ResourceType>(
      `/api/apps/${app.id}/resources/testAssets`,
      createFormData({
        resource: { file: '0' },
        assets: Buffer.from('Test resource a'),
      }),
    );

    expect(response).toMatchInlineSnapshot(
      { data: { file: expect.stringMatching(/^[0-f]{8}(?:-[0-f]{4}){3}-[0-f]{12}$/) } },
      `
      HTTP/1.1 201 Created
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "file": StringMatching /\\^\\[0-f\\]\\{8\\}\\(\\?:-\\[0-f\\]\\{4\\}\\)\\{3\\}-\\[0-f\\]\\{12\\}\\$/,
        "id": 1,
      }
    `,
    );
    const assets = await Asset.findAll({ where: { ResourceId: response.data.id }, raw: true });
    expect(assets).toStrictEqual([
      {
        AppId: app.id,
        ResourceId: 1,
        UserId: null,
        created: new Date('1970-01-01T00:00:00.000Z'),
        data: expect.any(Buffer),
        filename: null,
        id: response.data.file,
        mime: 'application/octet-stream',
        name: null,
        updated: new Date('1970-01-01T00:00:00.000Z'),
      },
    ]);
    expect(Buffer.from('Test resource a').equals(assets[0].data)).toBe(true);
  });

  it('should disallow unused files', async () => {
    const app = await exampleApp(organization.id);
    const response = await request.post(
      `/api/apps/${app.id}/resources/testAssets`,
      createFormData({
        resource: { string: '0' },
        assets: Buffer.from('Test resource a'),
      }),
    );

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 400 Bad Request
      Content-Type: application/json; charset=utf-8

      {
        "data": {
          "errors": [
            {
              "argument": "format",
              "instance": 0,
              "message": "is not referenced from the resource",
              "name": "binary",
              "path": [
                "assets",
                0,
              ],
              "property": "instance.assets[0]",
              "stack": "instance.assets[0] is not referenced from the resource",
            },
          ],
        },
        "error": "Bad Request",
        "message": "Resource validation failed",
        "statusCode": 400,
      }
    `);
  });

  it('should disallow duplicate file references', async () => {
    const app = await exampleApp(organization.id);
    const response = await request.post(
      `/api/apps/${app.id}/resources/testAssets`,
      createFormData({
        resource: { file: '0', file2: '0' },
        assets: Buffer.from('Test resource a'),
      }),
    );

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 400 Bad Request
      Content-Type: application/json; charset=utf-8

      {
        "data": {
          "errors": [
            {
              "argument": "binary",
              "instance": "0",
              "message": "does not conform to the "binary" format",
              "name": "format",
              "path": [
                "file2",
              ],
              "property": "instance.file2",
              "schema": {
                "format": "binary",
                "type": "string",
              },
              "stack": "instance.file2 does not conform to the "binary" format",
            },
          ],
        },
        "error": "Bad Request",
        "message": "Resource validation failed",
        "statusCode": 400,
      }
    `);
  });

  it('should accept an array of resources', async () => {
    const app = await exampleApp(organization.id);
    const response = await request.post<ResourceType>(
      `/api/apps/${app.id}/resources/testResource`,
      [{ foo: 'bar' }, { foo: 'baz' }],
    );

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 201 Created
      Content-Type: application/json; charset=utf-8

      [
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "foo": "bar",
          "id": 1,
        },
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "foo": "baz",
          "id": 2,
        },
      ]
    `);
  });

  it('should accept assets as form data with multiple resources', async () => {
    const app = await exampleApp(organization.id);
    const response = await request.post<ResourceType[]>(
      `/api/apps/${app.id}/resources/testAssets`,
      createFormData({
        resource: [{ file: '0' }, { file: '1' }],
        assets: [Buffer.from('Test resource a'), Buffer.from('Test resource b')],
      }),
    );

    expect(response).toMatchInlineSnapshot(
      {
        data: [
          { file: expect.stringMatching(/^[0-f]{8}(?:-[0-f]{4}){3}-[0-f]{12}$/) },
          { file: expect.stringMatching(/^[0-f]{8}(?:-[0-f]{4}){3}-[0-f]{12}$/) },
        ],
      },
      `
      HTTP/1.1 201 Created
      Content-Type: application/json; charset=utf-8

      [
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "file": StringMatching /\\^\\[0-f\\]\\{8\\}\\(\\?:-\\[0-f\\]\\{4\\}\\)\\{3\\}-\\[0-f\\]\\{12\\}\\$/,
          "id": 1,
        },
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "file": StringMatching /\\^\\[0-f\\]\\{8\\}\\(\\?:-\\[0-f\\]\\{4\\}\\)\\{3\\}-\\[0-f\\]\\{12\\}\\$/,
          "id": 2,
        },
      ]
    `,
    );
    const assets = await Asset.findAll({ raw: true });
    expect(assets).toStrictEqual([
      {
        AppId: app.id,
        ResourceId: 1,
        UserId: null,
        created: new Date('1970-01-01T00:00:00.000Z'),
        data: Buffer.from('Test resource a'),
        filename: null,
        id: response.data[0].file,
        mime: 'application/octet-stream',
        name: null,
        updated: new Date('1970-01-01T00:00:00.000Z'),
      },
      {
        AppId: app.id,
        ResourceId: 2,
        UserId: null,
        created: new Date('1970-01-01T00:00:00.000Z'),
        data: Buffer.from('Test resource b'),
        filename: null,
        id: response.data[1].file,
        mime: 'application/octet-stream',
        name: null,
        updated: new Date('1970-01-01T00:00:00.000Z'),
      },
    ]);
    expect(Buffer.from('Test resource a').equals(assets[0].data)).toBe(true);
  });

  it('should block unknown asset references', async () => {
    const app = await exampleApp(organization.id);
    const response = await request.post(
      `/api/apps/${app.id}/resources/testAssets`,
      createFormData({
        resource: { file: '1' },
      }),
    );

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 400 Bad Request
      Content-Type: application/json; charset=utf-8

      {
        "data": {
          "errors": [
            {
              "argument": "binary",
              "instance": "1",
              "message": "does not conform to the "binary" format",
              "name": "format",
              "path": [
                "file",
              ],
              "property": "instance.file",
              "schema": {
                "format": "binary",
                "type": "string",
              },
              "stack": "instance.file does not conform to the "binary" format",
            },
          ],
        },
        "error": "Bad Request",
        "message": "Resource validation failed",
        "statusCode": 400,
      }
    `);
  });

  it('should allow organization app editors to create resources using Studio', async () => {
    const app = await exampleApp(organization.id);
    authorizeStudio();
    const response = await request.post(`/api/apps/${app.id}/resources/testResourceAuthorOnly`, {
      foo: 'bar',
    });
    expect(response).toMatchInlineSnapshot(
      { data: { $author: { id: expect.any(String) } } },
      `
      HTTP/1.1 201 Created
      Content-Type: application/json; charset=utf-8

      {
        "$author": {
          "id": Any<String>,
          "name": "Test User",
        },
        "$created": "1970-01-01T00:00:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "foo": "bar",
        "id": 1,
      }
    `,
    );
  });

  it('should not allow organization members to create resources using Studio', async () => {
    await member.update({
      role: 'Member',
    });
    const app = await exampleApp(organization.id);
    authorizeStudio();
    const response = await request.post(`/api/apps/${app.id}/resources/testResourceAuthorOnly`, {
      foo: 'bar',
    });
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 403 Forbidden
      Content-Type: application/json; charset=utf-8

      {
        "error": "Forbidden",
        "message": "User does not have sufficient permissions.",
        "statusCode": 403,
      }
    `);
  });

  it('should allow organization app editors to create resources using client credentials', async () => {
    const app = await exampleApp(organization.id);
    await authorizeClientCredentials('resources:write');
    const response = await request.post(`/api/apps/${app.id}/resources/testResourceAuthorOnly`, {
      foo: 'bar',
    });
    expect(response).toMatchInlineSnapshot(
      { data: { $author: { id: expect.any(String) } } },
      `
      HTTP/1.1 201 Created
      Content-Type: application/json; charset=utf-8

      {
        "$author": {
          "id": Any<String>,
          "name": "Test User",
        },
        "$created": "1970-01-01T00:00:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "foo": "bar",
        "id": 1,
      }
    `,
    );
  });

  it('should not allow organization members to create resources using client credentials', async () => {
    await member.update({
      role: 'Member',
    });
    const app = await exampleApp(organization.id);
    await authorizeClientCredentials('resources:write');
    const response = await request.post(`/api/apps/${app.id}/resources/testResourceAuthorOnly`, {
      foo: 'bar',
    });
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 403 Forbidden
      Content-Type: application/json; charset=utf-8

      {
        "error": "Forbidden",
        "message": "User does not have sufficient permissions.",
        "statusCode": 403,
      }
    `);
  });

  it('should accept text/csv', async () => {
    const app = await exampleApp(organization.id);

    const response = await request.post(
      `/api/apps/${app.id}/resources/testResource`,
      stripIndent(`
        foo,bar,integer,boolean,number,object,array\r
        a,b,42,true,3.14,{},[]\r
        A,B,1337,false,9.8,{},[]\r
      `)
        .replace(/^\s+/, '')
        .replace(/ +$/g, ''),
      { headers: { 'content-type': 'text/csv' } },
    );
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 201 Created
      Content-Type: application/json; charset=utf-8

      [
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "array": [],
          "bar": "b",
          "boolean": true,
          "foo": "a",
          "id": 1,
          "integer": 42,
          "number": 3.14,
          "object": {},
        },
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "array": [],
          "bar": "B",
          "boolean": false,
          "foo": "A",
          "id": 2,
          "integer": 1337,
          "number": 9.8,
          "object": {},
        },
      ]
    `);
  });
});

describe('updateResource', () => {
  it('should be able to update an existing resource', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      type: 'testResource',
      AppId: app.id,
      data: { foo: 'I am Foo.' },
    });

    import.meta.jest.advanceTimersByTime(20e3);

    authorizeStudio();
    const response = await request.put(
      `/api/apps/${app.id}/resources/testResource/${resource.id}`,
      { foo: 'I am not Foo.' },
    );

    expect(response).toMatchInlineSnapshot(
      { data: { $editor: { id: expect.any(String) } } },
      `
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$editor": {
          "id": Any<String>,
          "name": "Test User",
        },
        "$updated": "1970-01-01T00:00:20.000Z",
        "foo": "I am not Foo.",
        "id": 1,
      }
    `,
    );

    const responseB = await request.get(
      `/api/apps/${app.id}/resources/testResource/${resource.id}`,
    );

    expect(responseB).toMatchInlineSnapshot(
      { data: { $editor: { id: expect.any(String) } } },
      `
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$editor": {
          "id": Any<String>,
          "name": "Test User",
        },
        "$updated": "1970-01-01T00:00:20.000Z",
        "foo": "I am not Foo.",
        "id": 1,
      }
    `,
    );
  });

  it('should be able to update an existing resource from another team', async () => {
    const app = await exampleApp(organization.id);
    const team = await Team.create({ name: 'Test Team', AppId: app.id });
    const userB = await User.create({ timezone: 'Europe/Amsterdam' });
    await TeamMember.create({ TeamId: team.id, UserId: user.id, role: TeamRole.Member });
    await TeamMember.create({ TeamId: team.id, UserId: userB.id, role: TeamRole.Member });
    await AppMember.create({ AppId: app.id, UserId: user.id, role: 'Member' });

    const resource = await Resource.create({
      type: 'testResourceTeam',
      AppId: app.id,
      data: { foo: 'I am Foo.' },
      AuthorId: userB.id,
    });

    authorizeStudio();
    const response = await request.put(
      `/api/apps/${app.id}/resources/testResourceTeam/${resource.id}`,
      { foo: 'I am not Foo.' },
    );

    expect(response).toMatchInlineSnapshot(
      {
        data: {
          $author: { id: expect.any(String) },
          $editor: { id: expect.any(String) },
        },
      },
      `
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$author": {
          "id": Any<String>,
          "name": null,
        },
        "$created": "1970-01-01T00:00:00.000Z",
        "$editor": {
          "id": Any<String>,
          "name": "Test User",
        },
        "$updated": "1970-01-01T00:00:00.000Z",
        "foo": "I am not Foo.",
        "id": 1,
      }
    `,
    );
  });

  it('should not be able to update an existing resource from another team if not part of the team', async () => {
    const app = await exampleApp(organization.id);
    const team = await Team.create({ name: 'Test Team', AppId: app.id });
    const userB = await User.create({ timezone: 'Europe/Amsterdam' });
    await TeamMember.create({ TeamId: team.id, UserId: userB.id, role: TeamRole.Member });
    await AppMember.create({ AppId: app.id, UserId: user.id, role: 'Member' });

    const resource = await Resource.create({
      type: 'testResourceTeam',
      AppId: app.id,
      data: { foo: 'I am Foo.' },
      AuthorId: userB.id,
    });

    authorizeApp(app);
    const response = await request.put(
      `/api/apps/${app.id}/resources/testResourceTeam/${resource.id}`,
      { foo: 'I am not Foo.' },
    );

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 404 Not Found
      Content-Type: application/json; charset=utf-8

      {
        "error": "Not Found",
        "message": "Resource not found",
        "statusCode": 404,
      }
    `);
  });

  it('should not be possible to update an existing resource through another resource', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      type: 'testResource',
      AppId: app.id,
      data: { foo: 'I am Foo.' },
    });

    authorizeStudio();
    const response = await request.put(
      `/api/apps/${app.id}/resources/testResourceB/${resource.id}`,
      { foo: 'I am not Foo.' },
    );

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 404 Not Found
      Content-Type: application/json; charset=utf-8

      {
        "error": "Not Found",
        "message": "Resource not found",
        "statusCode": 404,
      }
    `);
  });

  it('should not be possible to update an existing resource through another app', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      type: 'testResource',
      AppId: app.id,
      data: { foo: 'I am Foo.' },
    });

    const appB = await exampleApp(organization.id, 'app-b');

    authorizeStudio();
    const response = await request.put(
      `/api/apps/${appB.id}/resources/testResource/${resource.id}`,
      { foo: 'I am not Foo.' },
    );

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 404 Not Found
      Content-Type: application/json; charset=utf-8

      {
        "error": "Not Found",
        "message": "Resource not found",
        "statusCode": 404,
      }
    `);
  });

  it('should not be possible to update a non-existent resource', async () => {
    const app = await exampleApp(organization.id);
    authorizeStudio();
    const response = await request.put(`/api/apps/${app.id}/resources/testResource/0`, {
      foo: 'I am not Foo.',
    });

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 404 Not Found
      Content-Type: application/json; charset=utf-8

      {
        "error": "Not Found",
        "message": "Resource not found",
        "statusCode": 404,
      }
    `);
  });

  it('should validate resources', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      type: 'testResource',
      AppId: app.id,
      data: { foo: 'I am Foo.' },
    });

    authorizeStudio();
    const response = await request.put(
      `/api/apps/${app.id}/resources/testResource/${resource.id}`,
      { bar: 123 },
    );

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 400 Bad Request
      Content-Type: application/json; charset=utf-8

      {
        "data": {
          "errors": [
            {
              "argument": "foo",
              "instance": {
                "bar": 123,
              },
              "message": "requires property "foo"",
              "name": "required",
              "path": [],
              "property": "instance",
              "schema": {
                "properties": {
                  "$clonable": {
                    "type": "boolean",
                  },
                  "$expires": {
                    "format": "date-time",
                    "type": "string",
                  },
                  "array": {
                    "type": "array",
                  },
                  "bar": {
                    "type": "string",
                  },
                  "baz": {
                    "type": "string",
                  },
                  "boolean": {
                    "type": "boolean",
                  },
                  "foo": {
                    "type": "string",
                  },
                  "fooz": {
                    "type": "string",
                  },
                  "id": {
                    "type": "integer",
                  },
                  "integer": {
                    "type": "integer",
                  },
                  "number": {
                    "type": "number",
                  },
                  "object": {
                    "type": "object",
                  },
                },
                "required": [
                  "foo",
                ],
                "type": "object",
              },
              "stack": "instance requires property "foo"",
            },
            {
              "argument": [
                "string",
              ],
              "instance": 123,
              "message": "is not of a type(s) string",
              "name": "type",
              "path": [
                "bar",
              ],
              "property": "instance.bar",
              "schema": {
                "type": "string",
              },
              "stack": "instance.bar is not of a type(s) string",
            },
          ],
        },
        "error": "Bad Request",
        "message": "Resource validation failed",
        "statusCode": 400,
      }
    `);
  });

  it('should set clonable if specified in the request', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      type: 'testResource',
      AppId: app.id,
      data: { foo: 'I am Foo.' },
    });

    authorizeStudio();
    const response = await request.put(
      `/api/apps/${app.id}/resources/testResource/${resource.id}`,
      { foo: 'I am not Foo.', $clonable: true },
    );

    await resource.reload();

    expect(response).toMatchInlineSnapshot(
      { data: { $editor: { id: expect.any(String) } } },
      `
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$editor": {
          "id": Any<String>,
          "name": "Test User",
        },
        "$updated": "1970-01-01T00:00:00.000Z",
        "foo": "I am not Foo.",
        "id": 1,
      }
    `,
    );
    expect(resource.clonable).toBe(true);
  });

  it('should set $expires', async () => {
    const app = await exampleApp(organization.id);
    const {
      data: { id },
    } = await request.post<ResourceType>(`/api/apps/${app.id}/resources/testExpirableResource`, {
      foo: 'test',
      $expires: '1970-01-01T00:05:00.000Z',
    });

    const responseA = await request.put(
      `/api/apps/${app.id}/resources/testExpirableResource/${id}`,
      {
        foo: 'updated',
        $expires: '1970-01-01T00:07:00.000Z',
      },
    );
    const responseB = await request.get(
      `/api/apps/${app.id}/resources/testExpirableResource/${id}`,
    );

    expect(responseA).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$expires": "1970-01-01T00:07:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "foo": "updated",
        "id": 1,
      }
    `);

    expect(responseB).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$expires": "1970-01-01T00:07:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "foo": "updated",
        "id": 1,
      }
    `);
  });

  it('should not set $expires if the date has already passed', async () => {
    // 10 minutes
    import.meta.jest.advanceTimersByTime(600e3);

    const app = await exampleApp(organization.id);
    const {
      data: { id },
    } = await request.post<ResourceType>(`/api/apps/${app.id}/resources/testExpirableResource`, {
      foo: 'test',
    });

    const response = await request.put(
      `/api/apps/${app.id}/resources/testExpirableResource/${id}`,
      {
        foo: 'updated',
        $expires: '1970-01-01T00:07:00.000Z',
      },
    );
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 400 Bad Request
      Content-Type: application/json; charset=utf-8

      {
        "data": {
          "errors": [
            {
              "instance": "1970-01-01T00:07:00.000Z",
              "message": "has already passed",
              "path": [
                "$expires",
              ],
              "property": "instance.$expires",
              "stack": "instance.$expires has already passed",
            },
          ],
        },
        "error": "Bad Request",
        "message": "Resource validation failed",
        "statusCode": 400,
      }
    `);
  });

  it('should accept assets as form data', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({ AppId: app.id, type: 'testAssets', data: {} });
    const response = await request.put<ResourceType>(
      `/api/apps/${app.id}/resources/testAssets/${resource.id}`,
      createFormData({
        resource: { file: '0' },
        assets: Buffer.from('Test resource a'),
      }),
    );

    expect(response).toMatchInlineSnapshot(
      { data: { file: expect.stringMatching(/^[0-f]{8}(?:-[0-f]{4}){3}-[0-f]{12}$/) } },
      `
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "file": StringMatching /\\^\\[0-f\\]\\{8\\}\\(\\?:-\\[0-f\\]\\{4\\}\\)\\{3\\}-\\[0-f\\]\\{12\\}\\$/,
        "id": 1,
      }
    `,
    );
    const assets = await Asset.findAll({ where: { ResourceId: response.data.id }, raw: true });
    expect(assets).toStrictEqual([
      {
        AppId: app.id,
        ResourceId: 1,
        UserId: null,
        created: new Date('1970-01-01T00:00:00.000Z'),
        data: expect.any(Buffer),
        filename: null,
        id: response.data.file,
        mime: 'application/octet-stream',
        name: null,
        updated: new Date('1970-01-01T00:00:00.000Z'),
      },
    ]);
    expect(Buffer.from('Test resource a').equals(assets[0].data)).toBe(true);
  });

  it('should disallow unused assets', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({ AppId: app.id, type: 'testAssets', data: {} });
    const response = await request.put(
      `/api/apps/${app.id}/resources/testAssets/${resource.id}`,
      createFormData({
        resource: { string: '0' },
        assets: Buffer.from('Test resource a'),
      }),
    );

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 400 Bad Request
      Content-Type: application/json; charset=utf-8

      {
        "data": {
          "errors": [
            {
              "argument": "format",
              "instance": 0,
              "message": "is not referenced from the resource",
              "name": "binary",
              "path": [
                "assets",
                0,
              ],
              "property": "instance.assets[0]",
              "stack": "instance.assets[0] is not referenced from the resource",
            },
          ],
        },
        "error": "Bad Request",
        "message": "Resource validation failed",
        "statusCode": 400,
      }
    `);
  });

  it('should block unknown asset references', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({ AppId: app.id, type: 'testAssets', data: {} });
    const response = await request.put(
      `/api/apps/${app.id}/resources/testAssets/${resource.id}`,
      createFormData({
        resource: { file: '1' },
      }),
    );

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 400 Bad Request
      Content-Type: application/json; charset=utf-8

      {
        "data": {
          "errors": [
            {
              "argument": "binary",
              "instance": "1",
              "message": "does not conform to the "binary" format",
              "name": "format",
              "path": [
                "file",
              ],
              "property": "instance.file",
              "schema": {
                "format": "binary",
                "type": "string",
              },
              "stack": "instance.file does not conform to the "binary" format",
            },
          ],
        },
        "error": "Bad Request",
        "message": "Resource validation failed",
        "statusCode": 400,
      }
    `);
  });

  it('should allow referencing existing assets', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({ AppId: app.id, type: 'testAssets', data: {} });
    const asset = await Asset.create({
      ResourceId: resource.id,
      AppId: app.id,
      data: Buffer.alloc(0),
    });
    const response = await request.put<ResourceType>(
      `/api/apps/${app.id}/resources/testAssets/${resource.id}`,
      createFormData({ resource: { file: asset.id } }),
    );

    expect(response).toMatchInlineSnapshot(
      { data: { file: expect.any(String) } },
      `
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "file": Any<String>,
        "id": 1,
      }
    `,
    );
    expect(response.data.file).toBe(asset.id);
  });

  it('should delete dereferenced assets', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      AppId: app.id,
      type: 'testAssets',
      data: { file: 'test-asset' },
    });
    const asset = await Asset.create({
      id: 'test-asset',
      ResourceId: resource.id,
      AppId: app.id,
      data: Buffer.alloc(0),
    });
    const response = await request.put(
      `/api/apps/${app.id}/resources/testAssets/${resource.id}`,
      createFormData({ resource: { file: '0' }, assets: Buffer.alloc(0) }),
    );

    expect(response).toMatchInlineSnapshot(
      { data: { file: expect.stringMatching(/^[0-f]{8}(?:-[0-f]{4}){3}-[0-f]{12}$/) } },
      `
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "file": StringMatching /\\^\\[0-f\\]\\{8\\}\\(\\?:-\\[0-f\\]\\{4\\}\\)\\{3\\}-\\[0-f\\]\\{12\\}\\$/,
        "id": 1,
      }
    `,
    );
    await expect(() => asset.reload()).rejects.toThrow(
      'Instance could not be reloaded because it does not exist anymore (find call returned null)',
    );
  });

  it('should allow organization app editors to update resources using Studio', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      AppId: app.id,
      type: 'testResourceAuthorOnly',
      data: { foo: 'bar' },
    });
    authorizeStudio();
    const response = await request.put(
      `/api/apps/${app.id}/resources/testResourceAuthorOnly/${resource.id}`,
      { foo: 'baz' },
    );
    expect(response).toMatchInlineSnapshot(
      { data: { $editor: { id: expect.any(String) } } },
      `
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$editor": {
          "id": Any<String>,
          "name": "Test User",
        },
        "$updated": "1970-01-01T00:00:00.000Z",
        "foo": "baz",
        "id": 1,
      }
    `,
    );
  });

  it('should not allow organization members to update resources using Studio', async () => {
    await member.update({
      role: 'Member',
    });
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      AppId: app.id,
      type: 'testResourceAuthorOnly',
      data: { foo: 'bar' },
    });
    authorizeStudio();
    const response = await request.put(
      `/api/apps/${app.id}/resources/testResourceAuthorOnly/${resource.id}`,
      { foo: 'baz' },
    );
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 403 Forbidden
      Content-Type: application/json; charset=utf-8

      {
        "error": "Forbidden",
        "message": "User does not have sufficient permissions.",
        "statusCode": 403,
      }
    `);
  });

  it('should allow organization app editors to update resources using client credentials', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      AppId: app.id,
      type: 'testResourceAuthorOnly',
      data: { foo: 'bar' },
    });
    await authorizeClientCredentials('resources:write');
    const response = await request.put(
      `/api/apps/${app.id}/resources/testResourceAuthorOnly/${resource.id}`,
      { foo: 'baz' },
    );
    expect(response).toMatchInlineSnapshot(
      { data: { $editor: { id: expect.any(String) } } },
      `
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$editor": {
          "id": Any<String>,
          "name": "Test User",
        },
        "$updated": "1970-01-01T00:00:00.000Z",
        "foo": "baz",
        "id": 1,
      }
    `,
    );
  });

  it('should not allow organization members to update resources using client credentials', async () => {
    await member.update({
      role: 'Member',
    });
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      AppId: app.id,
      type: 'testResourceAuthorOnly',
      data: { foo: 'bar' },
    });
    await authorizeClientCredentials('resources:write');
    const response = await request.put(
      `/api/apps/${app.id}/resources/testResourceAuthorOnly/${resource.id}`,
      { foo: 'baz' },
    );
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 403 Forbidden
      Content-Type: application/json; charset=utf-8

      {
        "error": "Forbidden",
        "message": "User does not have sufficient permissions.",
        "statusCode": 403,
      }
    `);
  });

  it('should set the updater', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      type: 'testResource',
      AppId: app.id,
      data: { foo: 'I am Foo.' },
    });

    authorizeStudio();
    const response = await request.put(
      `/api/apps/${app.id}/resources/testResource/${resource.id}`,
      { foo: 'I am Foo too!' },
    );
    expect(response).toMatchInlineSnapshot(
      { data: { $editor: { id: expect.any(String) } } },
      `
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$editor": {
          "id": Any<String>,
          "name": "Test User",
        },
        "$updated": "1970-01-01T00:00:00.000Z",
        "foo": "I am Foo too!",
        "id": 1,
      }
    `,
    );

    await resource.reload();
    expect(resource.EditorId).toBe(user.id);
  });

  it('should keep an old resource version including data if history is true', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      AppId: app.id,
      type: 'testHistoryTrue',
      data: { string: 'rev1' },
    });
    const response = await request.put(
      `/api/apps/${app.id}/resources/testHistoryTrue/${resource.id}`,
      { string: 'rev2' },
    );
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "id": 1,
        "string": "rev2",
      }
    `);
    await resource.reload();
    expect(resource.data).toStrictEqual({
      string: 'rev2',
    });
    const [resourceVersion] = await ResourceVersion.findAll({ raw: true });
    expect(resourceVersion).toStrictEqual({
      ResourceId: resource.id,
      UserId: null,
      created: new Date(),
      data: { string: 'rev1' },
      id: expect.stringMatching(uuid4Pattern),
    });
  });

  it('should keep an old resource version including data if history.data is true', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      AppId: app.id,
      type: 'testHistoryDataTrue',
      data: { string: 'rev1' },
    });
    const response = await request.put(
      `/api/apps/${app.id}/resources/testHistoryDataTrue/${resource.id}`,
      { string: 'rev2' },
    );
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "id": 1,
        "string": "rev2",
      }
    `);
    await resource.reload();
    expect(resource.data).toStrictEqual({
      string: 'rev2',
    });
    const [resourceVersion] = await ResourceVersion.findAll({ raw: true });
    expect(resourceVersion).toStrictEqual({
      ResourceId: resource.id,
      UserId: null,
      created: new Date(),
      data: { string: 'rev1' },
      id: expect.stringMatching(uuid4Pattern),
    });
  });

  it('should keep an old resource version excluding data if history.data is false', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      AppId: app.id,
      type: 'testHistoryDataFalse',
      data: { string: 'rev1' },
    });
    const response = await request.put(
      `/api/apps/${app.id}/resources/testHistoryDataFalse/${resource.id}`,
      { string: 'rev2' },
    );
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "id": 1,
        "string": "rev2",
      }
    `);
    await resource.reload();
    expect(resource.data).toStrictEqual({
      string: 'rev2',
    });
    const [resourceVersion] = await ResourceVersion.findAll({ raw: true });
    expect(resourceVersion).toStrictEqual({
      ResourceId: resource.id,
      UserId: null,
      created: new Date(),
      data: null,
      id: expect.stringMatching(uuid4Pattern),
    });
  });
});

describe('patchResource', () => {
  it('should be able to patch an existing resource', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      type: 'testResource',
      AppId: app.id,
      data: { foo: 'I am Foo.', bar: 'I am Bar.' },
    });

    import.meta.jest.advanceTimersByTime(20e3);

    authorizeStudio();
    const response = await request.patch(
      `/api/apps/${app.id}/resources/testResource/${resource.id}`,
      { foo: 'I am not Foo.' },
    );

    expect(response).toMatchInlineSnapshot(
      { data: { $editor: { id: expect.any(String) } } },
      `
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$editor": {
          "id": Any<String>,
          "name": "Test User",
        },
        "$updated": "1970-01-01T00:00:20.000Z",
        "bar": "I am Bar.",
        "foo": "I am not Foo.",
        "id": 1,
      }
    `,
    );

    const responseB = await request.get(
      `/api/apps/${app.id}/resources/testResource/${resource.id}`,
    );

    expect(responseB).toMatchInlineSnapshot(
      { data: { $editor: { id: expect.any(String) } } },
      `
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$editor": {
          "id": Any<String>,
          "name": "Test User",
        },
        "$updated": "1970-01-01T00:00:20.000Z",
        "bar": "I am Bar.",
        "foo": "I am not Foo.",
        "id": 1,
      }
    `,
    );
  });

  it('should be able to patch an existing resource from another team', async () => {
    const app = await exampleApp(organization.id);
    const team = await Team.create({ name: 'Test Team', AppId: app.id });
    const userB = await User.create({ timezone: 'Europe/Amsterdam' });
    await TeamMember.create({ TeamId: team.id, UserId: user.id, role: TeamRole.Member });
    await TeamMember.create({ TeamId: team.id, UserId: userB.id, role: TeamRole.Member });
    await AppMember.create({ AppId: app.id, UserId: user.id, role: 'Member' });

    const resource = await Resource.create({
      type: 'testResourceTeam',
      AppId: app.id,
      data: { foo: 'I am Foo.' },
      AuthorId: userB.id,
    });

    authorizeStudio();
    const response = await request.patch(
      `/api/apps/${app.id}/resources/testResourceTeam/${resource.id}`,
      { foo: 'I am not Foo.' },
    );

    expect(response).toMatchInlineSnapshot(
      {
        data: {
          $author: { id: expect.any(String) },
          $editor: { id: expect.any(String) },
        },
      },
      `
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$author": {
          "id": Any<String>,
          "name": null,
        },
        "$created": "1970-01-01T00:00:00.000Z",
        "$editor": {
          "id": Any<String>,
          "name": "Test User",
        },
        "$updated": "1970-01-01T00:00:00.000Z",
        "foo": "I am not Foo.",
        "id": 1,
      }
    `,
    );
  });

  it('should not be able to patch an existing resource from another team if not part of the team', async () => {
    const app = await exampleApp(organization.id);
    const team = await Team.create({ name: 'Test Team', AppId: app.id });
    const userB = await User.create({ timezone: 'Europe/Amsterdam' });
    await TeamMember.create({ TeamId: team.id, UserId: userB.id, role: TeamRole.Member });
    await AppMember.create({ AppId: app.id, UserId: user.id, role: 'Member' });

    const resource = await Resource.create({
      type: 'testResourceTeam',
      AppId: app.id,
      data: { foo: 'I am Foo.' },
      AuthorId: userB.id,
    });

    authorizeApp(app);
    const response = await request.patch(
      `/api/apps/${app.id}/resources/testResourceTeam/${resource.id}`,
      { foo: 'I am not Foo.' },
    );

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 403 Forbidden
      Content-Type: application/json; charset=utf-8

      {
        "error": "Forbidden",
        "message": "This action is private.",
        "statusCode": 403,
      }
    `);
  });

  it('should not be possible to patch an existing resource through another resource', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      type: 'testResource',
      AppId: app.id,
      data: { foo: 'I am Foo.' },
    });

    authorizeStudio();
    const response = await request.patch(
      `/api/apps/${app.id}/resources/testResourceB/${resource.id}`,
      { foo: 'I am not Foo.' },
    );

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 404 Not Found
      Content-Type: application/json; charset=utf-8

      {
        "error": "Not Found",
        "message": "Resource not found",
        "statusCode": 404,
      }
    `);
  });

  it('should not be possible to patch an existing resource through another app', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      type: 'testResource',
      AppId: app.id,
      data: { foo: 'I am Foo.' },
    });

    const appB = await exampleApp(organization.id, 'app-b');

    authorizeStudio();
    const response = await request.patch(
      `/api/apps/${appB.id}/resources/testResource/${resource.id}`,
      { foo: 'I am not Foo.' },
    );

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 404 Not Found
      Content-Type: application/json; charset=utf-8

      {
        "error": "Not Found",
        "message": "Resource not found",
        "statusCode": 404,
      }
    `);
  });

  it('should not be possible to patch a non-existent resource', async () => {
    const app = await exampleApp(organization.id);
    authorizeStudio();
    const response = await request.patch(`/api/apps/${app.id}/resources/testResource/0`, {
      foo: 'I am not Foo.',
    });

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 404 Not Found
      Content-Type: application/json; charset=utf-8

      {
        "error": "Not Found",
        "message": "Resource not found",
        "statusCode": 404,
      }
    `);
  });

  it('should validate resources', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      type: 'testResource',
      AppId: app.id,
      data: { foo: 'I am Foo.' },
    });

    authorizeStudio();
    const response = await request.patch(
      `/api/apps/${app.id}/resources/testResource/${resource.id}`,
      { bar: 123 },
    );

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 400 Bad Request
      Content-Type: application/json; charset=utf-8

      {
        "data": {
          "errors": [
            {
              "argument": [
                "string",
              ],
              "instance": 123,
              "message": "is not of a type(s) string",
              "name": "type",
              "path": [
                "bar",
              ],
              "property": "instance.bar",
              "schema": {
                "type": "string",
              },
              "stack": "instance.bar is not of a type(s) string",
            },
          ],
        },
        "error": "Bad Request",
        "message": "Resource validation failed",
        "statusCode": 400,
      }
    `);
  });

  it('should set clonable if specified in the request', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      type: 'testResource',
      AppId: app.id,
      data: { foo: 'I am Foo.' },
    });

    authorizeStudio();
    const response = await request.patch(
      `/api/apps/${app.id}/resources/testResource/${resource.id}`,
      { foo: 'I am not Foo.', $clonable: true },
    );

    await resource.reload();

    expect(response).toMatchInlineSnapshot(
      { data: { $editor: { id: expect.any(String) } } },
      `
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$editor": {
          "id": Any<String>,
          "name": "Test User",
        },
        "$updated": "1970-01-01T00:00:00.000Z",
        "foo": "I am not Foo.",
        "id": 1,
      }
    `,
    );
    expect(resource.clonable).toBe(true);
  });

  it('should set $expires', async () => {
    const app = await exampleApp(organization.id);
    const {
      data: { id },
    } = await request.post<ResourceType>(`/api/apps/${app.id}/resources/testExpirableResource`, {
      foo: 'test',
      $expires: '1970-01-01T00:05:00.000Z',
    });

    const responseA = await request.patch(
      `/api/apps/${app.id}/resources/testExpirableResource/${id}`,
      {
        foo: 'updated',
        $expires: '1970-01-01T00:07:00.000Z',
      },
    );
    const responseB = await request.get(
      `/api/apps/${app.id}/resources/testExpirableResource/${id}`,
    );

    expect(responseA).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$expires": "1970-01-01T00:07:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "foo": "updated",
        "id": 1,
      }
    `);

    expect(responseB).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$expires": "1970-01-01T00:07:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "foo": "updated",
        "id": 1,
      }
    `);
  });

  it('should not set $expires if the date has already passed', async () => {
    // 10 minutes
    import.meta.jest.advanceTimersByTime(600e3);

    const app = await exampleApp(organization.id);
    const {
      data: { id },
    } = await request.post<ResourceType>(`/api/apps/${app.id}/resources/testExpirableResource`, {
      foo: 'test',
    });

    const response = await request.patch(
      `/api/apps/${app.id}/resources/testExpirableResource/${id}`,
      {
        foo: 'updated',
        $expires: '1970-01-01T00:07:00.000Z',
      },
    );
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 400 Bad Request
      Content-Type: application/json; charset=utf-8

      {
        "data": {
          "errors": [
            {
              "instance": "1970-01-01T00:07:00.000Z",
              "message": "has already passed",
              "path": [
                "$expires",
              ],
              "property": "instance.$expires",
              "stack": "instance.$expires has already passed",
            },
          ],
        },
        "error": "Bad Request",
        "message": "Resource validation failed",
        "statusCode": 400,
      }
    `);
  });

  it('should accept assets as form data', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({ AppId: app.id, type: 'testAssets', data: {} });
    const response = await request.patch<ResourceType>(
      `/api/apps/${app.id}/resources/testAssets/${resource.id}`,
      createFormData({
        resource: { file: '0' },
        assets: Buffer.from('Test resource a'),
      }),
    );

    expect(response).toMatchInlineSnapshot(
      { data: { file: expect.stringMatching(/^[0-f]{8}(?:-[0-f]{4}){3}-[0-f]{12}$/) } },
      `
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "file": StringMatching /\\^\\[0-f\\]\\{8\\}\\(\\?:-\\[0-f\\]\\{4\\}\\)\\{3\\}-\\[0-f\\]\\{12\\}\\$/,
        "id": 1,
      }
    `,
    );
    const assets = await Asset.findAll({ where: { ResourceId: response.data.id }, raw: true });
    expect(assets).toStrictEqual([
      {
        AppId: app.id,
        ResourceId: 1,
        UserId: null,
        created: new Date('1970-01-01T00:00:00.000Z'),
        data: expect.any(Buffer),
        filename: null,
        id: response.data.file,
        mime: 'application/octet-stream',
        name: null,
        updated: new Date('1970-01-01T00:00:00.000Z'),
      },
    ]);
    expect(Buffer.from('Test resource a').equals(assets[0].data)).toBe(true);
  });

  it('should disallow unused assets', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({ AppId: app.id, type: 'testAssets', data: {} });
    const response = await request.patch(
      `/api/apps/${app.id}/resources/testAssets/${resource.id}`,
      createFormData({
        resource: { string: '0' },
        assets: Buffer.from('Test resource a'),
      }),
    );

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 400 Bad Request
      Content-Type: application/json; charset=utf-8

      {
        "data": {
          "errors": [
            {
              "argument": "format",
              "instance": 0,
              "message": "is not referenced from the resource",
              "name": "binary",
              "path": [
                "assets",
                0,
              ],
              "property": "instance.assets[0]",
              "stack": "instance.assets[0] is not referenced from the resource",
            },
          ],
        },
        "error": "Bad Request",
        "message": "Resource validation failed",
        "statusCode": 400,
      }
    `);
  });

  it('should block unknown asset references', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({ AppId: app.id, type: 'testAssets', data: {} });
    const response = await request.patch(
      `/api/apps/${app.id}/resources/testAssets/${resource.id}`,
      createFormData({
        resource: { file: '1' },
      }),
    );

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 400 Bad Request
      Content-Type: application/json; charset=utf-8

      {
        "data": {
          "errors": [
            {
              "argument": "binary",
              "instance": "1",
              "message": "does not conform to the "binary" format",
              "name": "format",
              "path": [
                "file",
              ],
              "property": "instance.file",
              "schema": {
                "format": "binary",
                "type": "string",
              },
              "stack": "instance.file does not conform to the "binary" format",
            },
          ],
        },
        "error": "Bad Request",
        "message": "Resource validation failed",
        "statusCode": 400,
      }
    `);
  });

  it('should allow referencing existing assets', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({ AppId: app.id, type: 'testAssets', data: {} });
    const asset = await Asset.create({
      ResourceId: resource.id,
      AppId: app.id,
      data: Buffer.alloc(0),
    });
    const response = await request.patch<ResourceType>(
      `/api/apps/${app.id}/resources/testAssets/${resource.id}`,
      createFormData({ resource: { file: asset.id } }),
    );

    expect(response).toMatchInlineSnapshot(
      { data: { file: expect.any(String) } },
      `
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "file": Any<String>,
        "id": 1,
      }
    `,
    );
    expect(response.data.file).toBe(asset.id);
  });

  it('should delete dereferenced assets', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      AppId: app.id,
      type: 'testAssets',
      data: { file: 'test-asset' },
    });
    const asset = await Asset.create({
      id: 'test-asset',
      ResourceId: resource.id,
      AppId: app.id,
      data: Buffer.alloc(0),
    });
    const response = await request.patch(
      `/api/apps/${app.id}/resources/testAssets/${resource.id}`,
      createFormData({ resource: { file: '0' }, assets: Buffer.alloc(0) }),
    );

    expect(response).toMatchInlineSnapshot(
      { data: { file: expect.stringMatching(/^[0-f]{8}(?:-[0-f]{4}){3}-[0-f]{12}$/) } },
      `
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "file": StringMatching /\\^\\[0-f\\]\\{8\\}\\(\\?:-\\[0-f\\]\\{4\\}\\)\\{3\\}-\\[0-f\\]\\{12\\}\\$/,
        "id": 1,
      }
    `,
    );
    await expect(() => asset.reload()).rejects.toThrow(
      'Instance could not be reloaded because it does not exist anymore (find call returned null)',
    );
  });

  it('should allow organization app editors to patch resources using Studio', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      AppId: app.id,
      type: 'testResourceAuthorOnly',
      data: { foo: 'bar' },
    });
    authorizeStudio();
    const response = await request.patch(
      `/api/apps/${app.id}/resources/testResourceAuthorOnly/${resource.id}`,
      { foo: 'baz' },
    );
    expect(response).toMatchInlineSnapshot(
      { data: { $editor: { id: expect.any(String) } } },
      `
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$editor": {
          "id": Any<String>,
          "name": "Test User",
        },
        "$updated": "1970-01-01T00:00:00.000Z",
        "foo": "baz",
        "id": 1,
      }
    `,
    );
  });

  it('should not allow organization members to patch resources using Studio', async () => {
    await member.update({
      role: 'Member',
    });
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      AppId: app.id,
      type: 'testResourceAuthorOnly',
      data: { foo: 'bar' },
    });
    authorizeStudio();
    const response = await request.patch(
      `/api/apps/${app.id}/resources/testResourceAuthorOnly/${resource.id}`,
      { foo: 'baz' },
    );
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 403 Forbidden
      Content-Type: application/json; charset=utf-8

      {
        "error": "Forbidden",
        "message": "User does not have sufficient permissions.",
        "statusCode": 403,
      }
    `);
  });

  it('should allow organization app editors to patch resources using client credentials', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      AppId: app.id,
      type: 'testResourceAuthorOnly',
      data: { foo: 'bar' },
    });
    await authorizeClientCredentials('resources:write');
    const response = await request.patch(
      `/api/apps/${app.id}/resources/testResourceAuthorOnly/${resource.id}`,
      { foo: 'baz' },
    );
    expect(response).toMatchInlineSnapshot(
      { data: { $editor: { id: expect.any(String) } } },
      `
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$editor": {
          "id": Any<String>,
          "name": "Test User",
        },
        "$updated": "1970-01-01T00:00:00.000Z",
        "foo": "baz",
        "id": 1,
      }
    `,
    );
  });

  it('should not allow organization members to patch resources using client credentials', async () => {
    await member.update({
      role: 'Member',
    });
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      AppId: app.id,
      type: 'testResourceAuthorOnly',
      data: { foo: 'bar' },
    });
    await authorizeClientCredentials('resources:write');
    const response = await request.patch(
      `/api/apps/${app.id}/resources/testResourceAuthorOnly/${resource.id}`,
      { foo: 'baz' },
    );
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 403 Forbidden
      Content-Type: application/json; charset=utf-8

      {
        "error": "Forbidden",
        "message": "User does not have sufficient permissions.",
        "statusCode": 403,
      }
    `);
  });

  it('should set the updater', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      type: 'testResource',
      AppId: app.id,
      data: { foo: 'I am Foo.' },
    });

    authorizeStudio();
    const response = await request.patch(
      `/api/apps/${app.id}/resources/testResource/${resource.id}`,
      { foo: 'I am Foo too!' },
    );
    expect(response).toMatchInlineSnapshot(
      { data: { $editor: { id: expect.any(String) } } },
      `
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$editor": {
          "id": Any<String>,
          "name": "Test User",
        },
        "$updated": "1970-01-01T00:00:00.000Z",
        "foo": "I am Foo too!",
        "id": 1,
      }
    `,
    );

    await resource.reload();
    expect(resource.EditorId).toBe(user.id);
  });

  it('should keep an old resource version including data if history is true', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      AppId: app.id,
      type: 'testHistoryTrue',
      data: { string: 'rev1' },
    });
    const response = await request.patch(
      `/api/apps/${app.id}/resources/testHistoryTrue/${resource.id}`,
      { string: 'rev2' },
    );
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "id": 1,
        "string": "rev2",
      }
    `);
    await resource.reload();
    expect(resource.data).toStrictEqual({
      string: 'rev2',
    });
    const [resourceVersion] = await ResourceVersion.findAll({ raw: true });
    expect(resourceVersion).toStrictEqual({
      ResourceId: resource.id,
      UserId: null,
      created: new Date(),
      data: { string: 'rev1' },
      id: expect.stringMatching(uuid4Pattern),
    });
  });

  it('should keep an old resource version including data if history.data is true', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      AppId: app.id,
      type: 'testHistoryDataTrue',
      data: { string: 'rev1' },
    });
    const response = await request.patch(
      `/api/apps/${app.id}/resources/testHistoryDataTrue/${resource.id}`,
      { string: 'rev2' },
    );
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "id": 1,
        "string": "rev2",
      }
    `);
    await resource.reload();
    expect(resource.data).toStrictEqual({
      string: 'rev2',
    });
    const [resourceVersion] = await ResourceVersion.findAll({ raw: true });
    expect(resourceVersion).toStrictEqual({
      ResourceId: resource.id,
      UserId: null,
      created: new Date(),
      data: { string: 'rev1' },
      id: expect.stringMatching(uuid4Pattern),
    });
  });

  it('should keep an old resource version excluding data if history.data is false', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      AppId: app.id,
      type: 'testHistoryDataFalse',
      data: { string: 'rev1' },
    });
    const response = await request.patch(
      `/api/apps/${app.id}/resources/testHistoryDataFalse/${resource.id}`,
      { string: 'rev2' },
    );
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "id": 1,
        "string": "rev2",
      }
    `);
    await resource.reload();
    expect(resource.data).toStrictEqual({
      string: 'rev2',
    });
    const [resourceVersion] = await ResourceVersion.findAll({ raw: true });
    expect(resourceVersion).toStrictEqual({
      ResourceId: resource.id,
      UserId: null,
      created: new Date(),
      data: null,
      id: expect.stringMatching(uuid4Pattern),
    });
  });
});

describe('deleteResources', () => {
  it('should be able to delete multiple resources', async () => {
    const app = await exampleApp(organization.id);
    const resourceA = await Resource.create({
      type: 'testResource',
      AppId: app.id,
      data: { foo: 'I am Foo.' },
    });
    const resourceB = await Resource.create({
      type: 'testResource',
      AppId: app.id,
      data: { foo: 'I am Foo Too.' },
    });
    await Resource.create({
      type: 'testResource',
      AppId: app.id,
      data: { foo: 'I am Foo Three.' },
    });

    const responseGetA = await request.get(`/api/apps/${app.id}/resources/testResource`);

    expect(responseGetA).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      [
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "foo": "I am Foo.",
          "id": 1,
        },
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "foo": "I am Foo Too.",
          "id": 2,
        },
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "foo": "I am Foo Three.",
          "id": 3,
        },
      ]
    `);

    authorizeStudio();
    const response = await request.delete(`/api/apps/${app.id}/resources/testResource`, {
      data: [resourceA.id, resourceB.id],
    });
    const responseGetEmpty = await request.get(`/api/apps/${app.id}/resources/testResource`);

    expect(response).toMatchInlineSnapshot('HTTP/1.1 204 No Content');
    expect(responseGetEmpty).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      [
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "foo": "I am Foo Three.",
          "id": 3,
        },
      ]
    `);
  });

  it('should delete large number of resources', async () => {
    const app = await exampleApp(organization.id);
    const resources = await Resource.bulkCreate(
      Array.from({ length: 1000 }, (unused, i) => ({
        type: 'testResource',
        AppId: app.id,
        data: { foo: `I am Foo ${i}.` },
      })),
    );
    expect(resources).toHaveLength(1000);
    authorizeStudio();
    const response = await request.delete(`/api/apps/${app.id}/resources/testResource`, {
      data: resources.map((r) => r.id),
    });
    const responseGetEmpty = await request.get(`/api/apps/${app.id}/resources/testResource`);
    expect(response).toMatchInlineSnapshot('HTTP/1.1 204 No Content');
    expect(responseGetEmpty).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      []
    `);
  });

  it('should ignore non-existent resources.', async () => {
    const app = await exampleApp(organization.id);
    const resourceA = await Resource.create({
      type: 'testResource',
      AppId: app.id,
      data: { foo: 'I am Foo.' },
    });

    authorizeStudio();
    const response = await request.delete(`/api/apps/${app.id}/resources/testResource`, {
      data: [resourceA.id, 2, 3, 4, 5],
    });
    const responseGetEmpty = await request.get(`/api/apps/${app.id}/resources/testResource`);

    expect(response).toMatchInlineSnapshot('HTTP/1.1 204 No Content');
    expect(responseGetEmpty).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      []
    `);
  });
});

describe('deleteResource', () => {
  it('should be able to delete an existing resource', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      type: 'testResource',
      AppId: app.id,
      data: { foo: 'I am Foo.' },
    });

    const responseGetA = await request.get(
      `/api/apps/${app.id}/resources/testResource/${resource.id}`,
    );

    expect(responseGetA).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "foo": "I am Foo.",
        "id": 1,
      }
    `);

    authorizeStudio();
    const response = await request.delete(
      `/api/apps/${app.id}/resources/testResource/${resource.id}`,
    );

    expect(response).toMatchInlineSnapshot('HTTP/1.1 204 No Content');

    const responseGetB = await request.get(
      `/api/apps/${app.id}/resources/testResource/${resource.id}`,
    );

    expect(responseGetB).toMatchInlineSnapshot(`
      HTTP/1.1 404 Not Found
      Content-Type: application/json; charset=utf-8

      {
        "error": "Not Found",
        "message": "Resource not found",
        "statusCode": 404,
      }
    `);
  });

  it('should delete another team member’s resource', async () => {
    const app = await exampleApp(organization.id);
    const team = await Team.create({ name: 'Test Team', AppId: app.id });
    const userB = await User.create({ timezone: 'Europe/Amsterdam' });
    await TeamMember.create({ TeamId: team.id, UserId: user.id, role: TeamRole.Member });
    await TeamMember.create({ TeamId: team.id, UserId: userB.id, role: TeamRole.Member });
    await AppMember.create({ AppId: app.id, UserId: user.id, role: 'Member' });

    const resource = await Resource.create({
      type: 'testResourceTeam',
      AppId: app.id,
      data: { foo: 'I am Foo.' },
      AuthorId: userB.id,
    });

    authorizeStudio();
    const response = await request.delete(
      `/api/apps/${app.id}/resources/testResourceTeam/${resource.id}`,
    );

    expect(response).toMatchInlineSnapshot('HTTP/1.1 204 No Content');
  });

  it('should not delete resources if not part of the same team', async () => {
    const app = await exampleApp(organization.id);
    const team = await Team.create({ name: 'Test Team', AppId: app.id });
    const userB = await User.create({ timezone: 'Europe/Amsterdam' });
    await TeamMember.create({ TeamId: team.id, UserId: userB.id, role: TeamRole.Member });
    await AppMember.create({ AppId: app.id, UserId: user.id, role: 'Member' });

    const resource = await Resource.create({
      type: 'testResourceTeam',
      AppId: app.id,
      data: { foo: 'I am Foo.' },
      AuthorId: userB.id,
    });

    authorizeApp(app);
    const response = await request.delete(
      `/api/apps/${app.id}/resources/testResourceTeam/${resource.id}`,
    );

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 404 Not Found
      Content-Type: application/json; charset=utf-8

      {
        "error": "Not Found",
        "message": "Resource not found",
        "statusCode": 404,
      }
    `);
  });

  it('should not be able to delete a non-existent resource', async () => {
    const app = await exampleApp(organization.id);
    authorizeStudio();
    const response = await request.delete(`/api/apps/${app.id}/resources/testResource/0`);

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 404 Not Found
      Content-Type: application/json; charset=utf-8

      {
        "error": "Not Found",
        "message": "Resource not found",
        "statusCode": 404,
      }
    `);
  });

  it('should not be possible to delete an existing resource through another resource', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      type: 'testResource',
      AppId: app.id,
      data: { foo: 'I am Foo.' },
    });

    authorizeStudio();
    const response = await request.delete(
      `/api/apps/${app.id}/resources/testResourceB/${resource.id}`,
    );

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 404 Not Found
      Content-Type: application/json; charset=utf-8

      {
        "error": "Not Found",
        "message": "Resource not found",
        "statusCode": 404,
      }
    `);

    const responseGet = await request.get(
      `/api/apps/${app.id}/resources/testResource/${resource.id}`,
    );

    expect(responseGet).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "foo": "I am Foo.",
        "id": 1,
      }
    `);
  });

  it('should not be possible to delete an existing resource through another app', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      type: 'testResource',
      AppId: app.id,
      data: { foo: 'I am Foo.' },
    });

    const appB = await exampleApp(organization.id, 'app-b');
    authorizeStudio();
    const response = await request.delete(
      `/api/apps/${appB.id}/resources/testResource/${resource.id}`,
    );

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 404 Not Found
      Content-Type: application/json; charset=utf-8

      {
        "error": "Not Found",
        "message": "Resource not found",
        "statusCode": 404,
      }
    `);

    const responseGet = await request.get(
      `/api/apps/${app.id}/resources/testResource/${resource.id}`,
    );

    expect(responseGet).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$created": "1970-01-01T00:00:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "foo": "I am Foo.",
        "id": 1,
      }
    `);
  });

  it('should allow organization app editors to delete resources using Studio', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      AppId: app.id,
      type: 'testResourceAuthorOnly',
      data: { foo: 'bar' },
    });
    authorizeStudio();
    const response = await request.delete(
      `/api/apps/${app.id}/resources/testResourceAuthorOnly/${resource.id}`,
    );
    expect(response).toMatchInlineSnapshot('HTTP/1.1 204 No Content');
  });

  it('should not allow organization members to delete resources using Studio', async () => {
    await member.update({
      role: 'Member',
    });
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      AppId: app.id,
      type: 'testResourceAuthorOnly',
      data: { foo: 'bar' },
    });
    authorizeStudio();
    const response = await request.delete(
      `/api/apps/${app.id}/resources/testResourceAuthorOnly/${resource.id}`,
    );
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 403 Forbidden
      Content-Type: application/json; charset=utf-8

      {
        "error": "Forbidden",
        "message": "User does not have sufficient permissions.",
        "statusCode": 403,
      }
    `);
  });

  it('should allow organization app editors to delete resources using client credentials', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      AppId: app.id,
      type: 'testResourceAuthorOnly',
      data: { foo: 'bar' },
    });
    await authorizeClientCredentials('resources:write');
    const response = await request.delete(
      `/api/apps/${app.id}/resources/testResourceAuthorOnly/${resource.id}`,
    );
    expect(response).toMatchInlineSnapshot('HTTP/1.1 204 No Content');
  });

  it('should not allow organization members to delete resources using client credentials', async () => {
    await member.update({
      role: 'Member',
    });
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      AppId: app.id,
      type: 'testResourceAuthorOnly',
      data: { foo: 'bar' },
    });
    await authorizeClientCredentials('resources:write');
    const response = await request.delete(
      `/api/apps/${app.id}/resources/testResourceAuthorOnly/${resource.id}`,
    );
    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 403 Forbidden
      Content-Type: application/json; charset=utf-8

      {
        "error": "Forbidden",
        "message": "User does not have sufficient permissions.",
        "statusCode": 403,
      }
    `);
  });
});

describe('verifyAppRole', () => {
  // The same logic gets applies to query, get, create, update, and delete.
  it('should return normally on secured actions if user is authenticated and has sufficient roles', async () => {
    const app = await exampleApp(organization.id);
    app.definition.resources.testResource.query = {
      roles: ['Reader'],
    };

    await AppMember.create({ AppId: app.id, UserId: user.id, role: 'Reader' });
    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'bar' },
    });
    await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'baz' },
    });
    await Resource.create({ AppId: app.id, type: 'testResourceB', data: { bar: 'baz' } });

    authorizeStudio();
    const response = await request.get(`/api/apps/${app.id}/resources/testResource`);

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      [
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "foo": "bar",
          "id": 1,
        },
        {
          "$created": "1970-01-01T00:00:00.000Z",
          "$updated": "1970-01-01T00:00:00.000Z",
          "foo": "baz",
          "id": 2,
        },
      ]
    `);
  });

  it('should return normally on secured actions if user is the resource author', async () => {
    const app = await exampleApp(organization.id);
    app.definition.resources.testResource.get = {
      roles: ['Admin', '$author'],
    };

    await AppMember.create({ AppId: app.id, UserId: user.id, role: 'Reader' });
    const resource = await Resource.create({
      AppId: app.id,
      type: 'testResource',
      data: { foo: 'bar' },
      AuthorId: user.id,
    });

    authorizeStudio();
    const response = await request.get(`/api/apps/${app.id}/resources/testResource/${resource.id}`);

    expect(response).toMatchInlineSnapshot(
      { data: { $author: { id: expect.any(String) } } },
      `
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "$author": {
          "id": Any<String>,
          "name": "Test User",
        },
        "$created": "1970-01-01T00:00:00.000Z",
        "$updated": "1970-01-01T00:00:00.000Z",
        "foo": "bar",
        "id": 1,
      }
    `,
    );
  });

  it('should return a 401 on unauthorized requests if roles are present', async () => {
    const app = await exampleApp(organization.id);

    const response = await request.get(`/api/apps/${app.id}/resources/secured`);

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 401 Unauthorized
      Content-Type: application/json; charset=utf-8

      {
        "error": "Unauthorized",
        "message": "User is not logged in.",
        "statusCode": 401,
      }
    `);
  });

  it('should throw a 403 on secured actions if user is authenticated and is not a member', async () => {
    const app = await exampleApp(organization.id);

    authorizeApp(app);
    const response = await request.get(`/api/apps/${app.id}/resources/secured`);

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 403 Forbidden
      Content-Type: application/json; charset=utf-8

      {
        "error": "Forbidden",
        "message": "User is not a member of the app.",
        "statusCode": 403,
      }
    `);
  });

  it('should throw a 403 on secured actions if user is authenticated and has insufficient roles', async () => {
    const app = await exampleApp(organization.id);

    await AppMember.create({ AppId: app.id, UserId: user.id, role: 'Reader' });

    authorizeApp(app);
    const response = await request.post(`/api/apps/${app.id}/resources/secured`, {});

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 403 Forbidden
      Content-Type: application/json; charset=utf-8

      {
        "error": "Forbidden",
        "message": "User does not have sufficient permissions.",
        "statusCode": 403,
      }
    `);
  });
});

describe('getResourceSubscription', () => {
  it('should fetch resource subscriptions', async () => {
    const app = await exampleApp(organization.id);
    await AppSubscription.create({
      AppId: app.id,
      endpoint: 'https://example.com',
      p256dh: 'abc',
      auth: 'def',
    });
    const resource = await Resource.create({
      type: 'testResource',
      AppId: app.id,
      data: { foo: 'I am Foo.' },
    });
    authorizeStudio();
    await request.patch(`/api/apps/${app.id}/subscriptions`, {
      endpoint: 'https://example.com',
      resource: 'testResource',
      resourceId: resource.id,
      action: 'update',
      value: true,
    });

    const response = await request.get(
      `/api/apps/${app.id}/resources/testResource/${resource.id}/subscriptions`,
      { params: { endpoint: 'https://example.com' } },
    );

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "delete": false,
        "id": 1,
        "update": true,
      }
    `);
  });

  it('should return normally if user is not subscribed to the specific resource', async () => {
    const app = await exampleApp(organization.id);
    await AppSubscription.create({
      AppId: app.id,
      endpoint: 'https://example.com',
      p256dh: 'abc',
      auth: 'def',
    });
    const resource = await Resource.create({
      type: 'testResource',
      AppId: app.id,
      data: { foo: 'I am Foo.' },
    });

    authorizeStudio();
    const response = await request.get(
      `/api/apps/${app.id}/resources/testResource/${resource.id}/subscriptions`,
      { params: { endpoint: 'https://example.com' } },
    );

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "delete": false,
        "id": 1,
        "update": false,
      }
    `);
  });

  it('should 404 if resource is not found', async () => {
    const app = await exampleApp(organization.id);
    await AppSubscription.create({
      AppId: app.id,
      endpoint: 'https://example.com',
      p256dh: 'abc',
      auth: 'def',
    });

    authorizeStudio();
    const response = await request.get(
      `/api/apps/${app.id}/resources/testResource/0/subscriptions`,
      { params: { endpoint: 'https://example.com' } },
    );

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 404 Not Found
      Content-Type: application/json; charset=utf-8

      {
        "error": "Not Found",
        "message": "Resource not found.",
        "statusCode": 404,
      }
    `);
  });

  it('should return 200 if user is not subscribed', async () => {
    const app = await exampleApp(organization.id);
    const resource = await Resource.create({
      type: 'testResource',
      AppId: app.id,
      data: { foo: 'I am Foo.' },
    });
    authorizeStudio();
    const response = await request.get(
      `/api/apps/${app.id}/resources/testResource/${resource.id}/subscriptions`,
      { params: { endpoint: 'https://example.com' } },
    );

    expect(response).toMatchInlineSnapshot(`
      HTTP/1.1 200 OK
      Content-Type: application/json; charset=utf-8

      {
        "delete": false,
        "id": 1,
        "update": false,
      }
    `);
  });
});
