import { Argv } from 'yargs';

import * as get from './get.js';
import * as set from './set.js';

export { noop as handler } from '@appsemble/utils';

export const command = 'config';
export const description = 'Commands related to local configurations.';

export function builder(yargs: Argv): Argv {
  return yargs.command(get).command(set).demandCommand(1);
}
