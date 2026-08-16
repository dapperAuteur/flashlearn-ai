import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  // e2e/ is Playwright's, not Jest's — without this, Jest's default testMatch would try to run
  // the *.spec.ts Playwright suites and fail.
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/', '<rootDir>/e2e/'],
  transformIgnorePatterns: [
    'node_modules/(?!(?:.+/)?(@powersync|bson|@upstash/qstash|jose)/)',
  ],
};

export default createJestConfig(customJestConfig);