const db = require('../config/db');

class NotificationsService {
    async createNotification(userId, title, message, type, link) {
        const sql = `
            INSERT INTO notifications (user_id, title, message, type, link)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, created_at
        `;
        const res = await db.query(sql, [userId, title, message, type, link]);
        return res.rows[0];
    }

    async getUnreadNotifications(userId) {
        const sql = `
            SELECT * FROM notifications 
            WHERE user_id = $1 AND is_read = false 
            ORDER BY created_at DESC
        `;
        const res = await db.query(sql, [userId]);
        return res.rows;
    }

    async markAsRead(notificationId) {
        const sql = 'UPDATE notifications SET is_read = true WHERE id = $1';
        return db.query(sql, [notificationId]);
    }

    async notifyManagers(title, message, type, link) {
        // Find all users with is_admin = true
        const managers = await db.query('SELECT id FROM users WHERE is_admin = true');

        const promises = managers.rows.map(manager =>
            this.createNotification(manager.id, title, message, type, link)
        );

        return Promise.all(promises);
    }
}

module.exports = new NotificationsService();
