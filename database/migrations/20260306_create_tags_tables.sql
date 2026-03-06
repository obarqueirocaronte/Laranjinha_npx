-- Migration: Create tags and lead_tags tables
-- For organized classification of leads

CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#6B7280',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lead_tags (
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (lead_id, tag_id)
);

-- Index for fast lookup by tag
CREATE INDEX IF NOT EXISTS idx_lead_tags_tag ON lead_tags(tag_id);

-- Optional: Seed some default tags
INSERT INTO tags (name, color) VALUES 
('Prioridade', '#EF4444'),
('Novidade', '#3B82F6'),
('Retorno', '#10B981'),
('SaaS', '#8B5CF6'),
('Enterprise', '#F59E0B')
ON CONFLICT (name) DO NOTHING;
