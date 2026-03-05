const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function seedAdmin() {
    const email = 'rodrigo.sergio@npx.com.br';
    const password = '1234566';

    console.log(`Starting admin seeding for ${email}...`);

    try {
        // 1. Ensure is_admin column exists (in case the previous command failed)
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_admin') THEN
                    ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT false;
                END IF;
            END $$;
        `);
        console.log('Database schema verified.');

        // 2. Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // 3. Create or update user
        const result = await pool.query(`
            INSERT INTO users (email, password_hash, is_verified, is_admin)
            VALUES ($1, $2, true, true)
            ON CONFLICT (email) 
            DO UPDATE SET 
                password_hash = $2,
                is_verified = true,
                is_admin = true,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id, email
        `, [email, passwordHash]);

        console.log(`Successfully created/updated admin user: ${result.rows[0].email} (ID: ${result.rows[0].id})`);

    } catch (err) {
        console.error('Failed to seed admin user:', err);
    } finally {
        await pool.end();
    }
}

seedAdmin();
