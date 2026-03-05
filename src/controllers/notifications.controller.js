const notificationsService = require('../services/notifications.service');

exports.getNotifications = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const notifications = await notificationsService.getUnreadNotifications(userId);
        res.json({ success: true, data: notifications });
    } catch (err) {
        next(err);
    }
};

exports.markAsRead = async (req, res, next) => {
    try {
        const { id } = req.params;
        await notificationsService.markAsRead(id);
        res.json({ success: true, message: 'Notification marked as read' });
    } catch (err) {
        next(err);
    }
};
