-- ============================================================================
-- Migration: Normalize User Columns
-- Date: 2026-03-17
-- Target: PostgreSQL (Production)
-- ============================================================================

-- 1. Ensure all standard user columns exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'sdr';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- 2. Synchronize avatar_url to profile_picture_url if it exists from Google OAuth
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='avatar_url') THEN
        UPDATE users SET profile_picture_url = avatar_url WHERE profile_picture_url IS NULL AND avatar_url IS NOT NULL;
    END IF;
END $$;

-- 3. Synchronize name to full_name if one is missing
UPDATE users SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL;
UPDATE users SET name = full_name WHERE name IS NULL AND full_name IS NOT NULL;
