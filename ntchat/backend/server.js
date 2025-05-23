const express = require('express');
const http = require('http'); // Required for Socket.IO
const bodyParser = require('body-parser');
const authController = require('./authController');
const { verifyToken, hasRole, isAdmin } = require('./authMiddleware');
const db = require('./db'); // Import the database connection module
const userModel = require('./userModel'); // Needed for default user creation
const bcrypt = require('bcryptjs'); // Needed for hashing default user passwords
const { initSocketIO } = require('./socketHandlers'); // Import Socket.IO initialization

// Import route handlers
const departmentRoutes = require('./routes/departmentRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();
const server = http.createServer(app); // Create HTTP server
initSocketIO(server); // Initialize Socket.IO and attach to server

const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json()); // Parses incoming requests with JSON payloads
app.use(bodyParser.urlencoded({ extended: true })); // Parses incoming requests with URL-encoded payloads

// Authentication routes
app.post('/auth/register', authController.register);
app.post('/auth/login', authController.login);

// Mount API routers
app.use('/api/departments', departmentRoutes);
app.use('/api/users', userRoutes); // For endpoints like /api/users/:id/departments
app.use('/api/rooms', chatRoutes);


// Example protected route for authenticated users
app.get('/api/profile', verifyToken, (req, res) => {
    // req.user is available here from the verifyToken middleware
    res.json({ 
        message: 'This is a protected profile page.', 
        user: req.user 
    });
});

// Example protected route for admin users
app.get('/api/admin/dashboard', verifyToken, hasRole(['admin']), (req, res) => {
    res.json({ 
        message: 'Welcome to the admin dashboard.',
        user: req.user
    });
});

// Example of using the isAdmin convenience middleware
app.get('/api/admin/settings', verifyToken, isAdmin, (req, res) => {
    res.json({
        message: 'Admin settings page. Only accessible by users with the "admin" role.',
        user: req.user
    });
});

// Basic error handling middleware (optional, can be expanded)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Function to create default users if they don't exist
const createDefaultUsers = async () => {
    try {
        // Check for admin user
        let adminUser = await userModel.findUserByUsername('admin');
        if (!adminUser) {
            const hashedPassword = await bcrypt.hash('adminpassword', 10);
            adminUser = await userModel.createUser('admin', 'admin@example.com', hashedPassword, ['admin', 'user']);
            if (adminUser && !adminUser.error) {
                console.log("Default admin user 'admin' with password 'adminpassword' created.");
            } else if (adminUser && adminUser.error) {
                console.error("Error creating admin user:", adminUser.error);
            }
        }

        // Check for test user
        let testUser = await userModel.findUserByUsername('testuser');
        if (!testUser) {
            const hashedPassword = await bcrypt.hash('testpassword', 10);
            testUser = await userModel.createUser('testuser', 'testuser@example.com', hashedPassword, ['user']);
            if (testUser && !testUser.error) {
                console.log("Default test user 'testuser' with password 'testpassword' created.");
            } else if (testUser && testUser.error) {
                console.error("Error creating test user:", testUser.error);
            }
        }
    } catch (error) {
        console.error('Error creating default users:', error);
    }
};


// Start the server
if (process.env.NODE_ENV !== 'test') { // Avoid starting server during tests
    // Test DB connection and start server
    db.query('SELECT NOW()') // Simple query to test connection
        .then(async () => {
            console.log('Database connection successful.');
            await createDefaultUsers(); // Create default users after DB connection is confirmed
            server.listen(PORT, () => { // Use server.listen instead of app.listen
                console.log(`Server is running on http://localhost:${PORT}`);
                console.log(`Socket.IO initialized and listening for connections.`);
            });
        })
        .catch(err => {
            console.error('Failed to connect to the database. Please check your configuration and ensure PostgreSQL is running.', err);
            console.error('Make sure you have created the database and user, and run the init.sql script.');
            console.error('Database configuration:', require('./config').database);
            process.exit(1); // Exit if DB connection fails
        });
}

module.exports = app; // Export app for testing purposes
