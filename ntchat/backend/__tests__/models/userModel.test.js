const userModel = require('../../userModel');
const db = require('../../db'); // This will be the mock from __mocks__/db.js due to jest.mock below
jest.mock('../../db'); // Ensures the manual mock from __mocks__/db.js is used.

// Mock the User class that's defined within userModel.js if it's used for `instanceof` checks or specific methods
// For now, we assume it's a simple constructor and its direct usage is not heavily tested,
// rather we test the functions that *use* it or return its instances.

// Removed self-mock for userModel as it was causing "Identifier 'User' has already been declared"
// and is not necessary for testing the exported functions with db mock.

describe('User Model', () => {
    beforeEach(() => {
        // Reset the mock before each test
        db.reset(); // Using the custom reset function from our mock
    });

    describe('createUser', () => {
        it('should create a new user and return it', async () => {
            const userData = {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
                roles: ['user'],
                created_at: new Date(),
                updated_at: new Date(),
            };
            // Mock findUserByUsername and findUserByEmail to return null (user doesn't exist)
            db.query.mockResolvedValueOnce({ rows: [] }); // for findUserByUsername
            db.query.mockResolvedValueOnce({ rows: [] }); // for findUserByEmail
            // Mock the INSERT query
            db.query.mockResolvedValueOnce({ rows: [userData] });

            const newUser = await userModel.createUser('testuser', 'test@example.com', 'hashedpassword', ['user']);

            expect(db.query).toHaveBeenCalledTimes(3); // findUserByUsername, findUserByEmail, INSERT
            expect(db.query).toHaveBeenNthCalledWith(1, 'SELECT * FROM users WHERE username = $1;', ['testuser']);
            expect(db.query).toHaveBeenNthCalledWith(2, 'SELECT * FROM users WHERE email = $1;', ['test@example.com']);
            expect(db.query).toHaveBeenNthCalledWith(3,
                expect.stringContaining('INSERT INTO users'), // Check if it's an INSERT query
                ['testuser', 'test@example.com', 'hashedpassword', ['user']]
            );
            expect(newUser).toBeInstanceOf(Object); // User class instance
            expect(newUser.username).toBe('testuser');
            expect(newUser.email).toBe('test@example.com');
        });

        it('should return { error: "Username already exists" } if username is taken', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 1, username: 'testuser' }] }); // Mock findUserByUsername

            const result = await userModel.createUser('testuser', 'new@example.com', 'password');
            expect(result.error).toBe('Username already exists');
            expect(db.query).toHaveBeenCalledTimes(1); // Only findUserByUsername should be called
        });
        
        it('should return { error: "Email already exists" } if email is taken', async () => {
            db.query.mockResolvedValueOnce({ rows: [] }); // Mock findUserByUsername (no user)
            db.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com' }] }); // Mock findUserByEmail

            const result = await userModel.createUser('newuser', 'test@example.com', 'password');
            expect(result.error).toBe('Email already exists');
            expect(db.query).toHaveBeenCalledTimes(2); // findUserByUsername and findUserByEmail
        });

        it('should handle database errors during user creation', async () => {
            db.query.mockResolvedValueOnce({ rows: [] }); // findUserByUsername
            db.query.mockResolvedValueOnce({ rows: [] }); // findUserByEmail
            db.query.mockRejectedValueOnce(new Error('DB error')); // Mock INSERT failure

            const result = await userModel.createUser('testuser', 'test@example.com', 'hashedpassword');
            expect(result.error).toBe('Database error creating user');
        });

        it('should return unique constraint error for username if DB throws code 23505 on username', async () => {
            db.query.mockResolvedValueOnce({ rows: [] }); // findUserByUsername
            db.query.mockResolvedValueOnce({ rows: [] }); // findUserByEmail
            const dbError = new Error('duplicate key value violates unique constraint "users_username_key"');
            dbError.code = '23505';
            dbError.constraint = 'users_username_key';
            db.query.mockRejectedValueOnce(dbError);

            const result = await userModel.createUser('testuser', 'test@example.com', 'hashedpassword');
            expect(result.error).toBe('Username already exists');
        });

        it('should return unique constraint error for email if DB throws code 23505 on email', async () => {
            db.query.mockResolvedValueOnce({ rows: [] }); // findUserByUsername
            db.query.mockResolvedValueOnce({ rows: [] }); // findUserByEmail
            const dbError = new Error('duplicate key value violates unique constraint "users_email_key"');
            dbError.code = '23505';
            dbError.constraint = 'users_email_key';
            db.query.mockRejectedValueOnce(dbError);

            const result = await userModel.createUser('testuser', 'test@example.com', 'hashedpassword');
            expect(result.error).toBe('Email already exists');
        });
    });

    describe('findUserByUsername', () => {
        it('should return a user object if found', async () => {
            const userData = { id: 1, username: 'testuser', email: 'test@example.com', hashed_password: 'hash', roles: ['user'] };
            db.query.mockResolvedValueOnce({ rows: [userData] });

            const user = await userModel.findUserByUsername('testuser');
            expect(db.query).toHaveBeenCalledWith('SELECT * FROM users WHERE username = $1;', ['testuser']);
            expect(user).toBeInstanceOf(Object); // User class instance
            expect(user.username).toBe('testuser');
        });

        it('should return null if user not found', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });
            const user = await userModel.findUserByUsername('nonexistent');
            expect(user).toBeNull();
        });

        it('should return null on database error', async () => {
            db.query.mockRejectedValueOnce(new Error('DB error'));
            const user = await userModel.findUserByUsername('testuser');
            expect(user).toBeNull();
        });
    });

    describe('findUserByEmail', () => {
        it('should return a user object if found', async () => {
            const userData = { id: 1, username: 'testuser', email: 'test@example.com', hashed_password: 'hash', roles: ['user'] };
            db.query.mockResolvedValueOnce({ rows: [userData] });

            const user = await userModel.findUserByEmail('test@example.com');
            expect(db.query).toHaveBeenCalledWith('SELECT * FROM users WHERE email = $1;', ['test@example.com']);
            expect(user).toBeInstanceOf(Object); // User class instance
            expect(user.email).toBe('test@example.com');
        });

        it('should return null if user not found', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });
            const user = await userModel.findUserByEmail('nonexistent@example.com');
            expect(user).toBeNull();
        });
    });

    describe('findUserById', () => {
        it('should return a user object if found', async () => {
            const userData = { id: 1, username: 'testuser', email: 'test@example.com', hashed_password: 'hash', roles: ['user'] };
            db.query.mockResolvedValueOnce({ rows: [userData] });

            const user = await userModel.findUserById(1);
            expect(db.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1;', [1]);
            expect(user).toBeInstanceOf(Object); // User class instance
            expect(user.id).toBe(1);
        });

        it('should return null if user not found', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });
            const user = await userModel.findUserById(999);
            expect(user).toBeNull();
        });
    });
});
