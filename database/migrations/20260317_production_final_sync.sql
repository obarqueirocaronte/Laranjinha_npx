-- ============================================================================
-- Migration: Production Sync & Activity Backfill
-- Date: 2026-03-17
-- Target: PostgreSQL (Production)
-- ============================================================================

-- 1. Create interactions_log (Standby for WPP/Email)
CREATE TABLE IF NOT EXISTS interactions_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    sdr_id UUID REFERENCES sdrs(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL, -- 'EMAIL_SENT', 'WHATSAPP_SENT', 'CALL_MADE'
    content_snapshot TEXT,
    was_opened BOOLEAN DEFAULT false,
    was_replied BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Ensure Goals columns exist in SDRs
ALTER TABLE sdrs ADD COLUMN IF NOT EXISTS goal_calls INTEGER DEFAULT 0;
ALTER TABLE sdrs ADD COLUMN IF NOT EXISTS goal_emails INTEGER DEFAULT 0;
ALTER TABLE sdrs ADD COLUMN IF NOT EXISTS goal_whatsapp INTEGER DEFAULT 0;
ALTER TABLE sdrs ADD COLUMN IF NOT EXISTS goal_completed INTEGER DEFAULT 0;
ALTER TABLE sdrs ADD COLUMN IF NOT EXISTS goal_points INTEGER DEFAULT 0;

-- 3. Update Pipeline Movement Trigger to capture SDR
-- This ensures the Dashboard movements chart works
CREATE OR REPLACE FUNCTION log_pipeline_movement()
RETURNS TRIGGER AS $$
DECLARE
    time_in_column INTEGER;
BEGIN
    -- Only log if column actually changed
    IF OLD.current_column_id IS DISTINCT FROM NEW.current_column_id THEN
        -- Calculate time in previous column
        IF OLD.updated_at IS NOT NULL THEN
            time_in_column := EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - OLD.updated_at))::INTEGER;
        END IF;
        
        INSERT INTO lead_pipeline_history (
            lead_id,
            from_column_id,
            to_column_id,
            moved_by_sdr_id,
            time_in_previous_column_seconds
        ) VALUES (
            NEW.id,
            OLD.current_column_id,
            NEW.current_column_id,
            NEW.assigned_sdr_id, -- Capture the current assigned SDR as the mover
            time_in_column
        );
        
        -- Update last_interaction_at
        NEW.last_interaction_at = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. BACKFILL: Recover Today's (17/03) Cadence Completions
-- Based on leads moved to columns representing "Qualified" or "Lost" today
INSERT INTO cadence_completions (lead_id, sdr_id, cadence_name, final_outcome, completed_at)
SELECT 
    l.id, 
    l.assigned_sdr_id, 
    l.cadence_name,
    CASE 
        WHEN pc.name ILIKE '%Qualificado%' THEN 'opportunity'
        WHEN pc.name ILIKE '%Perdido%' THEN 'rejected'
        ELSE 'recycled'
    END as final_outcome,
    h.moved_at
FROM lead_pipeline_history h
JOIN leads l ON h.lead_id = l.id
JOIN pipeline_columns pc ON h.to_column_id = pc.id
WHERE h.moved_at >= CURRENT_DATE -- Today (17/03)
AND (pc.name ILIKE '%Qualificado%' OR pc.name ILIKE '%Perdido%')
AND NOT EXISTS (
    SELECT 1 FROM cadence_completions cc 
    WHERE cc.lead_id = l.id AND cc.completed_at >= CURRENT_DATE
)
ON CONFLICT DO NOTHING;

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_interactions_log_date ON interactions_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_log_sdr ON interactions_log(sdr_id, created_at DESC);
