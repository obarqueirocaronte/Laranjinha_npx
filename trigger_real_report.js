require('dotenv').config();
const scheduler = require('./src/services/notification_scheduler.service');

const WEBHOOK_URL = 'https://chat.npx.com.br/hooks/depc9isurjfi7eemt5kgumdgtc';

async function main() {
    console.log('🔍 Fetching REAL data and sending preview to Mattermost...');
    try {
        await scheduler.sendManagementReport(WEBHOOK_URL);
        console.log('✅ Real data report sent successfully!');
    } catch (error) {
        console.error('❌ Error sending real report:', error);
    } finally {
        // Force exit to close DB connections if any
        process.exit(0);
    }
}

main();
