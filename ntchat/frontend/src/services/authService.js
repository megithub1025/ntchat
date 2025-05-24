import axios from 'axios';

// Define the base URL for the API.
// If your backend is running on a different port (e.g., 3000) and frontend on another (e.g., 5173),
// you'll need to handle CORS on the backend and use the full URL here,
// or set up a proxy in vite.config.js. For this example, we'll use the full URL.
const API_BASE_URL = 'http://localhost:3000/api'; // Adjust if your backend URL is different

const authService = {
    login: async (username, password) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/login`, {
                username,
                password,
            });
            if (response.data && response.data.token) {
                localStorage.setItem('ntchat_token', response.data.token);
                // Optionally store user details too, if needed frequently
                if (response.data.user) {
                    localStorage.setItem('ntchat_user', JSON.stringify(response.data.user));
                }
            }
            return response.data;
        } catch (error) {
            console.error('Login error:', error.response ? error.response.data : error.message);
            throw error.response ? error.response.data : new Error('Login failed');
        }
    },

    register: async (username, email, password, roles = ['user']) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/register`, {
                username,
                email,
                password,
                roles,
            });
            return response.data;
        } catch (error) {
            console.error('Registration error:', error.response ? error.response.data : error.message);
            throw error.response ? error.response.data : new Error('Registration failed');
        }
    },

    logout: () => {
        localStorage.removeItem('ntchat_token');
        localStorage.removeItem('ntchat_user');
        // Potentially notify backend or clear other client-side state
    },

    getCurrentUserToken: () => {
        return localStorage.getItem('ntchat_token');
    },

    getCurrentUserDetails: () => {
        const userStr = localStorage.getItem('ntchat_user');
        if (userStr) {
            try {
                return JSON.parse(userStr);
            } catch (e) {
                console.error("Error parsing user details from localStorage", e);
                return null;
            }
        }
        return null;
    },

    // Optional: Decode JWT to get user info (requires a JWT decoding library e.g. jwt-decode)
    // For now, getCurrentUserDetails is simpler if user object is stored alongside token.
    // isAuthenticated: () => {
    //     const token = localStorage.getItem('ntchat_token');
    //     if (!token) return false;
    //     // try {
    //     //     const decoded = jwt_decode(token); // Needs jwt-decode library
    //     //     return decoded.exp * 1000 > Date.now(); // Check token expiry
    //     // } catch (e) {
    //     //     return false;
    //     // }
    //     return true; // Simplified: if token exists, assume authenticated for now
    // }
};

export default authService;
