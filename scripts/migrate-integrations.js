const { Client } = require('pg');
require('dotenv').config();

async function migrate() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        console.log('🔗 Conexão com o banco estabelecida.');

        await client.query(`
            CREATE TABLE IF NOT EXISTS user_integrations (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                type VARCHAR(50) NOT NULL, -- 'email', 'voice', 'whatsapp'
                config JSONB DEFAULT '{}',
                is_active BOOLEAN DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, type)
            );
        `);

        // Add trigger if it doesn't exist
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_integrations_updated_at'
                ) THEN
                    CREATE TRIGGER update_user_integrations_updated_at 
                    BEFORE UPDATE ON user_integrations
                    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
                END IF;
            END $$;
        `);

        // If 'role' does not exist in users, we might need it, or we can just return sdrs vs users.
        // Wait, 'role' might not be in users table. Let's check users columns
        await client.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'sdr';
            ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
            ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
        `);

        // Wait, SDR full_name is in sdrs table. We should probably just sync users.name from sdrs,
        // or just use users.name for everyone going forward.

        console.log('✅ Migração executada com sucesso.');
    } catch (err) {
        console.error('❌ Erro na migração:', err);
    } finally {
        await client.end();
    }
}

migrate();
