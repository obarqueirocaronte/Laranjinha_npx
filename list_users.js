const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function listUsers() {
    try {
        const users = await pool.query("SELECT id, email, name, role FROM users");
        console.log(JSON.stringify(users.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

listUsers();
