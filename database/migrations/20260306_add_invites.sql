-- Invite system for manager-controlled access
CREATE TABLE IF NOT EXISTS invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'sdr', -- 'sdr' or 'manager'
    invite_token VARCHAR(255) NOT NULL UNIQUE,
    invited_by UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'expired'
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add role and name columns to users if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'sdr';
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by UUID;

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email);
