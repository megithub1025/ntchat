const db = require('../db');

// --- ChatRoom Class ---
class ChatRoom {
    constructor(id, name, description, creatorId, createdAt, updatedAt) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.creatorId = creatorId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}

// --- Message Class ---
class Message {
    constructor(id, senderId, roomId, receiverId, messageType, content, createdAt) {
        this.id = id;
        this.senderId = senderId;
        this.roomId = roomId;
        this.receiverId = receiverId;
        this.messageType = messageType;
        this.content = content;
        this.createdAt = createdAt;
        // Add senderUsername for convenience, can be joined in queries
        this.senderUsername = null; 
    }
}

// --- ChatRoom Operations ---

// Create a new chat room
const createRoom = async (name, description, creatorId) => {
    const query = `
        INSERT INTO chat_rooms (name, description, creator_id)
        VALUES ($1, $2, $3)
        RETURNING id, name, description, creator_id, created_at, updated_at;
    `;
    try {
        const { rows } = await db.query(query, [name, description, creatorId]);
        const room = rows[0];
        return new ChatRoom(room.id, room.name, room.description, room.creator_id, room.created_at, room.updated_at);
    } catch (error) {
        console.error('Error creating room:', error);
        return { error: 'Database error creating room.' };
    }
};

// Get a chat room by its ID
const getRoomById = async (roomId) => {
    const query = 'SELECT id, name, description, creator_id, created_at, updated_at FROM chat_rooms WHERE id = $1;';
    try {
        const { rows } = await db.query(query, [roomId]);
        if (rows.length > 0) {
            const room = rows[0];
            return new ChatRoom(room.id, room.name, room.description, room.creator_id, room.created_at, room.updated_at);
        }
        return null;
    } catch (error) {
        console.error('Error getting room by ID:', error);
        return { error: 'Database error retrieving room.' };
    }
};

// Update an existing chat room
const updateRoom = async (roomId, name, description) => {
    const query = `
        UPDATE chat_rooms
        SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING id, name, description, creator_id, created_at, updated_at;
    `;
    try {
        const { rows } = await db.query(query, [name, description, roomId]);
        if (rows.length > 0) {
            const room = rows[0];
            return new ChatRoom(room.id, room.name, room.description, room.creator_id, room.created_at, room.updated_at);
        }
        return { error: 'Room not found or no changes made.' };
    } catch (error) {
        console.error('Error updating room:', error);
        return { error: 'Database error updating room.' };
    }
};

// Delete a chat room by its ID
const deleteRoom = async (roomId) => {
    // Note: ON DELETE CASCADE for chat_room_members and messages will handle cleanup
    const query = 'DELETE FROM chat_rooms WHERE id = $1 RETURNING id, name;';
    try {
        const { rows } = await db.query(query, [roomId]);
        if (rows.length > 0) {
            return { message: 'Room deleted successfully.', id: rows[0].id, name: rows[0].name };
        }
        return { error: 'Room not found.' };
    } catch (error) {
        console.error('Error deleting room:', error);
        return { error: 'Database error deleting room.' };
    }
};

// List all rooms (can be paginated later)
const getAllRooms = async () => {
    const query = 'SELECT id, name, description, creator_id, created_at, updated_at FROM chat_rooms ORDER BY created_at DESC;';
    try {
        const { rows } = await db.query(query);
        return rows.map(room => new ChatRoom(room.id, room.name, room.description, room.creator_id, room.created_at, room.updated_at));
    } catch (error) {
        console.error('Error listing all rooms:', error);
        return { error: 'Database error retrieving rooms.' };
    }
};


// --- ChatRoomMember Operations ---

// Add a user to a chat room
const addUserToRoom = async (userId, roomId) => {
    const query = `
        INSERT INTO chat_room_members (user_id, room_id)
        VALUES ($1, $2)
        RETURNING id, user_id, room_id, joined_at;
    `;
    try {
        const { rows } = await db.query(query, [userId, roomId]);
        return rows[0];
    } catch (error) {
        console.error('Error adding user to room:', error);
        if (error.code === '23505') { // unique_violation
            return { error: 'User already in this room.' };
        }
        if (error.code === '23503') { // foreign_key_violation
            return { error: 'User or Room ID not found.' };
        }
        return { error: 'Database error adding user to room.' };
    }
};

// Remove a user from a chat room
const removeUserFromRoom = async (userId, roomId) => {
    const query = 'DELETE FROM chat_room_members WHERE user_id = $1 AND room_id = $2 RETURNING id;';
    try {
        const { rows } = await db.query(query, [userId, roomId]);
        if (rows.length > 0) {
            return { message: 'User removed from room successfully.' };
        }
        return { error: 'User not found in this room or mapping does not exist.' };
    } catch (error) {
        console.error('Error removing user from room:', error);
        return { error: 'Database error removing user from room.' };
    }
};

// Get all users in a specific chat room
const getUsersInRoom = async (roomId) => {
    const query = `
        SELECT u.id, u.username, u.email -- Select user fields as needed
        FROM users u
        JOIN chat_room_members crm ON u.id = crm.user_id
        WHERE crm.room_id = $1
        ORDER BY u.username;
    `;
    try {
        const { rows } = await db.query(query, [roomId]);
        return rows;
    } catch (error) {
        console.error('Error getting users in room:', error);
        return { error: 'Database error retrieving users in room.' };
    }
};

// Get all rooms for a specific user
const getRoomsForUser = async (userId) => {
    const query = `
        SELECT cr.id, cr.name, cr.description, cr.creator_id, cr.created_at, cr.updated_at
        FROM chat_rooms cr
        JOIN chat_room_members crm ON cr.id = crm.room_id
        WHERE crm.user_id = $1
        ORDER BY cr.name;
    `;
    try {
        const { rows } = await db.query(query, [userId]);
        return rows.map(room => new ChatRoom(room.id, room.name, room.description, room.creator_id, room.created_at, room.updated_at));
    } catch (error) {
        console.error('Error getting rooms for user:', error);
        return { error: 'Database error retrieving rooms for user.' };
    }
};


// --- Message Operations ---

// Send a message (can be to a room or a direct message)
const sendMessage = async (senderId, content, roomId = null, receiverId = null, messageType = 'text') => {
    if (!roomId && !receiverId) {
        return { error: 'Message must have a room_id or a receiver_id.' };
    }
    if (roomId && receiverId) {
        return { error: 'Message cannot have both room_id and receiver_id.' };
    }

    const query = `
        INSERT INTO messages (sender_id, room_id, receiver_id, content, message_type)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, sender_id, room_id, receiver_id, message_type, content, created_at;
    `;
    try {
        const { rows } = await db.query(query, [senderId, roomId, receiverId, content, messageType]);
        const msg = rows[0];
        return new Message(msg.id, msg.sender_id, msg.room_id, msg.receiver_id, msg.message_type, msg.content, msg.created_at);
    } catch (error) {
        console.error('Error sending message:', error);
        if (error.code === '23503') { // foreign_key_violation (e.g. sender_id, room_id, receiver_id does not exist)
             return { error: 'Invalid sender, room or receiver ID.' };
        }
        return { error: 'Database error sending message.' };
    }
};

// Get a message by its ID
const getMessageById = async (messageId) => {
    const query = `
        SELECT m.id, m.sender_id, m.room_id, m.receiver_id, m.message_type, m.content, m.created_at, u.username as sender_username
        FROM messages m
        LEFT JOIN users u ON m.sender_id = u.id
        WHERE m.id = $1;
    `;
    try {
        const { rows } = await db.query(query, [messageId]);
        if (rows.length > 0) {
            const msg = rows[0];
            const messageObj = new Message(msg.id, msg.sender_id, msg.room_id, msg.receiver_id, msg.message_type, msg.content, msg.created_at);
            messageObj.senderUsername = msg.sender_username;
            return messageObj;
        }
        return null;
    } catch (error) {
        console.error('Error getting message by ID:', error);
        return { error: 'Database error retrieving message.' };
    }
};

// Get all messages for a specific chat room (paginated)
const getMessagesForRoom = async (roomId, limit = 50, offset = 0) => {
    const query = `
        SELECT m.id, m.sender_id, m.room_id, m.receiver_id, m.message_type, m.content, m.created_at, u.username as sender_username
        FROM messages m
        LEFT JOIN users u ON m.sender_id = u.id
        WHERE m.room_id = $1
        ORDER BY m.created_at DESC
        LIMIT $2 OFFSET $3;
    `;
    try {
        const { rows } = await db.query(query, [roomId, limit, offset]);
        return rows.map(msg => {
            const messageObj = new Message(msg.id, msg.sender_id, msg.room_id, msg.receiver_id, msg.message_type, msg.content, msg.created_at);
            messageObj.senderUsername = msg.sender_username;
            return messageObj;
        });
    } catch (error) {
        console.error('Error getting messages for room:', error);
        return { error: 'Database error retrieving messages for room.' };
    }
};

// Get direct messages between two users (paginated)
const getDirectMessages = async (userId1, userId2, limit = 50, offset = 0) => {
    const query = `
        SELECT m.id, m.sender_id, m.room_id, m.receiver_id, m.message_type, m.content, m.created_at, u.username as sender_username
        FROM messages m
        LEFT JOIN users u ON m.sender_id = u.id
        WHERE (m.sender_id = $1 AND m.receiver_id = $2) OR (m.sender_id = $2 AND m.receiver_id = $1)
        ORDER BY m.created_at DESC
        LIMIT $3 OFFSET $4;
    `;
    try {
        const { rows } = await db.query(query, [userId1, userId2, limit, offset]);
        return rows.map(msg => {
            const messageObj = new Message(msg.id, msg.sender_id, msg.room_id, msg.receiver_id, msg.message_type, msg.content, msg.created_at);
            messageObj.senderUsername = msg.sender_username;
            return messageObj;
        });
    } catch (error) {
        console.error('Error getting direct messages:', error);
        return { error: 'Database error retrieving direct messages.' };
    }
};

// Note: Update/Delete for messages are typically not implemented or restricted.
// For example, users might only be allowed to delete their own messages within a certain timeframe.
// For now, we'll omit update/delete for messages to keep it simple.

module.exports = {
    createRoom,
    getRoomById,
    updateRoom,
    deleteRoom,
    getAllRooms,
    addUserToRoom,
    removeUserFromRoom,
    getUsersInRoom,
    getRoomsForUser,
    sendMessage,
    getMessageById,
    getMessagesForRoom,
    getDirectMessages,
    ChatRoom,
    Message
};
