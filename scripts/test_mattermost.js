require('dotenv').config();
const aiService = require('./src/services/ai.service');

async function testMattermost() {
    console.log('--- Mattermost Integration Test ---');
    
    if (!process.env.MATTERMOST_WEBHOOK_URL) {
        console.error('❌ Error: MATTERMOST_WEBHOOK_URL is not set in .env');
        console.log('To test, please add your webhook URL to the .env file and run this script again.');
        process.exit(1);
    }

    const testLead = {
        full_name: 'Teste de Integração',
        company_name: 'Mattermost Inc',
        job_title: 'Software Engineer',
        email: 'test@mattermost.com',
        phone: '0000000000'
    };

    try {
        console.log('Sending test opportunity to Mattermost...');
        const result = await aiService.exportOpportunity(testLead, 'Este é um teste automático de integração do Inside Sales Pipeline.');
        if (result.success) {
            console.log('✅ Success! Check your Mattermost channel.');
        }
    } catch (err) {
        console.error('❌ Mattermost Test Failed:', err.message);
    } finally {
        process.exit();
    }
}

testMattermost();
