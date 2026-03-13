const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config();

async function createUser() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        
        const email = 'rodrigo.sergio@npx.com.br';
        const password = '505050';
        const role = 'salesops';
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        console.log(`Checking if user exists: ${email}`);
        const checkRes = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        
        if (checkRes.rows.length > 0) {
            console.log('User already exists. Updating password and role...');
            await client.query('UPDATE users SET password = $1, role = $2 WHERE email = $3', [hashedPassword, role, email]);
            console.log('User updated successfully.');
        } else {
            console.log('Creating new user...');
            await client.query('INSERT INTO users (email, password, role) VALUES ($1, $2, $3)', [email, hashedPassword, role]);
            console.log('User created successfully.');
        }
        
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

createUser();
