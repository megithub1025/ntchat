// User.js
class User {
    constructor(id, username, email, hashedPassword, roles, createdAt, updatedAt) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.hashedPassword = hashedPassword; // This will be populated for find operations
        this.roles = roles || ['user'];
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}

module.exports = User; // Export the class
// If using ES Modules in the future: export default User;
