const db = require('../db');

class Department {
    constructor(id, name, description, createdAt, updatedAt) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}

// Create a new department
const createDepartment = async (name, description) => {
    const query = `
        INSERT INTO departments (name, description)
        VALUES ($1, $2)
        RETURNING id, name, description, created_at, updated_at;
    `;
    try {
        const { rows } = await db.query(query, [name, description]);
        const dept = rows[0];
        return new Department(dept.id, dept.name, dept.description, dept.created_at, dept.updated_at);
    } catch (error) {
        console.error('Error creating department:', error);
        if (error.code === '23505' && error.constraint === 'departments_name_key') {
            return { error: 'Department name already exists.' };
        }
        return { error: 'Database error creating department.' };
    }
};

// Get a department by its ID
const getDepartmentById = async (id) => {
    const query = 'SELECT id, name, description, created_at, updated_at FROM departments WHERE id = $1;';
    try {
        const { rows } = await db.query(query, [id]);
        if (rows.length > 0) {
            const dept = rows[0];
            return new Department(dept.id, dept.name, dept.description, dept.created_at, dept.updated_at);
        }
        return null;
    } catch (error) {
        console.error('Error getting department by ID:', error);
        return { error: 'Database error retrieving department.' };
    }
};

// Get a department by its name
const getDepartmentByName = async (name) => {
    const query = 'SELECT id, name, description, created_at, updated_at FROM departments WHERE name = $1;';
    try {
        const { rows } = await db.query(query, [name]);
        if (rows.length > 0) {
            const dept = rows[0];
            return new Department(dept.id, dept.name, dept.description, dept.created_at, dept.updated_at);
        }
        return null;
    } catch (error) {
        console.error('Error getting department by name:', error);
        return { error: 'Database error retrieving department.' };
    }
};

// Update an existing department
const updateDepartment = async (id, name, description) => {
    const query = `
        UPDATE departments
        SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING id, name, description, created_at, updated_at;
    `;
    try {
        const { rows } = await db.query(query, [name, description, id]);
        if (rows.length > 0) {
            const dept = rows[0];
            return new Department(dept.id, dept.name, dept.description, dept.created_at, dept.updated_at);
        }
        return { error: 'Department not found or no changes made.' }; // Or return null if not found
    } catch (error) {
        console.error('Error updating department:', error);
        if (error.code === '23505' && error.constraint === 'departments_name_key') {
            return { error: 'Department name already exists.' };
        }
        return { error: 'Database error updating department.' };
    }
};

// Delete a department by its ID
const deleteDepartment = async (id) => {
    const query = 'DELETE FROM departments WHERE id = $1 RETURNING id, name;';
    try {
        const { rows } = await db.query(query, [id]);
        if (rows.length > 0) {
            return { message: 'Department deleted successfully.', id: rows[0].id, name: rows[0].name };
        }
        return { error: 'Department not found.' };
    } catch (error) {
        console.error('Error deleting department:', error);
        return { error: 'Database error deleting department.' };
    }
};

// List all departments
const getAllDepartments = async () => {
    const query = 'SELECT id, name, description, created_at, updated_at FROM departments ORDER BY name;';
    try {
        const { rows } = await db.query(query);
        return rows.map(dept => new Department(dept.id, dept.name, dept.description, dept.created_at, dept.updated_at));
    } catch (error) {
        console.error('Error listing all departments:', error);
        return { error: 'Database error retrieving departments.' };
    }
};

// --- User Department Mappings ---

// Add a user to a department
const addUserToDepartment = async (userId, departmentId) => {
    const query = `
        INSERT INTO user_department_mappings (user_id, department_id)
        VALUES ($1, $2)
        RETURNING id, user_id, department_id;
    `;
    try {
        const { rows } = await db.query(query, [userId, departmentId]);
        return rows[0];
    } catch (error) {
        console.error('Error adding user to department:', error);
        if (error.code === '23505') { // unique_violation
            return { error: 'User already in this department.' };
        }
        if (error.code === '23503') { // foreign_key_violation
            return { error: 'User or Department ID not found.' };
        }
        return { error: 'Database error adding user to department.' };
    }
};

// Remove a user from a department
const removeUserFromDepartment = async (userId, departmentId) => {
    const query = 'DELETE FROM user_department_mappings WHERE user_id = $1 AND department_id = $2 RETURNING id;';
    try {
        const { rows } = await db.query(query, [userId, departmentId]);
        if (rows.length > 0) {
            return { message: 'User removed from department successfully.' };
        }
        return { error: 'User not found in this department or mapping does not exist.' };
    } catch (error) {
        console.error('Error removing user from department:', error);
        return { error: 'Database error removing user from department.' };
    }
};

// Get all users in a specific department
const getUsersInDepartment = async (departmentId) => {
    const query = `
        SELECT u.id, u.username, u.email, u.roles, u.created_at
        FROM users u
        JOIN user_department_mappings udm ON u.id = udm.user_id
        WHERE udm.department_id = $1
        ORDER BY u.username;
    `;
    try {
        const { rows } = await db.query(query, [departmentId]);
        return rows; // Returns array of user objects (without sensitive info like password)
    } catch (error) {
        console.error('Error getting users in department:', error);
        return { error: 'Database error retrieving users in department.' };
    }
};

// Get all departments for a specific user
const getDepartmentsForUser = async (userId) => {
    const query = `
        SELECT d.id, d.name, d.description, d.created_at, d.updated_at
        FROM departments d
        JOIN user_department_mappings udm ON d.id = udm.department_id
        WHERE udm.user_id = $1
        ORDER BY d.name;
    `;
    try {
        const { rows } = await db.query(query, [userId]);
        return rows.map(dept => new Department(dept.id, dept.name, dept.description, dept.created_at, dept.updated_at));
    } catch (error) {
        console.error('Error getting departments for user:', error);
        return { error: 'Database error retrieving departments for user.' };
    }
};


module.exports = {
    createDepartment,
    getDepartmentById,
    getDepartmentByName,
    updateDepartment,
    deleteDepartment,
    getAllDepartments,
    addUserToDepartment,
    removeUserFromDepartment,
    getUsersInDepartment,
    getDepartmentsForUser,
    Department
};
