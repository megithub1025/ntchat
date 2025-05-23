const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('./userModel');
const config = require('./config'); // Using config for JWT_SECRET

const JWT_SECRET = config.jwtSecret;

// User registration
const register = async (req, res) => {
    const { username, email, password, roles } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Username, email, and password are required.' });
    }

    try {
        // Check for existing user by username or email (userModel.createUser now handles this)
        // The userModel.createUser will return an object with an 'error' key if user exists
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUserResult = await userModel.createUser(username, email, hashedPassword, roles || ['user']);

        if (newUserResult.error) {
            // Check if the error is due to existing user or other DB issue
            if (newUserResult.error.includes('already exists')) {
                return res.status(409).json({ message: newUserResult.error }); // 409 Conflict
            }
            return res.status(400).json({ message: newUserResult.error }); // Other errors
        }
        
        const userResponse = { 
            id: newUserResult.id, 
            username: newUserResult.username, 
            email: newUserResult.email, 
            roles: newUserResult.roles,
            createdAt: newUserResult.createdAt,
            updatedAt: newUserResult.updatedAt
        };

        res.status(201).json({ message: 'User registered successfully', user: userResponse });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Error registering user', error: error.message });
    }
};

// User login
const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    try {
        const user = await userModel.findUserByUsername(username);
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.hashedPassword);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // Create JWT payload
        const payload = {
            userId: user.id,
            username: user.username,
            roles: user.roles,
        };

        // Sign the token
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }); // Token expires in 1 hour

        res.status(200).json({
            message: 'Login successful',
            token: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email, // Include email in login response
                roles: user.roles,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
};

module.exports = {
    register,
    login,
};
