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
            console.log('User not found.');
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
