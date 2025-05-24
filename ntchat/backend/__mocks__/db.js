// __mocks__/db.js

// Mock implementation for db.query
const mockQuery = jest.fn();

// Mock implementation for db.getClient (if used by models, though current models use pool.query directly)
const mockGetClient = jest.fn().mockResolvedValue({
    query: mockQuery,
    release: jest.fn(),
});

const dbMock = {
    query: mockQuery,
    getClient: mockGetClient,
    // Mock the pool itself if any code directly accesses properties/methods of the pool
    pool: {
        query: mockQuery, // If models use pool.query directly
        connect: mockGetClient, // If models use pool.connect
        // Add any other pool properties/methods that might be accessed
    },
};

// Helper to reset mockQuery calls and implementations between tests
dbMock.reset = () => {
    mockQuery.mockClear();
    mockGetClient.mockClear();
    // Add any other mock clear calls if necessary
};

module.exports = dbMock;
