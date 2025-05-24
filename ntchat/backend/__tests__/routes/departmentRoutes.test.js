const request = require('supertest');
const app = require('../../server'); // Import the Express app
const departmentModel = require('../../models/departmentModel');
const userModel = require('../../userModel'); // For mocking user existence

// Mock authMiddleware
const mockUser = { id: 1, username: 'testuser', roles: ['user'] };
const mockAdminUser = { id: 2, username: 'adminuser', roles: ['user', 'admin'] };

jest.mock('../../authMiddleware', () => ({
    verifyToken: jest.fn((req, res, next) => {
        // Default to admin user for department routes as most are admin-only
        // Tests can override req.user by re-configuring the mock if a non-admin perspective is needed
        req.user = mockAdminUser; 
        next();
    }),
    isAdmin: jest.fn((req, res, next) => {
        if (req.user && req.user.roles.includes('admin')) {
            next();
        } else {
            res.status(403).json({ message: 'Forbidden: Admin access required (mock).' });
        }
    }),
    hasRole: jest.fn((rolesRequired) => (req, res, next) => { // Not heavily used in dept routes but good to have
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
jest.mock('../../models/departmentModel');
jest.mock('../../userModel'); // For POST /api/departments/:id/users endpoint

// Mock db for server.js startup
jest.mock('../../db', () => ({
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    getClient: jest.fn().mockResolvedValue({ query: jest.fn(), release: jest.fn() }),
    pool: { 
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        connect: jest.fn().mockResolvedValue({ query: jest.fn(), release: jest.fn() }) 
    }
}));

describe('Department API Endpoints (/api/departments)', () => {

    beforeEach(() => {
        departmentModel.createDepartment.mockReset();
        departmentModel.getAllDepartments.mockReset();
        departmentModel.getDepartmentById.mockReset();
        departmentModel.addUserToDepartment.mockReset();
        userModel.findUserById.mockReset(); // For user validation when adding to department

        // Ensure verifyToken is set to admin by default for these tests
        require('../../authMiddleware').verifyToken.mockImplementation((req, res, next) => {
            req.user = mockAdminUser;
            next();
        });
    });

    describe('POST /api/departments (Create Department)', () => {
        it('should create a new department successfully for an admin user', async () => {
            const deptData = { name: 'Finance', description: 'Handles finances' };
            const createdDept = { id: 1, ...deptData, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
            
            departmentModel.createDepartment.mockResolvedValue(createdDept);

            const res = await request(app)
                .post('/api/departments')
                .send(deptData);

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('id', 1);
            expect(res.body).toHaveProperty('name', deptData.name);
            expect(departmentModel.createDepartment).toHaveBeenCalledWith(deptData.name, deptData.description);
        });

        it('should return 403 if a non-admin user tries to create a department', async () => {
            // Override the verifyToken mock for this specific test
            require('../../authMiddleware').verifyToken.mockImplementationOnce((req, res, next) => {
                req.user = mockUser; // Use non-admin user
                next();
            });

            const deptData = { name: 'Test Dept by NonAdmin', description: 'Should fail' };
            const res = await request(app)
                .post('/api/departments')
                .send(deptData);
            
            expect(res.statusCode).toEqual(403);
            expect(res.body).toHaveProperty('message', 'Forbidden: Admin access required (mock).');
        });
        
        it('should return 400 if department name is missing', async () => {
            const res = await request(app)
                .post('/api/departments')
                .send({ description: 'No name here' });

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('message', 'Department name is required.');
        });

        it('should return 409 if department name already exists (model returns error)', async () => {
            departmentModel.createDepartment.mockResolvedValue({ error: 'Department name already exists.'});
            const res = await request(app)
                .post('/api/departments')
                .send({ name: 'Existing Dept', description: 'This should conflict' });
            
            expect(res.statusCode).toEqual(409);
            expect(res.body).toHaveProperty('message', 'Department name already exists.');
        });
    });

    describe('GET /api/departments (List Departments)', () => {
        it('should return a list of departments for an authenticated user (admin in this case)', async () => {
            const deptsList = [
                { id: 1, name: 'HR', description: 'Human Resources' },
                { id: 2, name: 'IT', description: 'Information Technology' },
            ];
            departmentModel.getAllDepartments.mockResolvedValue(deptsList);

            const res = await request(app).get('/api/departments');

            expect(res.statusCode).toEqual(200);
            expect(res.body).toBeInstanceOf(Array);
            expect(res.body.length).toBe(2);
            expect(res.body[0].name).toBe('HR');
            expect(departmentModel.getAllDepartments).toHaveBeenCalled();
        });
    });

    describe('POST /api/departments/:id/users (Add User to Department)', () => {
        it('should allow an admin to add a user to a department', async () => {
            const deptId = 1;
            const userIdToAdd = 5;

            departmentModel.getDepartmentById.mockResolvedValue({ id: deptId, name: 'Engineering' });
            userModel.findUserById.mockResolvedValue({ id: userIdToAdd, username: 'engineerPerson' });
            departmentModel.addUserToDepartment.mockResolvedValue({ success: true, user_id: userIdToAdd, department_id: deptId });

            const res = await request(app)
                .post(`/api/departments/${deptId}/users`)
                .send({ userId: userIdToAdd });

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('message', 'User added to department successfully.');
            expect(departmentModel.getDepartmentById).toHaveBeenCalledWith(deptId);
            expect(userModel.findUserById).toHaveBeenCalledWith(userIdToAdd);
            expect(departmentModel.addUserToDepartment).toHaveBeenCalledWith(userIdToAdd, deptId);
        });

        it('should return 403 if a non-admin tries to add a user to a department', async () => {
             require('../../authMiddleware').verifyToken.mockImplementationOnce((req, res, next) => {
                req.user = mockUser; // Use non-admin user
                next();
            });
            const res = await request(app)
                .post('/api/departments/1/users')
                .send({ userId: 5 });
            
            expect(res.statusCode).toEqual(403);
            expect(res.body).toHaveProperty('message', 'Forbidden: Admin access required (mock).');
        });

        it('should return 404 if department not found', async () => {
            departmentModel.getDepartmentById.mockResolvedValue(null);
            const res = await request(app)
                .post('/api/departments/999/users')
                .send({ userId: 5 });
            expect(res.statusCode).toEqual(404);
            expect(res.body).toHaveProperty('message', 'Department not found.');
        });
        
        it('should return 404 if user to add not found', async () => {
            departmentModel.getDepartmentById.mockResolvedValue({ id: 1, name: 'Engineering' });
            userModel.findUserById.mockResolvedValue(null);
            const res = await request(app)
                .post('/api/departments/1/users')
                .send({ userId: 999 });
            expect(res.statusCode).toEqual(404);
            expect(res.body).toHaveProperty('message', 'User not found.');
        });
    });
    
    // Add more tests for other department routes (GET /:id, PUT /:id, DELETE /:id, DELETE /:departmentId/users/:userId, GET /:id/users)
    // and also GET /api/users/:id/departments from userRoutes.js if time permits and supertest works.
});
