-- ============================================================================
-- Inside Sales Pipeline - Sample Seed Data
-- Use this for testing and demonstration purposes
-- ============================================================================

-- ============================================================================
-- 1. TEAMS
-- ============================================================================

INSERT INTO teams (id, name, description) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Outbound Team A', 'Focused on SaaS prospects'),
    ('22222222-2222-2222-2222-222222222222', 'Outbound Team B', 'Focused on Enterprise accounts');

-- ============================================================================
-- 2. SDRs (Sales Development Representatives)
-- ============================================================================

INSERT INTO sdrs (id, team_id, full_name, email, phone, is_active) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Ana Silva', 'ana.silva@company.com', '+5511999999001', true),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Bruno Costa', 'bruno.costa@company.com', '+5511999999002', true),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'Carla Mendes', 'carla.mendes@company.com', '+5511999999003', true),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'Daniel Oliveira', 'daniel.oliveira@company.com', '+5511999999004', false);

-- ============================================================================
-- 3. PIPELINE COLUMNS (Standard Inside Sales Flow)
-- ============================================================================

INSERT INTO pipeline_columns (id, name, description, position, color, is_active) VALUES
    ('c0000001-0000-0000-0000-000000000001', 'Leads', 'New leads awaiting first contact', 1, '#94A3B8', true),
    ('c0000002-0000-0000-0000-000000000002', 'Call', 'Leads scheduled or attempted for call', 2, '#3B82F6', true),
    ('c0000003-0000-0000-0000-000000000003', 'WhatsApp', 'Leads contacted via WhatsApp', 3, '#10B981', true),
    ('c0000004-0000-0000-0000-000000000004', 'Email', 'Leads in email nurture sequence', 4, '#F59E0B', true),
    ('c0000005-0000-0000-0000-000000000005', 'Qualified', 'Qualified leads ready for sales', 5, '#8B5CF6', true),
    ('c0000006-0000-0000-0000-000000000006', 'Lost', 'Leads that didn\'t convert', 6, '#EF4444', true);

-- ============================================================================
-- 4. TEMPLATES
-- ============================================================================

-- Email Templates
INSERT INTO templates (id, name, category, subject, content, language) VALUES
    ('t0000001-0000-0000-0000-000000000001', 
     'Primeiro Contato - Email', 
     'EMAIL',
     'Olá {{first_name}}, vamos conversar sobre {{company_name}}?',
     'Olá {{first_name}},

Meu nome é {{sdr_name}} e trabalho com soluções para empresas como a {{company_name}}.

Notei que você atua como {{job_title}} e acredito que podemos ajudar a {{value_proposition}}.

Você teria 15 minutos esta semana para uma conversa rápida?

Abraços,
{{sdr_name}}
{{sdr_phone}}',
     'pt-BR'),

    ('t0000002-0000-0000-0000-000000000002',
     'Follow-up - Email',
     'EMAIL',
     'Re: Conversa sobre {{company_name}}',
     'Oi {{first_name}},

Enviei um email há alguns dias sobre como podemos ajudar a {{company_name}}.

Ainda faz sentido conversarmos?

Se preferir, podemos marcar uma call rápida pelo calendário: {{calendar_link}}

Abraços,
{{sdr_name}}',
     'pt-BR');

-- WhatsApp Templates
INSERT INTO templates (id, name, category, content, language) VALUES
    ('t0000003-0000-0000-0000-000000000003',
     'Primeiro Contato - WhatsApp',
     'WHATSAPP',
     'Oi {{first_name}}! 👋

Sou {{sdr_name}} da [Empresa]. Vi que você é {{job_title}} na {{company_name}}.

Podemos conversar sobre [solução]? Tenho cases bem legais de empresas similares.

Quando você tem uns 15min?',
     'pt-BR'),

    ('t0000004-0000-0000-0000-000000000004',
     'Follow-up - WhatsApp',
     'WHATSAPP',
     'Oi {{first_name}}, tudo bem?

Conseguiu dar uma olhada na minha mensagem anterior?

Sem pressão! Se não fizer sentido agora, me avisa que retomo em outro momento. 😊',
     'pt-BR');

-- Call Scripts
INSERT INTO templates (id, name, category, content, language) VALUES
    ('t0000005-0000-0000-0000-000000000005',
     'Script de Discovery Call',
     'CALL_SCRIPT',
     '**ABERTURA:**
Oi {{first_name}}, aqui é {{sdr_name}} da [Empresa]. Tudo bem?

**CONTEXTO:**
Estou entrando em contato porque vi que você é {{job_title}} na {{company_name}} e trabalhamos com empresas similares ajudando em [problema].

**PERGUNTA DE QUALIFICAÇÃO:**
Vocês já utilizam alguma solução para [área]? Como está funcionando?

**PRÓXIMOS PASSOS:**
- Se positivo: Agendar demo técnica
- Se negativo: Entender dores e enviar material

**OBJEÇÕES COMUNS:**
- "Não tenho tempo agora" → Quando seria melhor? Posso te mandar um calendário?
- "Já temos fornecedor" → Entendo! Como está a experiência? Vale a pena conhecer alternativas?',
     'pt-BR');

-- LinkedIn Templates
INSERT INTO templates (id, name, category, content, language) VALUES
    ('t0000006-0000-0000-0000-000000000006',
     'Connection Request - LinkedIn',
     'LINKEDIN',
     'Oi {{first_name}}, vi seu perfil e achei interessante sua trajetória como {{job_title}}. Trabalho com soluções para {{industry}} e adoraria trocar ideias!',
     'pt-BR');

-- ============================================================================
-- 5. WORKFLOW TRIGGERS (Automation Rules)
-- ============================================================================

-- When moving from Leads → Call, send call script
INSERT INTO workflow_triggers (id, name, from_column_id, to_column_id, action_type, template_id, config) VALUES
    ('w0000001-0000-0000-0000-000000000001',
     'Enviar Script ao Mover para Call',
     'c0000001-0000-0000-0000-000000000001', -- From: Leads
     'c0000002-0000-0000-0000-000000000002', -- To: Call
     'SEND_TEMPLATE',
     't0000005-0000-0000-0000-000000000005', -- Call Script
     '{"auto_open_modal": true, "require_confirmation": true}'::jsonb);

-- When moving from Leads → WhatsApp, send WhatsApp template
INSERT INTO workflow_triggers (id, name, from_column_id, to_column_id, action_type, template_id, config) VALUES
    ('w0000002-0000-0000-0000-000000000002',
     'Enviar Template ao Mover para WhatsApp',
     'c0000001-0000-0000-0000-000000000001', -- From: Leads
     'c0000003-0000-0000-0000-000000000003', -- To: WhatsApp
     'SEND_TEMPLATE',
     't0000003-0000-0000-0000-000000000003', -- WhatsApp First Contact
     '{"auto_open_modal": true, "require_confirmation": true}'::jsonb);

-- When moving from Leads → Email, send email template
INSERT INTO workflow_triggers (id, name, from_column_id, to_column_id, action_type, template_id, config) VALUES
    ('w0000003-0000-0000-0000-000000000003',
     'Enviar Email ao Mover para Email',
     'c0000001-0000-0000-0000-000000000001', -- From: Leads
     'c0000004-0000-0000-0000-000000000004', -- To: Email
     'SEND_TEMPLATE',
     't0000001-0000-0000-0000-000000000001', -- Email First Contact
     '{"auto_open_modal": true, "require_confirmation": true}'::jsonb);

-- When moving to Qualified, trigger webhook to CRM
INSERT INTO workflow_triggers (id, name, from_column_id, to_column_id, action_type, config) VALUES
    ('w0000004-0000-0000-0000-000000000004',
     'Notificar CRM - Lead Qualificado',
     'c0000004-0000-0000-0000-000000000004', -- From: Email
     'c0000005-0000-0000-0000-000000000005', -- To: Qualified
     'WEBHOOK',
     '{"webhook_url": "https://api.crm.com/leads/qualified", "method": "POST"}'::jsonb);

-- ============================================================================
-- 6. SAMPLE LEADS
-- ============================================================================

INSERT INTO leads (
    id, 
    external_id, 
    full_name, 
    company_name, 
    job_title, 
    email, 
    phone, 
    linkedin_url,
    current_column_id,
    assigned_sdr_id,
    quality_score,
    metadata
) VALUES
    -- High-quality leads
    ('l0000001-0000-0000-0000-000000000001',
     'FORM_2024_001',
     'João Pedro Santos',
     'TechCorp Brasil',
     'CTO',
     'joao.santos@techcorp.com.br',
     '+5511987654321',
     'https://linkedin.com/in/joaosantos',
     'c0000001-0000-0000-0000-000000000001', -- Leads column
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- Assigned to Ana
     95,
     '{"utm_source": "linkedin", "utm_campaign": "saas_cto_2024", "company_size": "50-200", "industry": "SaaS", "pain_point": "Escalabilidade"}'::jsonb),

    ('l0000002-0000-0000-0000-000000000002',
     'FORM_2024_002',
     'Maria Fernanda Lima',
     'Startup Inovadora',
     'Head of Growth',
     'maria.lima@startupinovadora.com',
     '+5521987654322',
     'https://linkedin.com/in/marialima',
     'c0000001-0000-0000-0000-000000000001',
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', -- Assigned to Bruno
     88,
     '{"utm_source": "google", "utm_campaign": "growth_marketing", "company_size": "10-50", "industry": "Fintech", "budget": "high"}'::jsonb),

    -- Medium-quality leads
    ('l0000003-0000-0000-0000-000000000003',
     'WEBINAR_2024_045',
     'Carlos Eduardo Rocha',
     'Consultoria ABC',
     'Gerente de TI',
     'carlos.rocha@consultoriaabc.com',
     '+5511987654323',
     NULL,
     'c0000002-0000-0000-0000-000000000002', -- Call column
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
     72,
     '{"utm_source": "webinar", "utm_campaign": "tech_trends_2024", "company_size": "200-500", "attended_webinar": true}'::jsonb),

    ('l0000004-0000-0000-0000-000000000004',
     'LINKEDIN_2024_089',
     'Patrícia Alves',
     'E-commerce Fashion',
     'Diretora de Marketing',
     'patricia.alves@fashionecommerce.com',
     '+5511987654324',
     'https://linkedin.com/in/patriciaalves',
     'c0000003-0000-0000-0000-000000000003', -- WhatsApp column
     'cccccccc-cccc-cccc-cccc-cccccccccccc', -- Assigned to Carla
     65,
     '{"utm_source": "linkedin", "utm_campaign": "ecommerce_outreach", "company_size": "50-200", "industry": "Retail"}'::jsonb),

    -- Lower-quality leads (for testing)
    ('l0000005-0000-0000-0000-000000000005',
     'COLD_2024_234',
     'Roberto Silva',
     'Empresa Tradicional Ltda',
     'Assistente Administrativo',
     'roberto.silva@tradicional.com.br',
     '+5511987654325',
     NULL,
     'c0000001-0000-0000-0000-000000000001',
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
     45,
     '{"utm_source": "cold_list", "company_size": "500+", "industry": "Manufacturing", "decision_maker": false}'::jsonb);

-- ============================================================================
-- 7. SAMPLE INTERACTIONS LOG
-- ============================================================================

INSERT INTO interactions_log (
    lead_id,
    sdr_id,
    action_type,
    template_id,
    content_snapshot,
    was_opened,
    was_replied
) VALUES
    ('l0000001-0000-0000-0000-000000000001',
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
     'EMAIL_SENT',
     't0000001-0000-0000-0000-000000000001',
     'Olá João Pedro, meu nome é Ana Silva...',
     true,
     false),

    ('l0000003-0000-0000-0000-000000000003',
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
     'CALL_MADE',
     't0000005-0000-0000-0000-000000000005',
     'Ligação realizada - Duração: 8min. Carlos demonstrou interesse mas pediu para retornar em 2 semanas.',
     NULL,
     NULL),

    ('l0000004-0000-0000-0000-000000000004',
     'cccccccc-cccc-cccc-cccc-cccccccccccc',
     'WHATSAPP_SENT',
     't0000003-0000-0000-0000-000000000003',
     'Oi Patrícia! 👋 Sou Carla da [Empresa]...',
     true,
     true);

-- ============================================================================
-- 8. SAMPLE PIPELINE HISTORY
-- ============================================================================

-- Simulate João's journey through pipeline
INSERT INTO lead_pipeline_history (
    lead_id,
    from_column_id,
    to_column_id,
    time_in_previous_column_seconds,
    notes
) VALUES
    ('l0000001-0000-0000-0000-000000000001',
     NULL,
     'c0000001-0000-0000-0000-000000000001',
     NULL,
     'Lead criado via formulário');

-- Simulate Carlos moving to Call column
INSERT INTO lead_pipeline_history (
    lead_id,
    from_column_id,
    to_column_id,
    time_in_previous_column_seconds,
    notes
) VALUES
    ('l0000003-0000-0000-0000-000000000003',
     'c0000001-0000-0000-0000-000000000001',
     'c0000002-0000-0000-0000-000000000002',
     3600, -- 1 hour in Leads column
     'Movido para call após qualificação inicial');

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Uncomment to test the data:

-- SELECT COUNT(*) as total_leads FROM leads;
-- SELECT name, COUNT(l.id) as lead_count FROM pipeline_columns pc LEFT JOIN leads l ON pc.id = l.current_column_id GROUP BY pc.id, pc.name ORDER BY pc.position;
-- SELECT full_name, COUNT(l.id) as assigned_leads FROM sdrs s LEFT JOIN leads l ON s.id = l.assigned_sdr_id GROUP BY s.id, s.full_name;
-- SELECT category, COUNT(*) as template_count FROM templates GROUP BY category;
-- SELECT * FROM workflow_triggers;
