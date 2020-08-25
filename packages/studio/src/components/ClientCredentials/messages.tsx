import { defineMessages } from 'react-intl';

export const messages = defineMessages({
  title: 'OAuth2 client credentials',
  explanation: 'OAuth2 client credentials allow applications to perform actions on your behalf.',
  loadError: 'There was a problem loading your client credentials.',
  retry: 'Retry',
  empty:
    'You currently haven’t registered any OAuth2 clients. If you don’t know what this is, you should probably leave this empty.',
  register: 'Register',
  created: 'Created',
  deleteTitle: 'Delete client credentials',
  deleteBody: 'Are you sure you want to delete these client credentia;s?',
  deleteCancel: 'Cancel',
  deleteConfirm: 'Delete',
  description: 'Description',
  descriptionHelp: 'A short description to render in the overview',
  expires: 'Expires',
  never: 'Never',
  expiresHelp: 'The date on which the client credentials expire',
  credentials: 'Client credentials',
  credentialsHelp: 'Never share these client credentials with anyone.',
  copiedSuccess: 'Copied client credentials to clipboard',
  copiedError: 'Failed to copy client credentials to clipboard',
  close: 'Close',
  cancel: 'Cancel',
  submit: 'Create',
  scope: 'Scope',
  revoke: 'Revoke',
  unknownScope: 'This scope is not currently known. You may want to revoke this client.',
  'blocks:write': 'Publish blocks and block versions',
  'organizations:write': 'Create and manage organizations',
  'apps:write': 'Create and modify apps',
});
