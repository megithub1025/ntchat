const express = require('express');
const chatModel = require('../models/chatModel');
const userModel = require('../userModel'); // For validating user existence
const { verifyToken, isAdmin, hasRole } = require('../authMiddleware');

const router = express.Router();

// --- Chat Room Management ---

// POST /api/rooms (Create room; authenticated user)
router.post('/', verifyToken, async (req, res) => {
    const { name, description } = req.body;
    const creatorId = req.user.id; // from verifyToken middleware

    if (!name) {
        return res.status(400).json({ message: 'Room name is required.' });
    }

    try {
        const room = await chatModel.createRoom(name, description || null, creatorId);
        if (room.error) {
            return res.status(400).json({ message: room.error });
        }
        // Automatically add creator as a member
        await chatModel.addUserToRoom(creatorId, room.id);
        res.status(201).json(room);
    } catch (error) {
        console.error('Error creating room:', error);
        res.status(500).json({ message: 'Failed to create room.' });
    }
});

// GET /api/rooms (List all rooms - for now, can be refined later e.g. user's rooms)
router.get('/', verifyToken, async (req, res) => {
    try {
        // For now, lists all rooms. Could be changed to list rooms user is a member of.
        // const rooms = await chatModel.getRoomsForUser(req.user.id);
        const rooms = await chatModel.getAllRooms();
        if (rooms.error) {
            return res.status(500).json({ message: rooms.error });
        }
        res.status(200).json(rooms);
    } catch (error) {
        console.error('Error listing rooms:', error);
        res.status(500).json({ message: 'Failed to list rooms.' });
    }
});

// GET /api/rooms/:roomId (Get room details; authenticated user - ideally member or admin)
router.get('/:roomId', verifyToken, async (req, res) => {
    const { roomId } = req.params;
    if (isNaN(parseInt(roomId))) {
        return res.status(400).json({ message: 'Invalid room ID format.' });
    }
    try {
        const room = await chatModel.getRoomById(parseInt(roomId));
        if (!room || room.error) {
            return res.status(404).json({ message: 'Room not found.' });
        }

        // Optional: Check if user is a member or admin
        // const members = await chatModel.getUsersInRoom(parseInt(roomId));
        // const isMember = members.some(member => member.id === req.user.id);
        // if (!isMember && !req.user.roles.includes('admin')) {
        //     return res.status(403).json({ message: 'Forbidden: You are not a member of this room.' });
        // }

        res.status(200).json(room);
    } catch (error) {
        console.error('Error getting room details:', error);
        res.status(500).json({ message: 'Failed to get room details.' });
    }
});

// PUT /api/rooms/:roomId (Update room; room creator or admin)
router.put('/:roomId', verifyToken, async (req, res) => {
    const { roomId } = req.params;
    const { name, description } = req.body;
    const requestingUserId = req.user.id;
    const isAdminUser = req.user.roles.includes('admin');

    if (isNaN(parseInt(roomId))) {
        return res.status(400).json({ message: 'Invalid room ID format.' });
    }
    if (!name) {
        return res.status(400).json({ message: 'Room name is required for update.' });
    }

    try {
        const room = await chatModel.getRoomById(parseInt(roomId));
        if (!room || room.error) {
            return res.status(404).json({ message: 'Room not found.' });
        }

        // Authorization: Must be room creator or admin
        if (room.creatorId !== requestingUserId && !isAdminUser) {
            return res.status(403).json({ message: 'Forbidden: Only room creator or admin can update this room.' });
        }

        const updatedRoom = await chatModel.updateRoom(parseInt(roomId), name, description || null);
        if (updatedRoom.error) {
            return res.status(400).json({ message: updatedRoom.error });
        }
        res.status(200).json(updatedRoom);
    } catch (error) {
        console.error('Error updating room:', error);
        res.status(500).json({ message: 'Failed to update room.' });
    }
});

// DELETE /api/rooms/:roomId (Delete room; room creator or admin)
router.delete('/:roomId', verifyToken, async (req, res) => {
    const { roomId } = req.params;
    const requestingUserId = req.user.id;
    const isAdminUser = req.user.roles.includes('admin');

    if (isNaN(parseInt(roomId))) {
        return res.status(400).json({ message: 'Invalid room ID format.' });
    }

    try {
        const room = await chatModel.getRoomById(parseInt(roomId));
        if (!room || room.error) {
            return res.status(404).json({ message: 'Room not found.' });
        }

        // Authorization: Must be room creator or admin
        if (room.creatorId !== requestingUserId && !isAdminUser) {
            return res.status(403).json({ message: 'Forbidden: Only room creator or admin can delete this room.' });
        }

        const result = await chatModel.deleteRoom(parseInt(roomId));
        if (result.error) {
            return res.status(400).json({ message: result.error });
        }
        res.status(200).json(result); // Or res.status(204).send();
    } catch (error) {
        console.error('Error deleting room:', error);
        res.status(500).json({ message: 'Failed to delete room.' });
    }
});


// --- Chat Room Member Management ---

// POST /api/rooms/:roomId/members (Add user to room; req.body: { userId }; room creator/admin)
router.post('/:roomId/members', verifyToken, async (req, res) => {
    const { roomId } = req.params;
    const { userId: userIdToAdd } = req.body;
    const requestingUserId = req.user.id;
    const isAdminUser = req.user.roles.includes('admin');

    if (isNaN(parseInt(roomId)) || isNaN(parseInt(userIdToAdd))) {
        return res.status(400).json({ message: 'Invalid room or user ID format.' });
    }

    try {
        const room = await chatModel.getRoomById(parseInt(roomId));
        if (!room || room.error) {
            return res.status(404).json({ message: 'Room not found.' });
        }

        // Authorization: Must be room creator or admin
        if (room.creatorId !== requestingUserId && !isAdminUser) {
            return res.status(403).json({ message: 'Forbidden: Only room creator or admin can add members.' });
        }

        // Validate user to add exists
        const userToAdd = await userModel.findUserById(parseInt(userIdToAdd));
        if (!userToAdd || userToAdd.error) {
            return res.status(404).json({ message: 'User to add not found.' });
        }

        const result = await chatModel.addUserToRoom(parseInt(userIdToAdd), parseInt(roomId));
        if (result.error) {
            if (result.error.includes('already in')) {
                return res.status(409).json({ message: result.error });
            }
            return res.status(400).json({ message: result.error });
        }
        res.status(201).json({ message: 'User added to room successfully.', data: result });
    } catch (error) {
        console.error('Error adding user to room:', error);
        res.status(500).json({ message: 'Failed to add user to room.' });
    }
});

// DELETE /api/rooms/:roomId/members/:userId (Remove user from room; room creator/admin or self-removal)
router.delete('/:roomId/members/:userId', verifyToken, async (req, res) => {
    const { roomId, userId: userIdToRemove } = req.params;
    const requestingUserId = req.user.id;
    const isAdminUser = req.user.roles.includes('admin');

    if (isNaN(parseInt(roomId)) || isNaN(parseInt(userIdToRemove))) {
        return res.status(400).json({ message: 'Invalid room or user ID format.' });
    }
    
    const pRoomId = parseInt(roomId);
    const pUserIdToRemove = parseInt(userIdToRemove);

    try {
        const room = await chatModel.getRoomById(pRoomId);
        if (!room || room.error) {
            return res.status(404).json({ message: 'Room not found.' });
        }

        // Authorization: Room creator, admin, or user themselves can remove
        if (room.creatorId !== requestingUserId && !isAdminUser && pUserIdToRemove !== requestingUserId) {
            return res.status(403).json({ message: 'Forbidden: Only room creator, admin, or the user themselves can perform this action.' });
        }
        
        // Prevent room creator from being removed by others (unless admin is doing it, or creator removes self)
        if (room.creatorId === pUserIdToRemove && room.creatorId !== requestingUserId && !isAdminUser) {
             return res.status(403).json({ message: 'Forbidden: Room creator cannot be removed by other members.' });
        }


        const result = await chatModel.removeUserFromRoom(pUserIdToRemove, pRoomId);
        if (result.error) {
            if (result.error.includes('not found')) {
                return res.status(404).json({ message: result.error });
            }
            return res.status(400).json({ message: result.error });
        }
        res.status(200).json(result);
    } catch (error) {
        console.error('Error removing user from room:', error);
        res.status(500).json({ message: 'Failed to remove user from room.' });
    }
});

// GET /api/rooms/:roomId/members (List users in room; room member or admin)
router.get('/:roomId/members', verifyToken, async (req, res) => {
    const { roomId } = req.params;
    const requestingUserId = req.user.id;
    const isAdminUser = req.user.roles.includes('admin');
    
    if (isNaN(parseInt(roomId))) {
        return res.status(400).json({ message: 'Invalid room ID format.' });
    }
    const pRoomId = parseInt(roomId);

    try {
        const room = await chatModel.getRoomById(pRoomId);
        if (!room || room.error) {
            return res.status(404).json({ message: 'Room not found.' });
        }

        const members = await chatModel.getUsersInRoom(pRoomId);
        if (members.error) {
            return res.status(500).json({ message: members.error });
        }
        
        // Authorization: User must be a member or an admin to list members
        const isMember = members.some(member => member.id === requestingUserId);
        if (!isMember && !isAdminUser) {
            return res.status(403).json({ message: 'Forbidden: You must be a member of this room or an admin to view members.' });
        }

        res.status(200).json(members);
    } catch (error) {
        console.error('Error listing users in room:', error);
        res.status(500).json({ message: 'Failed to list users in room.' });
    }
});

module.exports = router;
