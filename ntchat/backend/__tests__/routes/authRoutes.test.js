const request = require('supertest');
const app = require('../../server'); // Import the Express app
const userModel = require('../../userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // For verifying token structure if needed, or mocking sign
const config = require('../../config');

// Mock the userModel functions
jest.mock('../../userModel');
// Mock bcryptjs - let Jest auto-mock it, then we'll define specific mock implementations for functions in tests.
jest.mock('bcryptjs');
// Mock jsonwebtoken
jest.mock('jsonwebtoken');
// Mock db for server.js startup (to prevent actual DB connection attempts during test setup)
jest.mock('../../db', () => ({
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }), // Default mock for any query
    getClient: jest.fn().mockResolvedValue({ query: jest.fn(), release: jest.fn() }),
    pool: { 
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        connect: jest.fn().mockResolvedValue({ query: jest.fn(), release: jest.fn() }) 
    }
}));


describe('Auth API Endpoints', () => {
    
    beforeEach(() => {
        // Reset mocks before each test
        userModel.createUser.mockReset();
        userModel.findUserByUsername.mockReset();
        bcrypt.hash.mockReset();
        bcrypt.compare.mockReset();
        jwt.sign.mockReset(); // Reset jwt.sign mock before each test
    });

    describe('POST /auth/register', () => {
        it('should register a new user successfully (201)', async () => {
            const userData = { username: 'newUser', email: 'new@example.com', password: 'password123' };
            const hashedPassword = 'hashedPassword123';
            const createdUser = { id: 1, ...userData, roles: ['user'], hashedPassword };
            
            bcrypt.hash.mockResolvedValue(hashedPassword);
            userModel.createUser.mockResolvedValue(createdUser); // Mocking createUser to return the user object without error

            const res = await request(app)
                .post('/auth/register')
                .send(userData);

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('message', 'User registered successfully');
            expect(res.body.user).toBeDefined();
            expect(res.body.user.username).toBe(userData.username);
            expect(res.body.user).not.toHaveProperty('password'); // Ensure password isn't returned
            expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 10);
            expect(userModel.createUser).toHaveBeenCalledWith(userData.username, userData.email, hashedPassword, ['user']);
        });

        it('should return 409 if username already exists', async () => {
            const userData = { username: 'existingUser', email: 'new@example.com', password: 'password123' };
            bcrypt.hash.mockResolvedValue('someHash');
            userModel.createUser.mockResolvedValue({ error: 'Username already exists' }); // Simulate model returning error

            const res = await request(app)
                .post('/auth/register')
                .send(userData);

            expect(res.statusCode).toEqual(409);
            expect(res.body).toHaveProperty('message', 'Username already exists');
        });

        it('should return 409 if email already exists', async () => {
            const userData = { username: 'newUser', email: 'existing@example.com', password: 'password123' };
            bcrypt.hash.mockResolvedValue('someHash');
            userModel.createUser.mockResolvedValue({ error: 'Email already exists' }); // Simulate model returning error

            const res = await request(app)
                .post('/auth/register')
                .send(userData);
            
            expect(res.statusCode).toEqual(409);
            expect(res.body).toHaveProperty('message', 'Email already exists');
        });

        it('should return 400 for missing fields (e.g., password)', async () => {
            const res = await request(app)
                .post('/auth/register')
                .send({ username: 'test', email: 'test@example.com' }); // Password missing

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('message', 'Username, email, and password are required.');
        });
    });

    describe('POST /auth/login', () => {
        it('should login an existing user successfully and return a token (200)', async () => {
            const loginCredentials = { username: 'testuser', password: 'password123' };
            const storedUser = { 
                id: 1, 
                username: 'testuser', 
                email: 'test@example.com', 
                hashedPassword: 'hashedPassword123', 
                roles: ['user'] 
            };

            userModel.findUserByUsername.mockResolvedValue(storedUser);
            bcrypt.compare.mockResolvedValue(true); // Passwords match
            jwt.sign.mockImplementation(() => 'mocked.jwt.token'); // Mock jwt.sign

            const res = await request(app)
                .post('/auth/login')
                .send(loginCredentials);

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('message', 'Login successful');
            expect(res.body).toHaveProperty('token', 'mocked.jwt.token'); // Check for the mocked token
            expect(res.body.user).toBeDefined();
            expect(res.body.user.username).toBe(loginCredentials.username);
            expect(userModel.findUserByUsername).toHaveBeenCalledWith(loginCredentials.username);
            expect(bcrypt.compare).toHaveBeenCalledWith(loginCredentials.password, storedUser.hashedPassword);
            expect(jwt.sign).toHaveBeenCalledWith(
                { userId: storedUser.id, username: storedUser.username, roles: storedUser.roles },
                config.jwtSecret,
                { expiresIn: '1h' }
            );
        });

        it('should return 401 for invalid username', async () => {
            userModel.findUserByUsername.mockResolvedValue(null); // User not found

            const res = await request(app)
                .post('/auth/login')
                .send({ username: 'unknownuser', password: 'password123' });

            expect(res.statusCode).toEqual(401);
            expect(res.body).toHaveProperty('message', 'Invalid credentials.');
        });

        it('should return 401 for incorrect password', async () => {
            const loginCredentials = { username: 'testuser', password: 'wrongpassword' };
            const storedUser = { id: 1, username: 'testuser', hashedPassword: 'hashedPassword123' };
            
            userModel.findUserByUsername.mockResolvedValue(storedUser);
            bcrypt.compare.mockResolvedValue(false); // Passwords do not match

            const res = await request(app)
                .post('/auth/login')
                .send(loginCredentials);

            expect(res.statusCode).toEqual(401);
            expect(res.body).toHaveProperty('message', 'Invalid credentials.');
        });

        it('should return 400 for missing fields (e.g., password)', async () => {
            const res = await request(app)
                .post('/auth/login')
                .send({ username: 'testuser' }); // Password missing

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('message', 'Username and password are required.');
        });

        it('should return 500 if userModel.findUserByUsername throws an error', async () => {
            userModel.findUserByUsername.mockRejectedValue(new Error('Database lookup error'));
            const res = await request(app)
                .post('/auth/login')
                .send({ username: 'testuser', password: 'password123' });
            
            expect(res.statusCode).toEqual(500);
            expect(res.body).toHaveProperty('message', 'Error logging in');
        });

        it('should return 500 if bcrypt.compare throws an error', async () => {
            const storedUser = { id: 1, username: 'testuser', hashedPassword: 'hashedPassword123' };
            userModel.findUserByUsername.mockResolvedValue(storedUser);
            bcrypt.compare.mockRejectedValue(new Error('Bcrypt error'));
            const res = await request(app)
                .post('/auth/login')
                .send({ username: 'testuser', password: 'password123' });

            expect(res.statusCode).toEqual(500);
            expect(res.body).toHaveProperty('message', 'Error logging in');
        });
    });
});
