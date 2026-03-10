const notificationScheduler = require('../src/services/notification_scheduler.service');
const statsService = require('../src/services/stats.service');
require('dotenv').config();

async function testNotification() {
    try {
        console.log('--- Testing Mattermost Notification ---');
        const config = await statsService.getReportConfig();

        if (!config || !config.webhook_url) {
            console.error('❌ Mattermost Webhook URL not configured in database.');
            process.exit(1);
        }

        console.log(`Using Webhook: ${config.webhook_url}`);
        await notificationScheduler.sendManagementReport(config.webhook_url);
        console.log('✅ Test report triggered successfully.');
    } catch (err) {
        console.error('❌ Error testing notification:', err);
    } finally {
        process.exit(0);
    }
}

testNotification();
