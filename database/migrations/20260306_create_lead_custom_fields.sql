-- Migration: Create lead_custom_fields table
-- This table stores normalized custom fields for leads for advanced filtering and search

CREATE TABLE IF NOT EXISTS lead_custom_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    field_key VARCHAR(100) NOT NULL,
    field_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lead_id, field_key)
);

-- Add trigger for updated_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_lead_custom_fields_updated_at'
    ) THEN
        CREATE TRIGGER update_lead_custom_fields_updated_at 
        BEFORE UPDATE ON lead_custom_fields
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Create index for faster filtering by field_key and field_value
CREATE INDEX IF NOT EXISTS idx_lead_custom_fields_key_value ON lead_custom_fields(field_key, field_value);
