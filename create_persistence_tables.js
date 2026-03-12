require('dotenv').config();
const { Client } = require('pg');

async function runSchemaUpdates() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const schemaQuery = `
      -- Enable UUID extension if not already enabled
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      CREATE TABLE IF NOT EXISTS call_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
          sdr_id UUID REFERENCES users(id) ON DELETE SET NULL,
          outcome VARCHAR(50) NOT NULL,
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS schedules (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
          sdr_id UUID REFERENCES users(id) ON DELETE SET NULL,
          scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
          notes TEXT,
          status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cadence_completions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
          sdr_id UUID REFERENCES users(id) ON DELETE SET NULL,
          completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          notes TEXT,
          final_outcome VARCHAR(50)
      );

      CREATE INDEX IF NOT EXISTS idx_call_logs_lead ON call_logs(lead_id);
      CREATE INDEX IF NOT EXISTS idx_schedules_lead ON schedules(lead_id);
      CREATE INDEX IF NOT EXISTS idx_cadence_completions_lead ON cadence_completions(lead_id);
    `;

    await client.query(schemaQuery);
    console.log('Tables created successfully');
  } catch (err) {
    console.error('Error creating tables:', err);
  } finally {
    await client.end();
  }
}

runSchemaUpdates();
