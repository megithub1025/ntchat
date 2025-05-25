const request = require('supertest');
const app = require('../../server'); // Import the Express app
const chatModel = require('../../models/chatModel');
const userModel = require('../../userModel'); // For mocking user existence if needed

// Mock authMiddleware
// This mock will apply to all tests in this file.
// req.user can be customized within tests if needed by re-mocking or other strategies.
const mockUser = { id: 1, username: 'testuser', roles: ['user'] };
const mockAdminUser = { id: 2, username: 'adminuser', roles: ['user', 'admin'] };

jest.mock('../../authMiddleware', () => ({
    verifyToken: jest.fn((req, res, next) => {
        // Default to a standard user. Tests can override req.user if needed for specific scenarios.
        req.user = mockUser; 
        next();
    }),
    isAdmin: jest.fn((req, res, next) => {
        // Check if the current req.user (set by verifyToken mock) has admin role
        if (req.user && req.user.roles.includes('admin')) {
            next();
        } else {
            res.status(403).json({ message: 'Forbidden: Admin access required.' });
        }
    }),
    hasRole: jest.fn((rolesRequired) => (req, res, next) => {
        if (!req.user || !req.user.roles) {
            return res.status(403).json({ message: 'Forbidden. User roles not available.' });
        }
        const hasRequiredRole = rolesRequired.some(role => req.user.roles.includes(role));
        if (!hasRequiredRole) {
            return res.status(403).json({ message: `Forbidden. Requires one of these roles: ${rolesRequired.join(', ')}.` });
        }
        next();
    }),
}));

// Mock models
jest.mock('../../models/chatModel');
jest.mock('../../userModel');

// Mock db for server.js startup (to prevent actual DB connection attempts during test setup)
jest.mock('../../db', () => ({
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    getClient: jest.fn().mockResolvedValue({ query: jest.fn(), release: jest.fn() }),
    pool: { 
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        connect: jest.fn().mockResolvedValue({ query: jest.fn(), release: jest.fn() }) 
    }
}));


describe('Chat API Endpoints (/api/rooms)', () => {
    
    beforeEach(() => {
        // Reset relevant model mocks before each test
        chatModel.createRoom.mockReset();
        chatModel.addUserToRoom.mockReset();
        chatModel.getAllRooms.mockReset();
        chatModel.getRoomById.mockReset(); // For validating room existence before adding members
        userModel.findUserById.mockReset(); // For validating user existence if needed
        
        // Reset middleware mocks that might have their behavior changed per test
        // (though verifyToken is usually set once, isAdmin might be tested with different users)
        require('../../authMiddleware').verifyToken.mockImplementation((req, res, next) => {
            req.user = mockUser; // Default to standard user
            next();
        });
         require('../../authMiddleware').isAdmin.mockImplementation((req, res, next) => {
            if (req.user && req.user.roles.includes('admin')) next();
            else res.status(403).json({ message: 'Forbidden: Admin access required (mock).' });
        });
    });

    describe('POST /api/rooms (Create Room)', () => {
        it('should create a new room successfully for an authenticated user', async () => {
            const roomData = { name: 'Test Room', description: 'A room for testing' };
            const createdRoom = { id: 1, ...roomData, creator_id: mockUser.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
            
            chatModel.createRoom.mockResolvedValue(createdRoom);
            chatModel.addUserToRoom.mockResolvedValue({ success: true }); // Mock adding creator to room

            const res = await request(app)
                .post('/api/rooms')
                .send(roomData);

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('id', 1);
            expect(res.body).toHaveProperty('name', roomData.name);
            expect(chatModel.createRoom).toHaveBeenCalledWith(roomData.name, roomData.description, mockUser.id);
            expect(chatModel.addUserToRoom).toHaveBeenCalledWith(mockUser.id, createdRoom.id);
        });

        it('should return 400 if room name is missing', async () => {
            const res = await request(app)
                .post('/api/rooms')
                .send({ description: 'Missing name' });
            
            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('message', 'Room name is required.');
        });
        
        it('should return 500 if createRoom model function fails', async () => {
            chatModel.createRoom.mockResolvedValue({ error: 'Database error' });
            const res = await request(app)
                .post('/api/rooms')
                .send({ name: 'Error Room' });

            expect(res.statusCode).toEqual(400); // Controller converts model error to 400 or 500
            expect(res.body).toHaveProperty('message', 'Database error');
        });
    });

    describe('GET /api/rooms (List Rooms)', () => {
        it('should return a list of rooms for an authenticated user', async () => {
            const roomsList = [
                { id: 1, name: 'Room Alpha', description: 'Alpha', creator_id: 1 },
                { id: 2, name: 'Room Beta', description: 'Beta', creator_id: 2 },
            ];
            chatModel.getAllRooms.mockResolvedValue(roomsList);

            const res = await request(app).get('/api/rooms');

            expect(res.statusCode).toEqual(200);
            expect(res.body).toBeInstanceOf(Array);
            expect(res.body.length).toBe(2);
            expect(res.body[0].name).toBe('Room Alpha');
            expect(chatModel.getAllRooms).toHaveBeenCalled();
        });
    });

    describe('POST /api/rooms/:roomId/members (Add User to Room)', () => {
        it('should allow room creator to add a user to their room', async () => {
            const roomId = 1;
            const userIdToAdd = 3;
            // Mock verifyToken to set req.user to the room creator (mockUser.id = 1)
            // This is already default setup in beforeEach
            
            // Mock getRoomById to return the room, with creatorId matching mockUser.id
            chatModel.getRoomById.mockResolvedValue({ id: roomId, name: 'Test Room', creatorId: mockUser.id });
            // Mock findUserById for the user being added
            userModel.findUserById.mockResolvedValue({ id: userIdToAdd, username: 'userToAdd' });
            // Mock addUserToRoom to indicate success
            chatModel.addUserToRoom.mockResolvedValue({ success: true, user_id: userIdToAdd, room_id: roomId });

            const res = await request(app)
                .post(`/api/rooms/${roomId}/members`)
                .send({ userId: userIdToAdd });

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('message', 'User added to room successfully.');
            expect(chatModel.getRoomById).toHaveBeenCalledWith(roomId);
            expect(userModel.findUserById).toHaveBeenCalledWith(userIdToAdd);
            expect(chatModel.addUserToRoom).toHaveBeenCalledWith(userIdToAdd, roomId);
        });

        it('should allow admin to add a user to any room', async () => {
            const roomId = 1;
            const userIdToAdd = 3;

            // Change the current user to be an admin for this test
            require('../../authMiddleware').verifyToken.mockImplementation((req, res, next) => {
                req.user = mockAdminUser; // Use admin user
                next();
            });
             require('../../authMiddleware').isAdmin.mockImplementation((req, res, next) => {
                // Simulate admin for this specific test if the global mock isn't enough
                if (req.user && req.user.roles.includes('admin')) next();
                else res.status(403).json({ message: 'Forbidden: Admin access required (test-specific mock).' });
            });


            chatModel.getRoomById.mockResolvedValue({ id: roomId, name: 'Another Room', creator_id: 99 }); // Room created by someone else
            userModel.findUserById.mockResolvedValue({ id: userIdToAdd, username: 'userToAdd' });
            chatModel.addUserToRoom.mockResolvedValue({ success: true, user_id: userIdToAdd, room_id: roomId });

            const res = await request(app)
                .post(`/api/rooms/${roomId}/members`)
                .send({ userId: userIdToAdd });
            
            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('message', 'User added to room successfully.');
        });


        it('should return 403 if a non-creator/non-admin tries to add a user', async () => {
            const roomId = 1;
            const userIdToAdd = 3;
            
            // req.user is mockUser (id=1)
            // Room is created by someone else (creator_id=5)
            chatModel.getRoomById.mockResolvedValue({ id: roomId, name: 'Private Room', creator_id: 5 }); 
            
            const res = await request(app)
                .post(`/api/rooms/${roomId}/members`)
                .send({ userId: userIdToAdd });

            expect(res.statusCode).toEqual(403);
            expect(res.body).toHaveProperty('message', 'Forbidden: Only room creator or admin can add members.');
        });
        
        it('should return 404 if room not found', async () => {
            chatModel.getRoomById.mockResolvedValue(null);
            const res = await request(app)
                .post('/api/rooms/999/members')
                .send({ userId: 3 });
            expect(res.statusCode).toEqual(404);
            expect(res.body).toHaveProperty('message', 'Room not found.');
        });

        it('should return 404 if user to add not found', async () => {
            const roomId = 1;
            chatModel.getRoomById.mockResolvedValue({ id: roomId, name: 'Test Room', creatorId: mockUser.id });
            userModel.findUserById.mockResolvedValue(null); // User to add does not exist

            const res = await request(app)
                .post(`/api/rooms/${roomId}/members`)
                .send({ userId: 999 });
            expect(res.statusCode).toEqual(404);
            expect(res.body).toHaveProperty('message', 'User to add not found.');
        });
    });
    
    // Add more tests for other chat routes (GET /:roomId, PUT /:roomId, DELETE /:roomId, DELETE /:roomId/members/:userId, GET /:roomId/members)
    // following similar patterns.
});
