/**
 * Arquivo Principal da Aplicação (App.js)
 * 
 *
 * Este arquivo é o ponto de entrada principal do backend. Ele é responsável por:
 * 1. Inicializar o servidor Express.
 * 2. Configurar medidas de segurança como CORS (Cross-Origin Resource Sharing).
 * 3. Registrar as rotas da API (onde as requisições chegam e são distribuídas).
 * 4. Lidar com erros globais para evitar que o servidor caia inesperadamente.
 */
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
require('dotenv').config();

const { configureGoogleStrategy } = require('./services/google_auth.service');
const notificationScheduler = require('./services/notification_scheduler.service');

const app = express();
const rateLimiter = require('./middleware/rate_limit.middleware');
const apiKeyCheck = require('./middleware/api_key.middleware');
const port = process.env.PORT || 3001;

// Global Middleware
app.use(rateLimiter);
app.use(apiKeyCheck);

// Configure Google OAuth Strategy
configureGoogleStrategy();

// Middleware
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:5173'
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);

        const isLocalhost = origin.startsWith('http://localhost:') || origin === 'http://localhost';
        const isAllowedDomain = allowedOrigins.indexOf(origin) !== -1;

        if (isLocalhost || isAllowedDomain || process.env.NODE_ENV === 'development') {
            return callback(null, true);
        }

        return callback(null, false);
    },
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// API Routes
app.use('/api/v1', require('./routes'));

// Health Check
app.get('/api/v1/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Remote Debug Logger
app.post('/api/v1/debug-log', (req, res) => {
    const { type, messages } = req.body;
    console.log(`[REMOTE ${type?.toUpperCase()}]`, ...messages);
    res.sendStatus(200);
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.use((req, res, next) => {
    // If it's an API route that didn't match, don't serve HTML
    if (req.path.startsWith('/api')) {
        return next();
    }
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: 'Something went wrong!',
        },
    });
});

// Start Management Report Scheduler
notificationScheduler.start();

app.listen(port, () => {
    console.log(`🚀 API Server running on port ${port}`);
});
