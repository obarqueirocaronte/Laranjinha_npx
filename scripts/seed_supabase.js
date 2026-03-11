const leadsService = require('../src/services/leads.service');
const db = require('../src/config/db');

async function cleanTestData() {
    console.log('🧹 Cleaning existing test data...');
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM interactions_log');
        await client.query('DELETE FROM lead_pipeline_history');
        await client.query('DELETE FROM lead_custom_fields');
        await client.query('DELETE FROM leads');
        // Delete users created by this script to reset correctly
        await client.query(`DELETE FROM sdrs WHERE email LIKE '%@npx.com.br' AND email LIKE 'sdr_simulado%'`);
        await client.query(`DELETE FROM users WHERE email LIKE '%@npx.com.br' AND email LIKE 'sdr_simulado%'`);
        await client.query('COMMIT');
        console.log('✅ Clean complete.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Clean failed:', err);
    } finally {
        client.release();
    }
}

async function seedTestEnvironment() {
    console.log('🌱 Starting comprehensive seed for Test Environment (Supabase)...');
    
    try {
        // 1. Clean existing test data
        await cleanTestData();

        // 2. Create 3 Simulated SDRs
        console.log('👤 Creating 3 simulated SDRs...');
        const sdrNames = ['João Silva (SDR Alpha)', 'Maria Souza (SDR Beta)', 'Carlos Santos (SDR Gama)'];
        const createdSdrs = [];
        
        for (let i = 0; i < sdrNames.length; i++) {
            const email = `sdr_simulado_${i+1}@npx.com.br`;
            // Insert into Users table first (auth simulation)
            const userRes = await db.query(`
                INSERT INTO users (email, password_hash, role)
                VALUES ($1, 'simulated_hash', 'sdr')
                RETURNING id
            `, [email]);
            
            // Insert into SDRs table
            const sdrRes = await db.query(`
                INSERT INTO sdrs (id, user_id, full_name, email) 
                VALUES (gen_random_uuid(), $1, $2, $3) 
                RETURNING id
            `, [userRes.rows[0].id, sdrNames[i], email]);
            
            createdSdrs.push(sdrRes.rows[0].id);
        }
        console.log(`✅ Created 3 SDRs: ${createdSdrs.join(', ')}`);

        // 3. Get Pipeline Columns
        const columnsRes = await db.query('SELECT id, name FROM pipeline_columns ORDER BY position');
        const columns = columnsRes.rows;
        if (columns.length < 3) throw new Error('Not enough pipeline columns configured.');

        // 4. Create 30 Leads randomly distributed
        console.log('🏢 Creating 30 Leads and distributing them...');
        const cadences = ['Sem Cadência', 'Cadência de Outbound', 'Cadência de Inbound', 'Cadência Enterprise'];
        const tagsPool = ['Urgente', 'Enterprise', 'Follow-up', 'Prioritário', 'Frio', 'Quente', 'Diretoria'];
        const companies = ['Tech Corp', 'Innova S.A.', 'Giga Systems', 'Prime Ltda', 'Alpha Solutions', 'Beta Comércio', 'Next Gen', 'Smart Fit', 'Global Net', 'Construtora Forte'];
        
        for (let i = 1; i <= 30; i++) {
            // Randomly select 2 tags
            const numTags = Math.floor(Math.random() * 2) + 1;
            const selectedTags = [];
            for(let t=0; t<numTags; t++){
                selectedTags.push(tagsPool[Math.floor(Math.random() * tagsPool.length)]);
            }

            const testLead = {
                full_name: `Contato Simulado ${i}`,
                company_name: `${companies[i % companies.length]} ${i}`,
                job_title: i % 3 === 0 ? 'CEO' : (i % 2 === 0 ? 'Diretor' : 'Gerente'),
                email: `contato_${i}@empresa${i}.simulado.com`,
                phone: `119${String(Math.floor(Math.random() * 99999999)).padStart(8, '0')}`,
                cadence_name: cadences[Math.floor(Math.random() * cadences.length)],
                metadata: {
                    tags: [...new Set(selectedTags)]
                }
            };

            const result = await leadsService.ingestLead(testLead);
            const leadId = result.lead_id;

            // Randomly assign to one of the 3 SDRs (80% chance to be assigned)
            if (Math.random() > 0.2) {
                const randomSdrId = createdSdrs[Math.floor(Math.random() * createdSdrs.length)];
                await leadsService.assignLead(leadId, randomSdrId, testLead.cadence_name);
                
                // Randomly move to a column beyond position 1 (20% chance to stay in pos 1, 80% to move)
                if (Math.random() > 0.2) {
                    // Pick column index 1 through cols.length-1
                    const randColIndex = Math.floor(Math.random() * (columns.length - 1)) + 1;
                    await leadsService.moveLead(leadId, columns[randColIndex].id, 'Simulated move');
                }
            }
        }
        
        console.log('✅ 30 Leads successfully created and distributed.');
        console.log('🚀 Seed completed. The manager view will now show random queues for each simulated SDR.');

    } catch (err) {
        console.error('❌ SEED ERROR:', err);
    } finally {
        process.exit();
    }
}

seedTestEnvironment();
