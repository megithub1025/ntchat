const db = require('./db'); // PostgreSQL connection module
const User = require('./User'); // Import the User class AT THE TOP

// Function to add a new user to the database
const createUser = async (username, email, hashedPassword, roles = ['user']) => {
    const query = `
        INSERT INTO users (username, email, hashed_password, roles)
        VALUES ($1, $2, $3, $4)
        RETURNING id, username, email, roles, created_at, updated_at;
    `;
    const values = [username, email, hashedPassword, roles];

    try {
        // Check for existing username
        const existingUserByUsername = await findUserByUsername(username);
        if (existingUserByUsername) {
            return { error: 'Username already exists' };
        }

        // Check for existing email
        const existingUserByEmail = await findUserByEmail(email);
        if (existingUserByEmail) {
            return { error: 'Email already exists' };
        }

        const { rows } = await db.query(query, values);
        if (rows.length > 0) {
            const user = rows[0];
            // Convert roles from string array like {"user"} to array of strings if needed
            // PostgreSQL TEXT[] type is already returned as an array of strings by node-postgres
            return new User(user.id, user.username, user.email, null, user.roles, user.created_at, user.updated_at);
        }
        return null; // Should not happen if insert is successful
    } catch (error) {
        console.error('Error creating user:', error);
        // Check for unique constraint violation (PostgreSQL error codes)
        if (error.code === '23505') { // unique_violation
            if (error.constraint === 'users_username_key') {
                return { error: 'Username already exists' };
            }
            if (error.constraint === 'users_email_key') {
                return { error: 'Email already exists' };
            }
        }
        return { error: 'Database error creating user' };
    }
};

// Function to find a user by username from the database
const findUserByUsername = async (username) => {
    const query = 'SELECT * FROM users WHERE username = $1;';
    try {
        const { rows } = await db.query(query, [username]);
        if (rows.length > 0) {
            const user = rows[0];
            // Ensure roles are correctly formatted if needed
            return new User(user.id, user.username, user.email, user.hashed_password, user.roles, user.created_at, user.updated_at);
        }
        return null;
    } catch (error) {
        console.error('Error finding user by username:', error);
        return null;
    }
};

// Function to find a user by email from the database
const findUserByEmail = async (email) => {
    const query = 'SELECT * FROM users WHERE email = $1;';
    try {
        const { rows } = await db.query(query, [email]);
        if (rows.length > 0) {
            const user = rows[0];
            return new User(user.id, user.username, user.email, user.hashed_password, user.roles, user.created_at, user.updated_at);
        }
        return null;
    } catch (error) {
        console.error('Error finding user by email:', error);
        return null;
    }
};

// Function to find a user by ID from the database
const findUserById = async (id) => {
    const query = 'SELECT * FROM users WHERE id = $1;';
    try {
        const { rows } = await db.query(query, [id]);
        if (rows.length > 0) {
            const user = rows[0];
            return new User(user.id, user.username, user.email, user.hashed_password, user.roles, user.created_at, user.updated_at);
        }
        return null;
    } catch (error) {
        console.error('Error finding user by ID:', error);
        return null;
    }
};

module.exports = {
    createUser,
    findUserByUsername,
    findUserByEmail,
    findUserById,
    // User class is not directly used by controller, but useful for consistent object structure
};

// Ensure User is defined before it's used by any functions above.
// const User = require('./User'); // Moved to the top
