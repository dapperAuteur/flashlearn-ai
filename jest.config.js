import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './',
});

// Packages that ship ESM-only builds and therefore have to go through Babel before Jest (CJS)
// can require them. `geist` is here because next/jest normally transpiles it for us and we
// replace next/jest's list wholesale below.
const esmPackages = [
  '@powersync',
  'bson',
  '@upstash/qstash',
  'jose',
  '@vercel/analytics',
  'geist',
];

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  // e2e/ is Playwright's, not Jest's. Without this, Jest's default testMatch would try to run
  // the *.spec.ts Playwright suites and fail.
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/', '<rootDir>/e2e/'],
};

// next/jest hardcodes its own `/node_modules/...` ignore pattern and only APPENDS whatever
// transformIgnorePatterns we pass. Since transformIgnorePatterns is an OR, next/jest's pattern
// matches first and every node_modules file stays untransformed, so an appended allowlist can
// never take effect. Resolving the config first and then replacing the array is what actually
// lets the ESM-only packages above get compiled.
export default async () => {
  const config = await createJestConfig(customJestConfig)();

  config.transformIgnorePatterns = [
    // CSS modules are mocked by next/jest, so they never need transforming.
    '^.+\\.module\\.(css|sass|scss)$',
    `node_modules/(?!(?:.+/)?(${esmPackages.join('|')})/)`,
  ];

  return config;
};
