import axios from 'axios';
import authService from './authService';

// Define the base URL for the API, consistent with authService.
const API_BASE_URL = 'http://localhost:3000/api';

// Create an axios instance that automatically includes the auth token.
const apiClient = axios.create({
    baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use(
    (config) => {
        const token = authService.getCurrentUserToken();
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

const chatService = {
    getRooms: async () => {
        try {
            const response = await apiClient.get('/rooms');
            return response.data;
        } catch (error) {
            console.error('Error fetching rooms:', error.response ? error.response.data : error.message);
            throw error.response ? error.response.data : new Error('Failed to fetch rooms');
        }
    },

    getMessages: async (roomId) => {
        if (!roomId) {
            console.error('Room ID is required to fetch messages.');
            return Promise.reject(new Error('Room ID is required'));
        }
        try {
            const response = await apiClient.get(`/rooms/${roomId}/messages`); // Assuming this is the backend endpoint
            // The backend needs an endpoint like GET /api/rooms/:roomId/messages
            // For now, we'll assume it exists or will be created.
            // If the API for fetching messages isn't ready, this will fail.
            // Let's simulate a fetch from the chatModel.getMessagesForRoom for now if not implemented
            // This part might need adjustment based on actual backend API for fetching messages.
            const response = await apiClient.get(`/rooms/${roomId}/messages`);
            // Ensure the response data is an array, default to empty array if not.
            return Array.isArray(response.data) ? response.data : [];
        } catch (error) {
            console.error(`Error fetching messages for room ${roomId}:`, error.response ? error.response.data : error.message);
            throw error.response ? error.response.data : new Error('Failed to fetch messages');
        }
    },

    // --- Organization Data Functions ---
    getUsers: async () => {
        try {
            const response = await apiClient.get('/users'); // Assuming backend endpoint /api/users exists
            return Array.isArray(response.data) ? response.data : [];
        } catch (error) {
            console.error('Error fetching users:', error.response ? error.response.data : error.message);
            throw error.response ? error.response.data : new Error('Failed to fetch users');
        }
    },

    getDepartments: async () => {
        try {
            const response = await apiClient.get('/departments');
            return Array.isArray(response.data) ? response.data : [];
        } catch (error) {
            console.error('Error fetching departments:', error.response ? error.response.data : error.message);
            throw error.response ? error.response.data : new Error('Failed to fetch departments');
        }
    },

    getDepartmentUsers: async (departmentId) => {
        if (!departmentId) {
            console.error('Department ID is required to fetch department users.');
            return Promise.reject(new Error('Department ID is required'));
        }
        try {
            const response = await apiClient.get(`/departments/${departmentId}/users`);
            return Array.isArray(response.data) ? response.data : [];
        } catch (error) {
            console.error(`Error fetching users for department ${departmentId}:`, error.response ? error.response.data : error.message);
            throw error.response ? error.response.data : new Error(`Failed to fetch users for department ${departmentId}`);
        }
    },
};

export default chatService;
