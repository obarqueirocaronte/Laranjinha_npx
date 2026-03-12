-- Migration: Add call_logs and cadence_completions tables
-- Date: 2026-03-12

-- Call Interactions Log
CREATE TABLE IF NOT EXISTS call_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    sdr_id UUID REFERENCES sdrs(id) ON DELETE SET NULL,
    outcome VARCHAR(50) NOT NULL, -- 'success', 'busy', 'voicemail', 'invalid', 'reschedule', 'no-answer'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cadence Completions
CREATE TABLE IF NOT EXISTS cadence_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    sdr_id UUID REFERENCES sdrs(id) ON DELETE SET NULL,
    final_outcome VARCHAR(50) NOT NULL, -- 'success', 'disinterested', 'invalid_number', 'other'
    notes TEXT,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_call_logs_lead_id ON call_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_cadence_completions_lead_id ON cadence_completions(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_sdr_id ON call_logs(sdr_id);
CREATE INDEX IF NOT EXISTS idx_cadence_completions_sdr_id ON cadence_completions(sdr_id);
