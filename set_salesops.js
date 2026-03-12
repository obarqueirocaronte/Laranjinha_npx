const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function setSalesOps() {
    try {
        const email = 'rodrigo@npx.com.br';
        console.log(`Setting user ${email} to salesops...`);
        
        const res = await pool.query(
            "UPDATE users SET role = 'salesops', is_admin = true WHERE email = $1 RETURNING id, role",
            [email]
        );
        
        if (res.rows.length > 0) {
            console.log(`Success: User ${email} is now ${res.rows[0].role}`);
        } else {
            console.log(`User ${email} not found.`);
        }
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

setSalesOps();
