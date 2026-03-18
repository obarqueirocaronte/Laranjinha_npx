-- ============================================================================
-- Migration: Fix Dashboard Schema & Goals
-- Date: 2026-03-17
-- Target: PostgreSQL (Production)
-- ============================================================================

-- 1. Add missing columns to SDRs table
ALTER TABLE sdrs ADD COLUMN IF NOT EXISTS goal_calls INTEGER DEFAULT 0;
ALTER TABLE sdrs ADD COLUMN IF NOT EXISTS goal_emails INTEGER DEFAULT 0;
ALTER TABLE sdrs ADD COLUMN IF NOT EXISTS goal_whatsapp INTEGER DEFAULT 0;
ALTER TABLE sdrs ADD COLUMN IF NOT EXISTS goal_completed INTEGER DEFAULT 0;
ALTER TABLE sdrs ADD COLUMN IF NOT EXISTS goal_points INTEGER DEFAULT 0;

-- 2. Create activity tracking tables
CREATE TABLE IF NOT EXISTS call_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    sdr_id UUID NOT NULL REFERENCES sdrs(id) ON DELETE CASCADE,
    duration_seconds INTEGER,
    status VARCHAR(50), 
    notes TEXT,
    recording_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cadence_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    sdr_id UUID NOT NULL REFERENCES sdrs(id) ON DELETE CASCADE,
    cadence_name VARCHAR(100),
    final_outcome VARCHAR(50), 
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create SDR status summary table (for fast KPI access)
CREATE TABLE IF NOT EXISTS sdr_stats (
    sdr_id UUID PRIMARY KEY REFERENCES sdrs(id) ON DELETE CASCADE,
    calls INTEGER DEFAULT 0,
    emails INTEGER DEFAULT 0,
    whatsapp INTEGER DEFAULT 0,
    completed_leads INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create Management Report Config
CREATE TABLE IF NOT EXISTS management_report_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_url TEXT,
    schedule_times JSONB DEFAULT '["09:00", "18:00"]',
    is_active BOOLEAN DEFAULT true,
    last_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Add some basic indexes for report performance
CREATE INDEX IF NOT EXISTS idx_call_logs_sdr_date ON call_logs(sdr_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cadence_completions_sdr_date ON cadence_completions(sdr_id, completed_at DESC);
