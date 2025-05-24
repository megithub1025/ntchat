// ntchat/backend/__mocks__/jsonwebtoken.js
// Simpler manual mock that doesn't rely on jest.createMockFromModule if module resolution is an issue.
module.exports = {
    verify: jest.fn(), // Default mock, can be overridden in tests
    sign: jest.fn(),   // Default mock, can be overridden in tests
};
