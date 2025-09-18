module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^uuid$': '<rootDir>/node_modules/uuid/dist/index.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)',
  ],
  collectCoverageFrom: [
    'src/app/api/**/*.ts',
    'src/components/onboarding/**/*.ts',
    'src/lib/api/**/*.ts',
    'src/lib/policy/rules.ts',
    'src/lib/store/**/*.ts',
    'src/lib/telemetry/**/*.ts',
    'src/lib/types/session.ts',
    'src/lib/utils/utils.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
};
