const express = require('express');
const departmentModel = require('../models/departmentModel');
const userModel = require('../userModel'); // For validating user existence
const { verifyToken, isAdmin, hasRole } = require('../authMiddleware');

const router = express.Router();

// --- Department Management ---

// POST /api/departments (Create department, admin only)
router.post('/', verifyToken, isAdmin, async (req, res) => {
    const { name, description } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'Department name is required.' });
    }
    try {
        const result = await departmentModel.createDepartment(name, description || null);
        if (result.error) {
            if (result.error.includes('already exists')) {
                return res.status(409).json({ message: result.error });
            }
            return res.status(400).json({ message: result.error });
        }
        res.status(201).json(result);
    } catch (error) {
        console.error('Error creating department:', error);
        res.status(500).json({ message: 'Failed to create department.' });
    }
});

// GET /api/departments (List all departments)
router.get('/', verifyToken, async (req, res) => {
    try {
        const departments = await departmentModel.getAllDepartments();
        if (departments.error) {
            return res.status(500).json({ message: departments.error });
        }
        res.status(200).json(departments);
    } catch (error) {
        console.error('Error listing departments:', error);
        res.status(500).json({ message: 'Failed to list departments.' });
    }
});

// GET /api/departments/:id (Get department by ID)
router.get('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    if (isNaN(parseInt(id))) {
        return res.status(400).json({ message: 'Invalid department ID format.' });
    }
    try {
        const department = await departmentModel.getDepartmentById(parseInt(id));
        if (!department) {
            return res.status(404).json({ message: 'Department not found.' });
        }
        if (department.error) {
            return res.status(500).json({ message: department.error });
        }
        res.status(200).json(department);
    } catch (error) {
        console.error('Error getting department by ID:', error);
        res.status(500).json({ message: 'Failed to get department.' });
    }
});

// PUT /api/departments/:id (Update department, admin only)
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    if (isNaN(parseInt(id))) {
        return res.status(400).json({ message: 'Invalid department ID format.' });
    }
    if (!name) {
        return res.status(400).json({ message: 'Department name is required for update.' });
    }
    try {
        const result = await departmentModel.updateDepartment(parseInt(id), name, description || null);
        if (result.error) {
            if (result.error.includes('not found')) {
                return res.status(404).json({ message: result.error });
            }
            if (result.error.includes('already exists')) {
                return res.status(409).json({ message: result.error });
            }
            return res.status(400).json({ message: result.error });
        }
        res.status(200).json(result);
    } catch (error) {
        console.error('Error updating department:', error);
        res.status(500).json({ message: 'Failed to update department.' });
    }
});

// DELETE /api/departments/:id (Delete department, admin only)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    if (isNaN(parseInt(id))) {
        return res.status(400).json({ message: 'Invalid department ID format.' });
    }
    try {
        const result = await departmentModel.deleteDepartment(parseInt(id));
        if (result.error) {
            if (result.error.includes('not found')) {
                return res.status(404).json({ message: result.error });
            }
            return res.status(400).json({ message: result.error });
        }
        res.status(200).json(result); // Or res.status(204).send();
    } catch (error) {
        console.error('Error deleting department:', error);
        res.status(500).json({ message: 'Failed to delete department.' });
    }
});

// --- User-Department Assignment ---

// POST /api/departments/:id/users (Add user to department, admin only; req.body: { userId })
router.post('/:id/users', verifyToken, isAdmin, async (req, res) => {
    const { id: departmentId } = req.params;
    const { userId } = req.body;

    if (isNaN(parseInt(departmentId)) || isNaN(parseInt(userId))) {
        return res.status(400).json({ message: 'Invalid department or user ID format.' });
    }
    try {
        // Validate department exists
        const department = await departmentModel.getDepartmentById(parseInt(departmentId));
        if (!department || department.error) {
            return res.status(404).json({ message: 'Department not found.' });
        }
        // Validate user exists
        const user = await userModel.findUserById(parseInt(userId));
        if (!user || user.error) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const result = await departmentModel.addUserToDepartment(parseInt(userId), parseInt(departmentId));
        if (result.error) {
             if (result.error.includes('already in')) {
                return res.status(409).json({ message: result.error });
            }
            return res.status(400).json({ message: result.error });
        }
        res.status(201).json({ message: 'User added to department successfully.', data: result });
    } catch (error) {
        console.error('Error adding user to department:', error);
        res.status(500).json({ message: 'Failed to add user to department.' });
    }
});

// DELETE /api/departments/:departmentId/users/:userId (Remove user from department, admin only)
router.delete('/:departmentId/users/:userId', verifyToken, isAdmin, async (req, res) => {
    const { departmentId, userId } = req.params;
    if (isNaN(parseInt(departmentId)) || isNaN(parseInt(userId))) {
        return res.status(400).json({ message: 'Invalid department or user ID format.' });
    }
    try {
        const result = await departmentModel.removeUserFromDepartment(parseInt(userId), parseInt(departmentId));
        if (result.error) {
             if (result.error.includes('not found')) {
                return res.status(404).json({ message: result.error });
            }
            return res.status(400).json({ message: result.error });
        }
        res.status(200).json(result);
    } catch (error) {
        console.error('Error removing user from department:', error);
        res.status(500).json({ message: 'Failed to remove user from department.' });
    }
});

// GET /api/departments/:id/users (List users in a department)
router.get('/:id/users', verifyToken, async (req, res) => {
    const { id: departmentId } = req.params;
    if (isNaN(parseInt(departmentId))) {
        return res.status(400).json({ message: 'Invalid department ID format.' });
    }
    try {
        // Validate department exists
        const department = await departmentModel.getDepartmentById(parseInt(departmentId));
        if (!department || department.error) {
            return res.status(404).json({ message: 'Department not found.' });
        }

        const users = await departmentModel.getUsersInDepartment(parseInt(departmentId));
        if (users.error) {
            return res.status(500).json({ message: users.error });
        }
        res.status(200).json(users);
    } catch (error) {
        console.error('Error listing users in department:', error);
        res.status(500).json({ message: 'Failed to list users in department.' });
    }
});

module.exports = router;
