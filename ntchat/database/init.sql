-- Script to initialize the ntchat database and users table

-- Optional: Create a dedicated database if it doesn't exist
-- CREATE DATABASE ntchat_db;
-- \c ntchat_db; -- Connect to the database (psql command)

-- Optional: Create a dedicated user if it doesn't exist
-- CREATE USER ntchat_user WITH PASSWORD 'ntchat_password';
-- GRANT ALL PRIVILEGES ON DATABASE ntchat_db TO ntchat_user;

-- Drop table if it exists to start fresh (for development)
DROP TABLE IF EXISTS users CASCADE;

-- Create the users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    roles TEXT[] DEFAULT '{"user"}', -- Array of roles, e.g., {'user', 'admin'}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Create an index on username and email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Instructions to run this script:
-- 1. Ensure PostgreSQL server is running.
-- 2. Open psql or a PostgreSQL client (e.g., pgAdmin).
-- 3. Connect to your PostgreSQL instance. If you haven't created the 'ntchat_db' database and 'ntchat_user',
--    you might need superuser privileges to run the CREATE DATABASE and CREATE USER commands (uncomment them).
--    Otherwise, connect to your target database.
-- 4. If you created 'ntchat_db', connect to it: \c ntchat_db
-- 5. Run this script: \i path/to/this/init.sql
--    Replace 'path/to/this/init.sql' with the actual path to this file.
--
-- Example:
-- psql -U postgres -f init.sql
-- or after connecting to psql:
-- \c your_database_name
-- \i /path/to/ntchat/database/init.sql

-- After running, you can verify the table structure:
-- \d users

-- Grant permissions if you created a specific user (ensure this user is used in config.js)
-- GRANT ALL PRIVILEGES ON TABLE users TO ntchat_user;
-- GRANT USAGE, SELECT ON SEQUENCE users_id_seq TO ntchat_user; -- If using SERIAL for id

-- Default users (can be added here or via application logic as in server.js)
-- Note: Passwords should be hashed by the application before inserting directly.
-- Example (application should handle hashing):
-- INSERT INTO users (username, email, hashed_password, roles)
-- VALUES ('admin', 'admin@example.com', 'hashed_admin_password_here', '{"admin", "user"}');

-- INSERT INTO users (username, email, hashed_password, roles)
-- VALUES ('testuser', 'testuser@example.com', 'hashed_testuser_password_here', '{"user"}');

SELECT 'Users table created and configured successfully.' as status;


-- Chat Rooms Table
DROP TABLE IF EXISTS chat_rooms CASCADE;
CREATE TABLE chat_rooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_timestamp_chat_rooms
BEFORE UPDATE ON chat_rooms
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

SELECT 'Chat rooms table created and configured successfully.' as status;

-- Chat Room Members Table
DROP TABLE IF EXISTS chat_room_members CASCADE;
CREATE TABLE chat_room_members (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES chat_rooms(id) ON DELETE CASCADE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (room_id, user_id)
);

SELECT 'Chat room members table created and configured successfully.' as status;

-- Messages Table
DROP TABLE IF EXISTS messages CASCADE;
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    room_id INTEGER REFERENCES chat_rooms(id) ON DELETE CASCADE, -- Nullable for direct messages
    receiver_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Nullable for room messages
    message_type VARCHAR(50) DEFAULT 'text', -- e.g., 'text', 'image', 'file'
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_message_target CHECK (
        (room_id IS NOT NULL AND receiver_id IS NULL) OR -- Room message
        (room_id IS NULL AND receiver_id IS NOT NULL)    -- Direct message
    )
);

CREATE INDEX IF NOT EXISTS idx_messages_room_created_at ON messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_direct_message_created_at ON messages(sender_id, receiver_id, created_at DESC);

SELECT 'Messages table created and configured successfully.' as status;

-- Departments Table
DROP TABLE IF EXISTS departments CASCADE;
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP -- Added updated_at
);

CREATE TRIGGER set_timestamp_departments
BEFORE UPDATE ON departments
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

SELECT 'Departments table created and configured successfully.' as status;

-- User Department Mappings Table
DROP TABLE IF EXISTS user_department_mappings CASCADE;
CREATE TABLE user_department_mappings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE NOT NULL,
    UNIQUE (user_id, department_id)
);

SELECT 'User department mappings table created and configured successfully.' as status;
