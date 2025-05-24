module.exports = {
    testEnvironment: 'node',
    // Automatically clear mock calls and instances between every test
    clearMocks: true,
    // The directory where Jest should output its coverage files
    coverageDirectory: 'coverage',
    // An array of glob patterns indicating a set of files for which coverage information should be collected
    collectCoverageFrom: [
        '**/*.js',
        '!jest.config.js',
        '!server.js', // Exclude server.js for now, focus on models/controllers
        '!**/node_modules/**',
        '!**/coverage/**',
        '!config.js', // Often contains sensitive or environment-specific data
        '!db.js', // DB connection module, will be mocked
        '!socketHandlers.js', // Socket logic, test separately or via integration tests
        '!routes/**/*.js', // Route handlers will be tested via supertest (integration tests)
    ],
    // A list of reporter names that Jest uses when writing coverage reports
    coverageReporters: ['json', 'text', 'lcov', 'clover'],
    // An array of file extensions your modules use
    moduleFileExtensions: ['js', 'json'],
    // Explicitly set module directories (though "node_modules" is default)
    moduleDirectories: ['node_modules', '<rootDir>'], // <rootDir> refers to ntchat/backend
    // The glob patterns Jest uses to detect test files
    testMatch: ['**/__tests__/**/*.js?(x)', '**/?(*.)+(spec|test).js?(x)'],
    // A map from regular expressions to paths to transformers
    // transform: {},
    // Indicates whether each individual test should be reported during the run
    verbose: true,
};
