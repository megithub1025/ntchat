const socketio = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('./config');
const chatModel = require('./models/chatModel');
const userModel = require('./userModel'); // To fetch user details like username

const onlineUsers = new Map(); // Stores userId -> socketId

function initSocketIO(server) {
    const io = socketio(server, {
        cors: {
            origin: "*", // Adjust for your frontend URL in production
            methods: ["GET", "POST"]
        }
    });

    // Socket.IO Authentication Middleware
    io.use(async (socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error: Token not provided.'));
        }
        try {
            const decoded = jwt.verify(token, config.jwtSecret);
            // Attach user info to the socket object
            // We might want to fetch fresh user data, but JWT payload is often enough
            const user = await userModel.findUserById(decoded.userId);
            if (!user) {
                return next(new Error('Authentication error: User not found.'));
            }
            socket.user = {
                id: user.id,
                username: user.username,
                roles: user.roles
            };
            next();
        } catch (error) {
            console.error('Socket authentication error:', error.message);
            if (error.name === 'TokenExpiredError') {
                 return next(new Error('Authentication error: Token expired.'));
            }
            return next(new Error('Authentication error: Invalid token.'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.user.username} (ID: ${socket.user.id}, SocketID: ${socket.id})`);
        onlineUsers.set(socket.user.id.toString(), socket.id);

        // Handle chat events
        socket.on('joinRoom', async ({ roomId }, callback) => {
            try {
                // Optional: Validate if room exists and user has permission to join
                const room = await chatModel.getRoomById(roomId);
                if (!room || room.error) {
                    return callback({ status: 'error', message: 'Room not found.' });
                }
                // Optional: Check if user is already a member or add them
                // For now, just join the socket.io room
                socket.join(roomId.toString());
                console.log(`User ${socket.user.username} joined room ${roomId}`);
                // socket.to(roomId.toString()).emit('userJoined', { roomId, userId: socket.user.id, username: socket.user.username });
                if (typeof callback === 'function') {
                    callback({ status: 'ok', message: `Joined room ${roomId}` });
                }
            } catch (error) {
                console.error(`Error joining room ${roomId} for user ${socket.user.username}:`, error);
                if (typeof callback === 'function') {
                    callback({ status: 'error', message: 'Could not join room.' });
                }
            }
        });

        socket.on('leaveRoom', ({ roomId }, callback) => {
            try {
                socket.leave(roomId.toString());
                console.log(`User ${socket.user.username} left room ${roomId}`);
                // socket.to(roomId.toString()).emit('userLeft', { roomId, userId: socket.user.id, username: socket.user.username });
                 if (typeof callback === 'function') {
                    callback({ status: 'ok', message: `Left room ${roomId}` });
                }
            } catch (error) {
                console.error(`Error leaving room ${roomId} for user ${socket.user.username}:`, error);
                if (typeof callback === 'function') {
                    callback({ status: 'error', message: 'Could not leave room.' });
                }
            }
        });

        socket.on('sendMessage', async ({ roomId, content, messageType = 'text' }, callback) => {
            if (!roomId || !content) {
                return callback({ status: 'error', message: 'Room ID and content are required.' });
            }
            try {
                const persistedMessage = await chatModel.sendMessage(socket.user.id, content, roomId, null, messageType);
                if (persistedMessage.error) {
                    console.error('Error saving message to DB:', persistedMessage.error);
                    return callback({ status: 'error', message: persistedMessage.error });
                }
                
                // Enrich message with sender's username
                const fullMessage = {
                    ...persistedMessage,
                    sender_username: socket.user.username 
                };

                io.to(roomId.toString()).emit('newMessage', fullMessage);
                console.log(`Message from ${socket.user.username} to room ${roomId}: ${content}`);
                if (typeof callback === 'function') {
                    callback({ status: 'ok', message: 'Message sent.', data: fullMessage });
                }
            } catch (error) {
                console.error('Error sending room message:', error);
                if (typeof callback === 'function') {
                    callback({ status: 'error', message: 'Failed to send message.' });
                }
            }
        });

        socket.on('sendDirectMessage', async ({ receiverId, content, messageType = 'text' }, callback) => {
            if (!receiverId || !content) {
                 return callback({ status: 'error', message: 'Receiver ID and content are required.' });
            }
            if (receiverId.toString() === socket.user.id.toString()) {
                return callback({ status: 'error', message: 'Cannot send direct message to yourself.' });
            }

            try {
                const persistedMessage = await chatModel.sendMessage(socket.user.id, content, null, receiverId, messageType);
                if (persistedMessage.error) {
                    console.error('Error saving direct message to DB:', persistedMessage.error);
                    return callback({ status: 'error', message: persistedMessage.error });
                }

                // Enrich message with sender's username
                const fullMessage = {
                    ...persistedMessage,
                    sender_username: socket.user.username
                };

                const recipientSocketId = onlineUsers.get(receiverId.toString());
                if (recipientSocketId) {
                    io.to(recipientSocketId).emit('newDirectMessage', fullMessage);
                }
                // Also send to sender for UI update
                socket.emit('newDirectMessage', fullMessage); 
                
                console.log(`Direct message from ${socket.user.username} (ID: ${socket.user.id}) to user ID ${receiverId}: ${content}`);
                if (typeof callback === 'function') {
                    callback({ status: 'ok', message: 'Direct message sent.', data: fullMessage });
                }
            } catch (error) {
                console.error('Error sending direct message:', error);
                if (typeof callback === 'function') {
                    callback({ status: 'error', message: 'Failed to send direct message.' });
                }
            }
        });

        socket.on('disconnect', (reason) => {
            console.log(`User disconnected: ${socket.user.username} (ID: ${socket.user.id}, SocketID: ${socket.id}). Reason: ${reason}`);
            onlineUsers.delete(socket.user.id.toString());
            // Optional: Notify rooms the user was in
            // Example: iterate socket.rooms (excluding the socket.id room)
            // socket.rooms.forEach(room => {
            //    if(room !== socket.id) {
            //        socket.to(room).emit('userOffline', { roomId: room, userId: socket.user.id, username: socket.user.username });
            //    }
            // });
        });
    });

    return io;
}

module.exports = { initSocketIO, onlineUsers };
