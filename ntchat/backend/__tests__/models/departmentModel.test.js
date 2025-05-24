const departmentModel = require('../../models/departmentModel');
const db = require('../../db'); // This will be the mock from __mocks__/db.js due to jest.mock below
jest.mock('../../db'); // Ensures the manual mock from __mocks__/db.js is used.

// Mock the Department class if its methods were complex. For now, it's a simple constructor.
// jest.mock('../../models/departmentModel', () => {
//     const originalModule = jest.requireActual('../../models/departmentModel');
//     return {
//         ...originalModule,
//         // Department: jest.fn(), // If we needed to mock the class itself
//     };
// });

describe('Department Model', () => {
    beforeEach(() => {
        db.reset(); // Reset db mock before each test
    });

    describe('createDepartment', () => {
        it('should create a new department and return it', async () => {
            const deptData = { id: 1, name: 'Engineering', description: 'Handles all engineering tasks', created_at: new Date(), updated_at: new Date() };
            db.query.mockResolvedValueOnce({ rows: [deptData] });

            const newDept = await departmentModel.createDepartment('Engineering', 'Handles all engineering tasks');

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO departments'),
                ['Engineering', 'Handles all engineering tasks']
            );
            expect(newDept).toBeInstanceOf(departmentModel.Department);
            expect(newDept.name).toBe('Engineering');
        });

        it('should return { error: "Department name already exists." } on unique constraint violation', async () => {
            const dbError = new Error('duplicate key value violates unique constraint "departments_name_key"');
            dbError.code = '23505';
            dbError.constraint = 'departments_name_key';
            db.query.mockRejectedValueOnce(dbError);

            const result = await departmentModel.createDepartment('Engineering', 'Test');
            expect(result.error).toBe('Department name already exists.');
        });

        it('should handle generic database errors during department creation', async () => {
            db.query.mockRejectedValueOnce(new Error('DB error'));
            const result = await departmentModel.createDepartment('Finance', 'Test');
            expect(result.error).toBe('Database error creating department.');
        });
    });

    describe('getDepartmentById', () => {
        it('should return a department if found', async () => {
            const deptData = { id: 1, name: 'HR', description: 'Human Resources' };
            db.query.mockResolvedValueOnce({ rows: [deptData] });

            const dept = await departmentModel.getDepartmentById(1);
            expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT id, name, description, created_at, updated_at FROM departments WHERE id = $1'), [1]);
            expect(dept).toBeInstanceOf(departmentModel.Department);
            expect(dept.id).toBe(1);
        });

        it('should return null if department not found', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });
            const dept = await departmentModel.getDepartmentById(999);
            expect(dept).toBeNull();
        });

        it('should return { error: "Database error retrieving department." } on DB error', async () => {
            db.query.mockRejectedValueOnce(new Error('DB error'));
            const result = await departmentModel.getDepartmentById(1);
            expect(result.error).toBe('Database error retrieving department.');
        });
    });

    describe('updateDepartment', () => {
        it('should update an existing department and return it', async () => {
            const updatedDeptData = { id: 1, name: 'Engineering V2', description: 'Updated tasks' };
            db.query.mockResolvedValueOnce({ rows: [updatedDeptData] });

            const updatedDept = await departmentModel.updateDepartment(1, 'Engineering V2', 'Updated tasks');
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE departments'),
                ['Engineering V2', 'Updated tasks', 1]
            );
            expect(updatedDept).toBeInstanceOf(departmentModel.Department);
            expect(updatedDept.name).toBe('Engineering V2');
        });

        it('should return { error: "Department not found or no changes made." } if no rows affected', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });
            const result = await departmentModel.updateDepartment(99, 'NonExistent', 'Test');
            expect(result.error).toBe('Department not found or no changes made.');
        });
    });

    describe('deleteDepartment', () => {
        it('should return a success message and id/name upon successful deletion', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'TempDept' }] });
            const result = await departmentModel.deleteDepartment(1);
            expect(db.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM departments WHERE id = $1 RETURNING id, name'), [1]);
            expect(result.message).toBe('Department deleted successfully.');
            expect(result.id).toBe(1);
            expect(result.name).toBe('TempDept');
        });

        it('should return { error: "Department not found." } if department to delete is not found', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });
            const result = await departmentModel.deleteDepartment(99);
            expect(result.error).toBe('Department not found.');
        });
    });

    describe('getAllDepartments', () => {
        it('should return a list of all departments', async () => {
            const deptList = [
                { id: 1, name: 'Sales', description: 'Sales team' },
                { id: 2, name: 'Marketing', description: 'Marketing team' },
            ];
            db.query.mockResolvedValueOnce({ rows: deptList });
            const departments = await departmentModel.getAllDepartments();
            expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT id, name, description, created_at, updated_at FROM departments ORDER BY name'));
            expect(departments).toHaveLength(2);
            expect(departments[0].name).toBe('Sales');
            expect(departments[0]).toBeInstanceOf(departmentModel.Department);
        });
    });

    // --- User Department Mappings ---
    describe('addUserToDepartment', () => {
        it('should successfully add a user to a department', async () => {
            const mappingData = { id: 1, user_id: 1, department_id: 1 };
            db.query.mockResolvedValueOnce({ rows: [mappingData] });
            const result = await departmentModel.addUserToDepartment(1, 1);
            expect(db.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO user_department_mappings'), [1, 1]);
            expect(result.user_id).toBe(1);
            expect(result.department_id).toBe(1);
        });

        it('should return { error: "User already in this department." } on unique constraint violation', async () => {
            const dbError = new Error('duplicate key value violates unique constraint "user_department_mappings_user_id_department_id_key"');
            dbError.code = '23505';
            db.query.mockRejectedValueOnce(dbError);
            const result = await departmentModel.addUserToDepartment(1,1);
            expect(result.error).toBe('User already in this department.');
        });

        it('should return { error: "User or Department ID not found." } on foreign key constraint violation', async () => {
            const dbError = new Error('insert or update on table "user_department_mappings" violates foreign key constraint');
            dbError.code = '23503';
            db.query.mockRejectedValueOnce(dbError);
            const result = await departmentModel.addUserToDepartment(99,99); // Non-existent user/dept
            expect(result.error).toBe('User or Department ID not found.');
        });
    });

    describe('removeUserFromDepartment', () => {
        it('should return success message if user is removed', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Indicates one row was deleted
            const result = await departmentModel.removeUserFromDepartment(1, 1);
            expect(db.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM user_department_mappings WHERE user_id = $1 AND department_id = $2'), [1, 1]);
            expect(result.message).toBe('User removed from department successfully.');
        });

        it('should return error if mapping does not exist', async () => {
            db.query.mockResolvedValueOnce({ rows: [] }); // Indicates no row was deleted
            const result = await departmentModel.removeUserFromDepartment(1, 1);
            expect(result.error).toBe('User not found in this department or mapping does not exist.');
        });
    });

    describe('getUsersInDepartment', () => {
        it('should return a list of users in a department', async () => {
            const usersList = [{ id: 1, username: 'user1' }, { id: 2, username: 'user2' }];
            db.query.mockResolvedValueOnce({ rows: usersList });
            const users = await departmentModel.getUsersInDepartment(1);
            expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT u.id, u.username, u.email, u.roles, u.created_at'), [1]);
            expect(users).toHaveLength(2);
            expect(users[0].username).toBe('user1');
        });
    });

    describe('getDepartmentsForUser', () => {
        it('should return a list of departments for a user', async () => {
            const deptsList = [{ id: 1, name: 'DeptA' }, { id: 2, name: 'DeptB' }];
            db.query.mockResolvedValueOnce({ rows: deptsList });
            const departments = await departmentModel.getDepartmentsForUser(1);
            expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT d.id, d.name, d.description, d.created_at, d.updated_at'), [1]);
            expect(departments).toHaveLength(2);
            expect(departments[0].name).toBe('DeptA');
            expect(departments[0]).toBeInstanceOf(departmentModel.Department);
        });
    });
});
