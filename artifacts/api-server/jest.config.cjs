/** @type {import('jest').Config} */
module.exports = {
  // Use CommonJS preset — simpler than ESM, avoids experimental VM modules.
  // Tests run in a different module system from production (CJS vs ESM) which
  // is acceptable for unit tests that mock all I/O boundaries anyway.
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    // Workspace package resolution
    "^@workspace/db$": "<rootDir>/src/__mocks__/db.ts",
    "^@workspace/api-zod$": "<rootDir>/../../lib/api-zod/src/index.ts",
    // Strip .js extensions from local imports (TypeScript ESM convention → CJS compatible)
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "CommonJS",
          moduleResolution: "Node",
          esModuleInterop: true,
          // Allow zod/v4 sub-path import used in the db schema
          paths: {},
        },
      },
    ],
  },
  // Allow ts-jest to transform workspace source files outside rootDir
  transformIgnorePatterns: ["/node_modules/(?!(@workspace)/)"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  // resetMocks between tests: clears call history AND implementation queues
  // so each test is self-contained about what it expects from mocks.
  resetMocks: true,
};
