/**
 * Simple Rate Limiting Middleware
 * Uses memory to track requests per IP.
 * Configured via RATE_LIMIT_WINDOW_MS and RATE_LIMIT_MAX_REQUESTS.
 */

const requestCounts = new Map();

function rateLimiter(req, res, next) {
    const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000;
    const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const now = Date.now();

    if (!requestCounts.has(ip)) {
        requestCounts.set(ip, { count: 1, firstRequest: now });
        return next();
    }

    const requestData = requestCounts.get(ip);

    if (now - requestData.firstRequest > windowMs) {
        // Window expired, reset
        requestData.count = 1;
        requestData.firstRequest = now;
        return next();
    }

    if (requestData.count >= maxRequests) {
        return res.status(429).json({
            success: false,
            error: {
                code: 'TOO_MANY_REQUESTS',
                message: 'Rate limit exceeded. Please try again later.',
            },
        });
    }

    requestData.count++;
    next();
}

// Cleanup old entries every hour
setInterval(() => {
    const now = Date.now();
    const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000;
    for (const [ip, data] of requestCounts.entries()) {
        if (now - data.firstRequest > windowMs) {
            requestCounts.delete(ip);
        }
    }
}, 3600000);

module.exports = rateLimiter;
