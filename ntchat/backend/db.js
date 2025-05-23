const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool({
    user: config.database.user,
    host: config.database.host,
    database: config.database.database,
    password: config.database.password,
    port: config.database.port,
});

pool.on('connect', () => {
    console.log('Connected to the PostgreSQL database.');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1); // Exit the process if a connection error occurs
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect(), // For transactions
    pool, // Export the pool itself if needed
};
