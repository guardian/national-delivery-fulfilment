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
            branches: 5,
            statements: 4.5,
            functions: 5,
            lines: 4.5,
            statements: 4.5,
        },
    },
    transform: {
        '^.+\\.tsx?$': 'babel-jest',
    },
};
