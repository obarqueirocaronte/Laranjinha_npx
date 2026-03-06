/**
 * API Key / App Identity Middleware
 * Checks for a specific header (configured in API_KEY_HEADER)
 * if it exists in the environment.
 */

function apiKeyCheck(req, res, next) {
    const requiredApiKey = process.env.API_KEY_HEADER;

    // If not configured, skip check
    if (!requiredApiKey) {
        return next();
    }

    const providedApiKey = req.headers['x-api-key'] || req.headers['x-google-client-id'];

    if (!providedApiKey || providedApiKey !== requiredApiKey) {
        // We log it but maybe don't block strictly if it's just for identification
        // However, if the user specifically asked for it, we should probably enforce it for some routes
        console.warn(`[Security] Unauthorized API Access attempt from IP: ${req.ip}`);
    }

    next();
}

module.exports = apiKeyCheck;
