-- Migration: Create sdr_stats table
-- This table persists activity counters for SDRs

CREATE TABLE IF NOT EXISTS sdr_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sdr_id UUID NOT NULL REFERENCES sdrs(id) ON DELETE CASCADE,
    calls INTEGER DEFAULT 0,
    emails INTEGER DEFAULT 0,
    whatsapp INTEGER DEFAULT 0,
    completed_leads INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sdr_id)
);

CREATE INDEX IF NOT EXISTS idx_sdr_stats_sdr ON sdr_stats(sdr_id);

-- Add trigger for updated_at
CREATE TRIGGER update_sdr_stats_updated_at BEFORE UPDATE ON sdr_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
