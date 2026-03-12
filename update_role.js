const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function updateRole() {
  try {
    // Find user Rodrigo
    const res = await pool.query("SELECT id, name, email, role FROM users WHERE email ILIKE 'rodrigo%' OR name ILIKE 'rodrigo%'");
    console.log('--- Found Users ---');
    res.rows.forEach(user => console.log(`${user.id}: ${user.name} (${user.email}) - Current Role: ${user.role}`));

    if (res.rows.length > 0) {
        const userId = res.rows[0].id;
        await pool.query("UPDATE users SET role = 'salesops' WHERE id = $1", [userId]);
        console.log(`\nUpdated user ${res.rows[0].name} to role 'salesops'.`);
    } else {
        console.log('\nUser Rodrigo not found.');
    }

  } catch (err) {
    console.error('Error updating role:', err);
  } finally {
    await pool.end();
  }
}

updateRole();
