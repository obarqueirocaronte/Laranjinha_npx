const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

async function checkUser() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        
        const email = 'rodrigo.sergio@npx.com.br';
        console.log(`Checking user: ${email}`);
        
        const checkRes = await client.query('SELECT id, email, role FROM users WHERE email = $1', [email]);
        
        if (checkRes.rows.length === 0) {
            console.log('User not found. Creating bypass user...');
            await client.query(
                'INSERT INTO users (id, email, name, role, is_admin, is_verified) VALUES ($1, $2, $3, $4, $5, $6)',
                ['00000000-0000-0000-0000-000000000001', email, 'Rodrigo Sergio', 'salesops', true, true]
            );
            console.log('Bypass user created.');
            return;
        }
        
        const user = checkRes.rows[0];
        console.log('User found:', user);
        
        if (user.role !== 'salesops') {
            console.log('Updating role to salesops...');
            await client.query('UPDATE users SET role = $1 WHERE email = $2', ['salesops', email]);
            console.log('Role updated successfully.');
        } else {
            console.log('User already has salesops role.');
        }
        
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkUser();
