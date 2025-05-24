import { io } from 'socket.io-client';
import authService from './authService'; // To get token, though it's passed in connect()

// Define the base URL for the Socket.IO server.
const SOCKET_URL = 'http://localhost:3000'; // Adjust if your backend URL is different

let socket = null;

const socketService = {
    connect: (token) => {
        if (socket && socket.connected) {
            console.log('Socket.IO: Already connected.');
            return socket;
        }

        if (!token) {
            console.error('Socket.IO: No token provided for connection.');
            return null; // Or throw error
        }

        console.log('Socket.IO: Attempting to connect with token...');
        socket = io(SOCKET_URL, {
            auth: {
                token: token,
            },
            // Optional: additional configurations
            // transports: ['websocket'], // You can specify transports if needed
            // autoConnect: false, // Set to true if you want it to connect automatically without calling socket.connect() explicitly after init
        });

        socket.on('connect', () => {
            console.log('Socket.IO: Connected successfully. Socket ID:', socket.id);
        });

        socket.on('disconnect', (reason) => {
            console.log('Socket.IO: Disconnected. Reason:', reason);
            // Optional: handle specific disconnection reasons, e.g., server-side disconnect
            if (reason === 'io server disconnect') {
                // The server has forcefully disconnected the socket
                // You might want to try to reconnect or log the user out
                socket.connect(); // Or handle logout
            }
        });

        socket.on('connect_error', (error) => {
            console.error('Socket.IO: Connection Error.', error.message);
            if (error.message.includes('Authentication error')) {
                console.error('Socket.IO: Authentication failed. Logging out user.');
                authService.logout(); // If auth fails, logout user
                // Optionally redirect to login page
                // window.location.href = '/login';
            }
            // Other connection errors could be handled here too
        });
        
        // Example: Listening for a custom event from server after connection (optional)
        // socket.on('welcomeMessage', (data) => {
        //     console.log('Socket.IO: Received welcome message:', data);
        // });

        return socket;
    },

    disconnect: () => {
        if (socket) {
            console.log('Socket.IO: Disconnecting socket...');
            socket.disconnect();
            socket = null; // Clear the instance
        } else {
            console.log('Socket.IO: No active socket to disconnect.');
        }
    },

    getSocket: () => {
        if (!socket || !socket.connected) {
            // console.warn('Socket.IO: Socket not connected or not initialized. Attempting to reconnect if token exists.');
            // const token = authService.getCurrentUserToken();
            // if (token && !socket) { // Only try to reconnect if socket instance is null
            //     return socketService.connect(token);
            // }
            // It might be better to let the component attempting to get the socket handle reconnection logic
            // or ensure connect() is called appropriately.
        }
        return socket;
    },

    // Example: Emitting an event
    // sendMessage: (event, data) => {
    //     if (socket && socket.connected) {
    //         socket.emit(event, data);
    //     } else {
    //         console.error('Socket.IO: Cannot send message, socket not connected.');
    //     }
    // },

    // Example: Registering a handler for a specific event
    // on: (event, handler) => {
    //     if (socket) {
    //         socket.on(event, handler);
    //     } else {
    //         console.error('Socket.IO: Cannot register handler, socket not initialized.');
    //     }
    // },

    // Example: Unregistering a handler
    // off: (event, handler) => {
    //     if (socket) {
    //         socket.off(event, handler);
    //     } else {
    //         console.error('Socket.IO: Cannot unregister handler, socket not initialized.');
    //     }
    // }
};

export default socketService;
