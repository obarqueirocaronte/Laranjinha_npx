-- ============================================================================
-- Inside Sales Pipeline - Database Schema
-- PostgreSQL 14+
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- ============================================================================
-- 1. TEAM & USER MANAGEMENT
-- ============================================================================

CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sdrs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    user_id UUID, -- Will be linked to users table after it's created
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    -- Lead assignment tracking
    total_leads_assigned INTEGER DEFAULT 0,
    last_lead_assigned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- AUTHENTICATION SYSTEM
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(255),
    verification_token_expires TIMESTAMP WITH TIME ZONE,
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Enforce @npx.com.br domain
    CONSTRAINT email_domain_check CHECK (email LIKE '%@npx.com.br')
);

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Link SDRs to users
ALTER TABLE sdrs 
    ADD CONSTRAINT fk_sdr_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;


-- ============================================================================
-- 2. PIPELINE STRUCTURE (Dynamic Columns)
-- ============================================================================

CREATE TABLE pipeline_columns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    position INTEGER NOT NULL,
    color VARCHAR(7), -- Hex color for UI (e.g., #3B82F6)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(position)
);

-- ============================================================================
-- 3. LEAD ENTITY (Core)
-- ============================================================================

CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(255),
    
    -- Contact Information
    full_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    job_title VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    linkedin_url TEXT,
    
    -- Pipeline Position
    current_column_id UUID REFERENCES pipeline_columns(id) ON DELETE SET NULL,
    assigned_sdr_id UUID REFERENCES sdrs(id) ON DELETE SET NULL,
    
    -- Metadados flexíveis (UTMs, respostas de formulários, dados de enriquecimento, etc.)
    metadata JSONB DEFAULT '{}',
    
    -- Qualificação e Cadência (Integrado da migração anterior)
    qualification_status VARCHAR(50) DEFAULT 'pending',
    cadence_name VARCHAR(100),
    
    -- Qualidade e Status do Lead
    quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
    status VARCHAR(50) DEFAULT 'active', -- ativo, convertido, perdido, arquivado
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_interaction_at TIMESTAMP WITH TIME ZONE,
    
    -- Deduplication
    UNIQUE(email),
    UNIQUE(external_id)
);

-- ============================================================================
-- 4. LEAD PIPELINE HISTORY (Audit Trail)
-- ============================================================================

CREATE TABLE lead_pipeline_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    from_column_id UUID REFERENCES pipeline_columns(id) ON DELETE SET NULL,
    to_column_id UUID REFERENCES pipeline_columns(id) ON DELETE SET NULL,
    moved_by_sdr_id UUID REFERENCES sdrs(id) ON DELETE SET NULL,
    moved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    time_in_previous_column_seconds INTEGER, -- For analytics
    notes TEXT
);

-- ============================================================================
-- 5. WORKFLOW AUTOMATION (Drag-and-Drop Triggers)
-- ============================================================================

CREATE TABLE workflow_triggers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    from_column_id UUID REFERENCES pipeline_columns(id) ON DELETE CASCADE,
    to_column_id UUID REFERENCES pipeline_columns(id) ON DELETE CASCADE,
    
    -- Action Configuration
    action_type VARCHAR(50) NOT NULL, -- SEND_TEMPLATE, UPDATE_STATUS, START_TIMER, WEBHOOK, etc.
    template_id UUID, -- References templates table (defined below)
    config JSONB DEFAULT '{}', -- Flexible config for different action types
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(from_column_id, to_column_id, action_type)
);

-- ============================================================================
-- 6. TEMPLATES & MESSAGING
-- ============================================================================

CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- EMAIL, WHATSAPP, CALL_SCRIPT, LINKEDIN
    subject VARCHAR(500), -- For emails
    content TEXT NOT NULL, -- Supports placeholders: {{first_name}}, {{company_name}}, etc.
    
    -- Template metadata
    language VARCHAR(10) DEFAULT 'pt-BR',
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key to workflow_triggers now that templates table exists
ALTER TABLE workflow_triggers 
    ADD CONSTRAINT fk_workflow_template 
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL;

-- ============================================================================
-- 7. INTERACTIONS LOG (Complete History)
-- ============================================================================

CREATE TABLE interactions_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    sdr_id UUID REFERENCES sdrs(id) ON DELETE SET NULL,
    
    -- Interaction Details
    action_type VARCHAR(50) NOT NULL, -- EMAIL_SENT, WHATSAPP_SENT, CALL_MADE, NOTE_ADDED, etc.
    template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    content_snapshot TEXT, -- Actual content sent (after placeholder replacement)
    
    -- Engagement Tracking
    was_opened BOOLEAN DEFAULT false,
    was_clicked BOOLEAN DEFAULT false,
    was_replied BOOLEAN DEFAULT false,
    reply_content TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}', -- Channel-specific data (email headers, WhatsApp message ID, etc.)
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 8. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Lead search and filtering
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_external_id ON leads(external_id);
CREATE INDEX idx_leads_current_column ON leads(current_column_id);
CREATE INDEX idx_leads_assigned_sdr ON leads(assigned_sdr_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_last_interaction ON leads(last_interaction_at DESC);

-- JSONB metadata search (GIN index for flexible queries)
CREATE INDEX idx_leads_metadata ON leads USING GIN(metadata);

-- Full-text search on lead details
CREATE INDEX idx_leads_fulltext ON leads USING GIN(
    to_tsvector('portuguese', 
        COALESCE(full_name, '') || ' ' || 
        COALESCE(company_name, '') || ' ' || 
        COALESCE(job_title, '')
    )
);

-- Pipeline history analytics
CREATE INDEX idx_pipeline_history_lead ON lead_pipeline_history(lead_id, moved_at DESC);
CREATE INDEX idx_pipeline_history_column ON lead_pipeline_history(to_column_id, moved_at DESC);

-- Interactions log
CREATE INDEX idx_interactions_lead ON interactions_log(lead_id, created_at DESC);
CREATE INDEX idx_interactions_sdr ON interactions_log(sdr_id, created_at DESC);
CREATE INDEX idx_interactions_action_type ON interactions_log(action_type, created_at DESC);

-- Workflow triggers
CREATE INDEX idx_workflow_triggers_columns ON workflow_triggers(from_column_id, to_column_id);

-- SDR performance queries
CREATE INDEX idx_sdrs_team ON sdrs(team_id);
CREATE INDEX idx_sdrs_active ON sdrs(is_active);

-- Authentication indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_verification_token ON users(verification_token);
CREATE INDEX idx_users_reset_token ON users(reset_password_token);
CREATE INDEX idx_user_sessions_token ON user_sessions(token);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id, expires_at DESC);


-- ============================================================================
-- 9. FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sdrs_updated_at BEFORE UPDATE ON sdrs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pipeline_columns_updated_at BEFORE UPDATE ON pipeline_columns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_triggers_updated_at BEFORE UPDATE ON workflow_triggers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- Log pipeline movements automatically
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
            time_in_previous_column_seconds
        ) VALUES (
            NEW.id,
            OLD.current_column_id,
            NEW.current_column_id,
            time_in_column
        );
        
        -- Update last_interaction_at
        NEW.last_interaction_at = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_pipeline_movement BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION log_pipeline_movement();

-- ============================================================================
-- 10. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE leads IS 'Core lead entity with flexible JSONB metadata for external data';
COMMENT ON TABLE pipeline_columns IS 'Dynamic pipeline stages configurable by managers';
COMMENT ON TABLE workflow_triggers IS 'Automation rules triggered by drag-and-drop movements';
COMMENT ON TABLE templates IS 'Message templates with placeholder support for personalization';
COMMENT ON TABLE interactions_log IS 'Complete audit trail of all SDR interactions with leads';
COMMENT ON TABLE lead_pipeline_history IS 'Historical record of lead movements through pipeline';

COMMENT ON COLUMN leads.metadata IS 'Campo flexível em JSONB para dados externos como UTMs, formulários, etc.';
COMMENT ON COLUMN leads.quality_score IS 'Pontuação numérica (0-100) de qualificação do lead';
COMMENT ON COLUMN workflow_triggers.config IS 'Configuração flexível para diferentes tipos de ações automáticas';
COMMENT ON COLUMN templates.content IS 'Conteúdo do template com variáveis como: {{first_name}}, {{company_name}}, etc.';

-- ============================================================================
-- 11. SISTEMA DE NOTIFICAÇÕES (Adicionado da versão beta migrada) 
-- ============================================================================
-- Tabela responsável por armazenar alertas e notificações para os usuários (SDRs/Admins)

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(50), -- ex: 'LEAD_ASSIGNMENT_PENDING'
    is_read BOOLEAN DEFAULT false,
    link VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice criado para melhorar a performance das queries buscando notificações não lidas
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE is_read = false;
