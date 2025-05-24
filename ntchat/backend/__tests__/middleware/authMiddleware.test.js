const { verifyToken, hasRole, isAdmin } = require('../../authMiddleware');
const jwt = require('jsonwebtoken'); // Will be the manual mock from __mocks__
// const config = require('../../config'); // No longer needed directly, as config is mocked below

// Mock config before other mocks that might use it, or before the module under test if it reads config at module level
jest.mock('../../config', () => ({
    jwtSecret: 'test-secret-key123!', // Provide a specific test secret
    // Add other necessary config properties if authMiddleware or its dependencies use them
}));

// Mock dependencies
jest.mock('jsonwebtoken'); // This will use ntchat/backend/__mocks__/jsonwebtoken.js
// userModel is not directly used by authMiddleware in its current form.
// If it were (e.g., to check if user from token is still active/valid in DB), we'd mock it:
// jest.mock('../../userModel');

// Re-require config *after* it has been mocked if needed for JWT_SECRET in tests,
// though the middleware itself will get the mocked version.
const config = require('../../config');

describe('Auth Middleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        mockReq = {
            headers: {},
            user: null, // Will be set by verifyToken
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        mockNext = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('verifyToken', () => {
        it('should call next() and set req.user if token is valid', () => {
            mockReq.headers.authorization = 'Bearer validtoken123';
            const decodedPayload = { userId: 1, username: 'testuser', roles: ['user'] };
            jwt.verify.mockReturnValue(decodedPayload);

            verifyToken(mockReq, mockRes, mockNext);

            expect(jwt.verify).toHaveBeenCalledWith('validtoken123', 'test-secret-key123!'); // Use the mocked secret for assertion
            expect(mockReq.user).toEqual(decodedPayload);
            expect(mockNext).toHaveBeenCalledTimes(1);
            expect(mockRes.status).not.toHaveBeenCalled();
        });

        it('should return 401 if no token is provided', () => {
            verifyToken(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access denied. No token provided.' });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 401 if token is not in "Bearer <token>" format', () => {
            mockReq.headers.authorization = 'InvalidTokenFormat';
            verifyToken(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access denied. No token provided.' }); // Corrected this message based on implementation
            expect(mockNext).not.toHaveBeenCalled();
        });
        
        it('should return 401 if token is expired', () => {
            mockReq.headers.authorization = 'Bearer expiredtoken';
            const error = new Error('Token expired.');
            error.name = 'TokenExpiredError';
            jwt.verify.mockImplementation(() => {
                throw error;
            });

            verifyToken(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Token expired.' });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 401 if token is invalid (JsonWebTokenError)', () => {
            mockReq.headers.authorization = 'Bearer invalidtoken';
            const error = new Error('Invalid token.');
            error.name = 'JsonWebTokenError';
            jwt.verify.mockImplementation(() => {
                throw error;
            });
            
            verifyToken(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid token.' });
            expect(mockNext).not.toHaveBeenCalled();
        });
        
        it('should return 500 for other jwt.verify errors', () => {
            mockReq.headers.authorization = 'Bearer problematictoken';
            jwt.verify.mockImplementation(() => {
                throw new Error('Some other JWT error');
            });

            verifyToken(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Failed to authenticate token.' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('hasRole', () => {
        it('should call next() if user has one of the required roles', () => {
            mockReq.user = { roles: ['user', 'editor'] };
            const middleware = hasRole(['editor', 'admin']);
            middleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledTimes(1);
            expect(mockRes.status).not.toHaveBeenCalled();
        });

        it('should return 403 if user does not have any of the required roles', () => {
            mockReq.user = { roles: ['user'] };
            const middleware = hasRole(['editor', 'admin']);
            middleware(mockReq, mockRes, mockNext);
            
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Forbidden. Requires one of these roles: editor, admin.' });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 403 if user has no roles array', () => {
            mockReq.user = { roles: null }; // Or undefined, or not an array
            const middleware = hasRole(['user']);
            middleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Forbidden. User roles not available.' });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 403 if req.user is not defined', () => {
            mockReq.user = null;
            const middleware = hasRole(['user']);
            middleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Forbidden. User roles not available.' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('isAdmin', () => {
        it('should call next() if user has "admin" role', () => {
            mockReq.user = { roles: ['user', 'admin'] };
            isAdmin(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledTimes(1);
            expect(mockRes.status).not.toHaveBeenCalled();
        });

        it('should return 403 if user does not have "admin" role', () => {
            mockReq.user = { roles: ['user'] };
            isAdmin(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Forbidden. Admin access required.' });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 403 if user has no roles or req.user is not defined', () => {
            mockReq.user = null; // Or { roles: [] } or { roles: undefined }
            isAdmin(mockReq, mockRes, mockNext);
            
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Forbidden. Admin access required.' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });
});
