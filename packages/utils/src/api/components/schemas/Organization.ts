import { OpenAPIV3 } from 'openapi-types';

import { normalized } from '../../../constants';

export const Organization: OpenAPIV3.NonArraySchemaObject = {
  type: 'object',
  description: 'An organization groups a set of users, apps, themes, and permissions together',
  required: ['id'],
  properties: {
    id: {
      type: 'string',
      pattern: normalized.source,
      minLength: 1,
      maxLength: 30,
      description: 'The unique identifier for the organization.',
    },
    name: {
      type: 'string',
      description: 'The display name for the organization.',
    },
  },
};
