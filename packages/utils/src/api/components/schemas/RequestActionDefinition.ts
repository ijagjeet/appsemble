import { BaseActionDefinition } from './BaseActionDefinition';
import { extendJSONSchema } from './utils';

export const RequestActionDefinition = extendJSONSchema(BaseActionDefinition, {
  type: 'object',
  additionalProperties: false,
  required: ['type', 'url'],
  properties: {
    type: {
      enum: ['request'],
      description: `Performs an HTTP request.

This can be used to call the Appsemble API or an external API in order to fetch data or send data.
When sending \`POST\`, \`PUT\`, \`DELETE\` and \`PATCH\` calls the data that is currently available
in the block gets passed through.

If the content type of the request is \`text/xml\` or \`application/xml\`, the data will be
converted to JSON.
`,
    },
    url: {
      $ref: '#/components/schemas/RemapperDefinition',
      description: `A remapper that results in the URL to send the request to.

Can be a relative URL (E.g. \`/api/health\`) for usage with the Appsemble API, or an absolute URL
(E.g. \`https://example.com\`) for usage with external sites.`,
    },
    method: {
      enum: ['delete', 'get', 'patch', 'post', 'put'],
      default: 'get',
      description: 'The type of request to make.',
    },
    query: {
      $ref: '#/components/schemas/RemapperDefinition',
      description:
        'A remapper that results in either an object containing each property of the query string, or a string that gets passed through as-is.',
    },
    body: {
      $ref: '#/components/schemas/RemapperDefinition',
      description: `remapper that results in the request body to send.

If not specified, the raw input data is used.
`,
    },
    proxy: {
      type: 'boolean',
      default: 'false',
      description: `By default requests will be proxied through the Appsemble API.

This allows to protect user data and ensures
[CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) is enabled. This behavior can be
disabled by setting this to \`false\`
`,
    },
    schema: {
      description: 'The name of the schema to validate against before submitting data.',
      $ref: '#/components/schemas/JSONSchema',
    },
  },
});
