const chatModel = require('../../models/chatModel');
const db = require('../../db'); // This will automatically be the mock from __mocks__/db.js
jest.mock('../../db'); // Ensures the manual mock from __mocks__/db.js is used.

// Mock the ChatRoom and Message classes if their methods were complex.
// For now, they are simple constructors.

describe('Chat Model', () => {
    beforeEach(() => {
        db.reset(); // Reset db mock before each test
    });

    // --- ChatRoom Operations ---
    describe('createRoom', () => {
        it('should create a new chat room and return it', async () => {
            const roomData = { id: 1, name: 'General Room', description: 'General discussion', creator_id: 1, created_at: new Date(), updated_at: new Date() };
            db.query.mockResolvedValueOnce({ rows: [roomData] });

            const newRoom = await chatModel.createRoom('General Room', 'General discussion', 1);

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO chat_rooms'),
                ['General Room', 'General discussion', 1]
            );
            expect(newRoom).toBeInstanceOf(chatModel.ChatRoom);
            expect(newRoom.name).toBe('General Room');
            expect(newRoom.creatorId).toBe(1);
        });

        it('should handle database errors during room creation', async () => {
            db.query.mockRejectedValueOnce(new Error('DB error'));
            const result = await chatModel.createRoom('Error Room', 'Test', 1);
            expect(result.error).toBe('Database error creating room.');
        });
    });

    describe('getRoomById', () => {
        it('should return a room if found', async () => {
            const roomData = { id: 1, name: 'Test Room', description: 'A test room', creator_id: 1 };
            db.query.mockResolvedValueOnce({ rows: [roomData] });

            const room = await chatModel.getRoomById(1);
            expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT id, name, description, creator_id, created_at, updated_at FROM chat_rooms WHERE id = $1'), [1]);
            expect(room).toBeInstanceOf(chatModel.ChatRoom);
            expect(room.id).toBe(1);
        });

        it('should return null if room not found', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });
            const room = await chatModel.getRoomById(999);
            expect(room).toBeNull();
        });
    });

    describe('updateRoom', () => {
        it('should update an existing room and return it', async () => {
            const updatedRoomData = { id: 1, name: 'Updated Room Name', description: 'Updated desc', creator_id: 1 };
            db.query.mockResolvedValueOnce({ rows: [updatedRoomData] });

            const updatedRoom = await chatModel.updateRoom(1, 'Updated Room Name', 'Updated desc');
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE chat_rooms'),
                ['Updated Room Name', 'Updated desc', 1]
            );
            expect(updatedRoom).toBeInstanceOf(chatModel.ChatRoom);
            expect(updatedRoom.name).toBe('Updated Room Name');
        });

        it('should return error if room to update is not found', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });
            const result = await chatModel.updateRoom(99, 'NonExistent', 'Test');
            expect(result.error).toBe('Room not found or no changes made.');
        });
    });

    describe('deleteRoom', () => {
        it('should return success message on deletion', async () => {
            db.query.mockResolvedValueOnce({ rows: [{id: 1, name: 'Old Room'}] });
            const result = await chatModel.deleteRoom(1);
            expect(db.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM chat_rooms WHERE id = $1 RETURNING id, name'), [1]);
            expect(result.message).toBe('Room deleted successfully.');
            expect(result.id).toBe(1);
        });

        it('should return error if room to delete is not found', async () => {
             db.query.mockResolvedValueOnce({ rows: [] });
            const result = await chatModel.deleteRoom(99);
            expect(result.error).toBe('Room not found.');
        });
    });
    
    describe('getAllRooms', () => {
        it('should return all rooms', async () => {
            const roomsData = [{ id: 1, name: 'Room A' }, { id: 2, name: 'Room B' }];
            db.query.mockResolvedValueOnce({ rows: roomsData });
            const rooms = await chatModel.getAllRooms();
            expect(rooms).toHaveLength(2);
            expect(rooms[0].name).toBe('Room A');
            expect(rooms[0]).toBeInstanceOf(chatModel.ChatRoom);
        });
    });


    // --- ChatRoomMember Operations ---
    describe('addUserToRoom', () => {
        it('should add a user to a room successfully', async () => {
            const membershipData = { id: 1, user_id: 1, room_id: 1, joined_at: new Date() };
            db.query.mockResolvedValueOnce({ rows: [membershipData] });
            const result = await chatModel.addUserToRoom(1, 1);
            expect(db.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO chat_room_members'), [1, 1]);
            expect(result.user_id).toBe(1);
            expect(result.room_id).toBe(1);
        });
         it('should return error if user already in room (unique constraint)', async () => {
            const dbError = new Error('unique_violation');
            dbError.code = '23505';
            db.query.mockRejectedValueOnce(dbError);
            const result = await chatModel.addUserToRoom(1,1);
            expect(result.error).toBe('User already in this room.');
        });
    });
    
    describe('removeUserFromRoom', () => {
        it('should remove a user from a room successfully', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 1 }]}); // Indicates 1 row affected
            const result = await chatModel.removeUserFromRoom(1,1);
            expect(result.message).toBe('User removed from room successfully.');
        });
        it('should return error if user or room mapping not found', async () => {
            db.query.mockResolvedValueOnce({ rows: [] }); // Indicates 0 rows affected
            const result = await chatModel.removeUserFromRoom(1,1);
            expect(result.error).toBe('User not found in this room or mapping does not exist.');
        });
    });

    describe('getUsersInRoom', () => {
        it('should return list of users in a room', async () => {
            const usersData = [{ id: 1, username: 'User1' }, { id: 2, username: 'User2' }];
            db.query.mockResolvedValueOnce({ rows: usersData });
            const users = await chatModel.getUsersInRoom(1);
            expect(users).toHaveLength(2);
            expect(users[0].username).toBe('User1');
        });
    });
    
    describe('getRoomsForUser', () => {
        it('should return list of rooms for a user', async () => {
            const roomsData = [{ id: 1, name: 'RoomX' }, { id: 2, name: 'RoomY' }];
            db.query.mockResolvedValueOnce({ rows: roomsData });
            const rooms = await chatModel.getRoomsForUser(1);
            expect(rooms).toHaveLength(2);
            expect(rooms[0].name).toBe('RoomX');
            expect(rooms[0]).toBeInstanceOf(chatModel.ChatRoom);
        });
    });

    // --- Message Operations ---
    describe('sendMessage', () => {
        it('should send a room message and return it', async () => {
            const messageData = { id: 1, sender_id: 1, room_id: 1, receiver_id: null, content: 'Hello Room!', message_type: 'text', created_at: new Date() };
            db.query.mockResolvedValueOnce({ rows: [messageData] });

            const newMessage = await chatModel.sendMessage(1, 'Hello Room!', 1, null, 'text');
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO messages'),
                [1, 1, null, 'Hello Room!', 'text']
            );
            expect(newMessage).toBeInstanceOf(chatModel.Message);
            expect(newMessage.content).toBe('Hello Room!');
            expect(newMessage.roomId).toBe(1);
        });

        it('should send a direct message and return it', async () => {
            const messageData = { id: 2, sender_id: 1, room_id: null, receiver_id: 2, content: 'Hello User!', message_type: 'text', created_at: new Date() };
            db.query.mockResolvedValueOnce({ rows: [messageData] });

            const newMessage = await chatModel.sendMessage(1, 'Hello User!', null, 2, 'text');
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO messages'),
                [1, null, 2, 'Hello User!', 'text']
            );
            expect(newMessage).toBeInstanceOf(chatModel.Message);
            expect(newMessage.receiverId).toBe(2);
        });

        it('should return error if both roomId and receiverId are null', async () => {
            const result = await chatModel.sendMessage(1, 'Test', null, null);
            expect(result.error).toBe('Message must have a room_id or a receiver_id.');
        });
        
        it('should return error if both roomId and receiverId are provided', async () => {
            const result = await chatModel.sendMessage(1, 'Test', 1, 2);
            expect(result.error).toBe('Message cannot have both room_id and receiver_id.');
        });
        
        it('should return error on foreign key violation (e.g. invalid sender/room/receiver ID)', async () => {
            const dbError = new Error('foreign_key_violation');
            dbError.code = '23503';
            db.query.mockRejectedValueOnce(dbError);
            const result = await chatModel.sendMessage(999, 'Test', 1); // Assume sender 999 doesn't exist
            expect(result.error).toBe('Invalid sender, room or receiver ID.');
        });
    });

    describe('getMessageById', () => {
        it('should return a message with sender username if found', async () => {
            const msgData = { id: 1, content: 'Test Msg', sender_id: 1, sender_username: 'User1' };
            db.query.mockResolvedValueOnce({ rows: [msgData] });
            const message = await chatModel.getMessageById(1);
            expect(message.content).toBe('Test Msg');
            expect(message.senderUsername).toBe('User1');
        });
         it('should return null if message not found', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });
            const message = await chatModel.getMessageById(999);
            expect(message).toBeNull();
        });
    });

    describe('getMessagesForRoom', () => {
        it('should return messages for a room with sender usernames', async () => {
            const messagesData = [
                { id: 1, content: 'Msg1', sender_id: 1, sender_username: 'User1' },
                { id: 2, content: 'Msg2', sender_id: 2, sender_username: 'User2' },
            ];
            db.query.mockResolvedValueOnce({ rows: messagesData });
            const messages = await chatModel.getMessagesForRoom(1, 10, 0);
            expect(db.query).toHaveBeenCalledWith(expect.stringContaining('FROM messages m'), [1, 10, 0]);
            expect(messages).toHaveLength(2);
            expect(messages[0].senderUsername).toBe('User1');
        });
    });

    describe('getDirectMessages', () => {
        it('should return direct messages between two users with sender usernames', async () => {
            const messagesData = [
                { id: 1, content: 'DM1', sender_id: 1, receiver_id: 2, sender_username: 'User1' },
                { id: 2, content: 'DM2', sender_id: 2, receiver_id: 1, sender_username: 'User2' },
            ];
            db.query.mockResolvedValueOnce({ rows: messagesData });
            const messages = await chatModel.getDirectMessages(1, 2, 10, 0);
            expect(db.query).toHaveBeenCalledWith(expect.stringContaining('WHERE (m.sender_id = $1 AND m.receiver_id = $2) OR (m.sender_id = $2 AND m.receiver_id = $1)'), [1, 2, 10, 0]);
            expect(messages).toHaveLength(2);
            expect(messages[0].senderUsername).toBe('User1');
        });
    });
});
