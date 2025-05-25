try {
    require('dotenv').config(); // Optional: if you want to use a .env file for configuration
} catch (e) {
    console.warn("dotenv not configured or failed to load. Using environment variables or defaults.");
}

module.exports = {
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'ntchat_user', // Replace with your PostgreSQL username
        password: process.env.DB_PASSWORD || 'ntchat_password', // Replace with your PostgreSQL password
        database: process.env.DB_NAME || 'ntchat_db', // Replace with your PostgreSQL database name
    },
    jwtSecret: process.env.JWT_SECRET || 'your-very-secret-key-that-should-be-in-env', // Keep consistent with authController and authMiddleware
    liemsApiBaseUrl: process.env.LIEMS_API_BASE_URL || 'http://your-liems-api-ip-and-port', // Placeholder for LiEMS API base URL
};
