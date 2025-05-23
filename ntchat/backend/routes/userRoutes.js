const express = require('express');
const departmentModel = require('../models/departmentModel');
const userModel = require('../userModel'); // For validating user existence
const { verifyToken, isAdmin } = require('../authMiddleware');

const router = express.Router();

// GET /api/users/:id/departments (List departments for a user)
// Protected: User can view their own departments, or admin can view any user's departments.
router.get('/:id/departments', verifyToken, async (req, res) => {
    const { id: targetUserId } = req.params;
    const requestingUserId = req.user.id; // from verifyToken middleware
    const isAdminUser = req.user.roles.includes('admin');

    if (isNaN(parseInt(targetUserId))) {
        return res.status(400).json({ message: 'Invalid user ID format.' });
    }

    // Authorization check: User must be the target user or an admin
    if (parseInt(targetUserId) !== requestingUserId && !isAdminUser) {
        return res.status(403).json({ message: 'Forbidden: You can only view your own departments or an admin can view any.' });
    }

    try {
        // Validate user exists
        const user = await userModel.findUserById(parseInt(targetUserId));
        if (!user || user.error) {
            return res.status(404).json({ message: 'Target user not found.' });
        }

        const departments = await departmentModel.getDepartmentsForUser(parseInt(targetUserId));
        if (departments.error) {
            return res.status(500).json({ message: departments.error });
        }
        res.status(200).json(departments);
    } catch (error) {
        console.error('Error listing departments for user:', error);
        res.status(500).json({ message: 'Failed to list departments for user.' });
    }
});

module.exports = router;
