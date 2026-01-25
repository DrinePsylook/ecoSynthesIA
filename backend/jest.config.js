module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    testMatch: ['**/*.test.ts'],
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts'
    ],
    coverageDirectory: 'coverage',
    moduleFileExtensions: ['ts', 'js', 'json'],
    testTimeout: 30000, 
    transform: {
        '^.+\\.ts$': ['ts-jest', {
            tsconfig: 'tsconfig.test.json'
        }]
    },
    // Force Jest to exit after tests complete
    // This helps with open handles from database connections, etc.
    forceExit: true,
    // Run tests serially to avoid database connection conflicts
    maxWorkers: 1
};