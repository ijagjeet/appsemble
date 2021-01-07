const { existsSync, readFileSync } = require('fs');
const { join } = require('path');

/**
 * Generate a proper Jest configuration based on a project context.
 *
 * @param {Object} module - The NodeJS module to assign the exported configuration to.
 */
module.exports = ({ exports, path }) => {
  const readJSON = (filename) => JSON.parse(readFileSync(join(path, filename)));

  const pkg = readJSON('package.json');
  const { compilerOptions: { lib = [], types = [] } = {} } = readJSON('tsconfig.json');

  const setupFilesAfterEnv = [];
  const moduleNameMapper = { [/@appsemble\/([\w-]+)/.source]: '@appsemble/$1/src' };
  const transform = {};

  // Mock CSS modules if they are enabled in the project types.
  if (types.includes('css-modules')) {
    moduleNameMapper[/\.css$/.source] = 'identity-obj-proxy';
  }

  // Load jest.setup.ts if it exists, otherwise skip it.
  const setup = join(path, 'jest.setup.ts');
  if (existsSync(setup)) {
    setupFilesAfterEnv.push(setup);
  }

  // If the types define testing library, add it to the setup files
  if (types.includes('@testing-library/jest-dom')) {
    setupFilesAfterEnv.push('@testing-library/jest-dom');
  }

  // Handle messages.ts files using Babel if babel-plugin-react-intl-auto is enabled.
  if (types.includes('babel-plugin-react-intl-auto')) {
    transform[/\/[A-Z]\w+\/messages\.ts$/.source] = 'babel-jest';
  }

  Object.assign(exports, {
    coveragePathIgnorePatterns: ['.d.ts$'],
    clearMocks: true,
    displayName: pkg.name,
    globals: { 'ts-jest': { isolatedModules: true } },
    moduleNameMapper,
    preset: 'ts-jest',
    resetMocks: true,
    restoreMocks: true,
    setupFilesAfterEnv,
    // Use the jsdom environment if the project uses dom types. Otherwise default to node.
    testEnvironment: lib.includes('dom') ? 'jsdom' : 'node',
    transform,
  });
};
