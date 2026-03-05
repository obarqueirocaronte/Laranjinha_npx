-- Migration: Add external_id to templates
-- Description: Adds a column to store the AuroraChat Template ID

ALTER TABLE templates ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);

COMMENT ON COLUMN templates.external_id IS 'ID do template na plataforma AuroraChat (opcional)';
