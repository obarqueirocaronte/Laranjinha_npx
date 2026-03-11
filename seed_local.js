const leadsService = require('./src/services/leads.service');
const db = require('./src/config/db');

async function seedTestLead() {
    console.log('--- Seeding Test Lead ---');
    
    const testLead = {
        full_name: 'Ana Rodrigues',
        company_name: 'TechBrasil LTDA',
        job_title: 'DIRETORA COMERCIAL',
        email: 'ana.rodrigues@techbrasil.com.br',
        phone: '11999999999',
        linkedin_url: 'https://linkedin.com/in/anarodrigues',
        metadata: {
            cnpj: '12.345.678/0001-90',
            tags: ['Enterprise', 'Prioritário'],
            next_contact_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
            next_contact_type: 'Call'
        }
    };

    try {
        // First, ensure we have an SDR to assign to
        const sdrRes = await db.query('SELECT id FROM sdrs LIMIT 1');
        let sdrId = sdrRes.rows[0]?.id;
        
        if (!sdrId) {
            console.log('No SDR found, creating one...');
            const newSdr = await db.query(
                "INSERT INTO sdrs (id, full_name, email, role) VALUES (gen_random_uuid(), 'SDR Teste', 'sdr@teste.com', 'sdr') RETURNING id"
            );
            sdrId = newSdr.rows[0].id;
        }

        // Create lead
        const result = await leadsService.ingestLead(testLead);
        console.log('Lead created/updated:', result.lead_id);

        // Move to a column that appears in Kanban (not position 1 if 1 is 'Leads' pool)
        // Find column with position 2
        const colRes = await db.query('SELECT id FROM pipeline_columns WHERE position = 2 LIMIT 1');
        const colId = colRes.rows[0]?.id;
        
        if (colId) {
            await leadsService.moveLead(result.lead_id, colId, 'Seed for testing');
            console.log('Lead moved to column position 2');
        }

        // Assign to SDR and set as qualified to show in Kanban
        await leadsService.assignLead(result.lead_id, sdrId, 'Cadência Enterprise');
        console.log('Lead assigned to SDR and cadence');

        console.log('✅ Seed completed successfully!');
    } catch (err) {
        console.error('❌ Seed failed:', err);
    } finally {
        process.exit();
    }
}

seedTestLead();
