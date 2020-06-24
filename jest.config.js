module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  modulePaths: ['<rootDir>/src'],
  collectCoverageFrom: ['src/**/*.ts', '!**/__Tests__/**'],
  coverageThreshold: {
    global: {
      statements: 40,
      branches: 30,
      lines: 40,
      functions: 25,
    },
  },
}
