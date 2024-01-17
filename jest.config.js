module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    modulePathIgnorePatterns: [
        'dist/',
        'cdk/',
        'node_modules/',
        'project',
        'target',
    ],
    collectCoverage: true,
    collectCoverageFrom: ['src/**/*.ts', '!**/*.test.ts'],
    coverageThreshold: {
        global: {
            branches: 0,
            functions: 2,
            lines: 5,
            statements: 5,
        },
    },
};
