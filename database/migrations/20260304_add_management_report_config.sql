-- Migration: Create management_report_config table
-- Stores Mattermost webhook and schedule for management reports

CREATE TABLE IF NOT EXISTS management_report_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_url TEXT NOT NULL,
    schedule_times TEXT[] DEFAULT '{"11:30", "14:30", "17:00"}',
    is_active BOOLEAN DEFAULT true,
    last_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default config
INSERT INTO management_report_config (webhook_url, schedule_times)
VALUES ('https://chat.npx.com.br/hooks/depc9isurjfi7eemt5kgumdgtc', '{"11:30", "14:30", "17:00"}');

-- Add trigger for updated_at
CREATE TRIGGER update_management_report_config_updated_at BEFORE UPDATE ON management_report_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
