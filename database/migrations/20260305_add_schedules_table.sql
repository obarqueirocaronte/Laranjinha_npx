-- Migration: Add schedules table
CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    sdr_id UUID REFERENCES sdrs(id) ON DELETE SET NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    type VARCHAR(50) DEFAULT 'manual', -- 'manual' or 'cadence'
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'missed', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_schedules_lead ON schedules(lead_id);
CREATE INDEX idx_schedules_sdr ON schedules(sdr_id);
CREATE INDEX idx_schedules_date ON schedules(scheduled_at);
CREATE INDEX idx_schedules_status ON schedules(status);

-- Add trigger for updated_at
CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
