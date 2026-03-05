const { Client } = require('pg');
require('dotenv').config();

async function migrate() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();

        // Let's create some dummy users if none exist
        const result = await client.query('SELECT count(*) FROM users');
        if (parseInt(result.rows[0].count) === 0) {
            console.log('Inserting dummy users...');
            const passwordHash = '$2a$10$wT2.6mPByxW0Q22g7E.8m.E8l7Q3qLpMv3a0T/sI/iJvGExBWe.nO'; // dummy

            await client.query(`
                INSERT INTO users (id, email, password_hash, is_verified, name, role, status) VALUES
                ('11111111-0000-0000-0000-000000000001', 'rodrigo@npx.com.br', $1, true, 'Rodrigo Dantas', 'manager', 'active'),
                ('11111111-0000-0000-0000-000000000002', 'ana.sdr@npx.com.br', $1, true, 'Ana Silva', 'sdr', 'active'),
                ('11111111-0000-0000-0000-000000000003', 'carlos.ops@npx.com.br', $1, true, 'Carlos Ops', 'ops', 'pending')
            `, [passwordHash]);

            // Default integrations.
            await client.query(`
                INSERT INTO user_integrations (user_id, type, config, is_active) VALUES
                ('11111111-0000-0000-0000-000000000001', 'email', '{"host": "smtp.gmail.com", "port": "587", "user": "rodrigo@npx.com.br"}', true),
                ('11111111-0000-0000-0000-000000000002', 'whatsapp', '{"number": "+55 11 99999-9999"}', true)
            `);
            console.log('Dummy users inserted.');
        } else {
            console.log('Users already exist, skipping dummy data injection.');
            // Just insert the integration config for existing users
            console.log('Inserting default integrations for existing users...');
            const adminUser = await client.query('SELECT id FROM users LIMIT 1');
            if (adminUser.rows.length > 0) {
                const uId = adminUser.rows[0].id;
                await client.query(`
                  INSERT INTO user_integrations (user_id, type, config, is_active) 
                  VALUES ($1, 'email', '{"host": "smtp.gmail.com", "port": "587", "user": "admin"}', true)
                  ON CONFLICT DO NOTHING
              `, [uId]);
            }
        }

    } catch (err) {
        console.error('❌ Erro na migração:', err);
    } finally {
        await client.end();
    }
}

migrate();
