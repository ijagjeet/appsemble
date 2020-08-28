import type { Argv } from 'yargs';

import { initDB } from '../models';
import type { Argv as Args } from '../types';
import { restoreDNS } from '../utils/dns';
import { handleDBError } from '../utils/sqlUtils';
import { databaseBuilder } from './builder/database';

export const command = 'restore';
export const description = 'Restore the app DNS settings from the database in the host platform';

export function builder(yargs: Argv): Argv {
  return databaseBuilder(yargs)
    .option('app-domain-strategy', {
      desc: 'How to link app domain names to apps',
      choices: ['kubernetes-ingress'],
    })
    .option('ingress-annotations', {
      desc: 'A JSON string representing ingress annotations to add to created ingresses.',
      implies: ['service-name', 'service-port'],
    })
    .option('service-name', {
      desc:
        'The name of the service to which the ingress should point if app-domain-strategy is set to kubernetes-ingress',
      implies: ['service-port'],
    })
    .option('service-port', {
      desc:
        'The port of the service to which the ingress should point if app-domain-strategy is set to kubernetes-ingress',
      implies: ['service-name'],
    })
    .option('host', {
      desc:
        'The external host on which the server is available. This should include the protocol, hostname, and optionally port.',
      required: true,
    });
}

export async function handler(argv: Args): Promise<void> {
  try {
    initDB({
      host: argv.databaseHost,
      port: argv.databasePort,
      username: argv.databaseUser,
      password: argv.databasePassword,
      database: argv.databaseName,
      ssl: argv.databaseSsl,
      uri: argv.databaseUrl,
    });
  } catch (error) {
    handleDBError(error);
  }

  await restoreDNS(argv);
}
