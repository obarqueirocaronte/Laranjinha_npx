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
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const statsRoutes = require('./routes/stats.routes');
const notificationScheduler = require('./services/notification_scheduler.service');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ==========================================
// REGISTRO DE ROTAS
// ==========================================
// Todas as requisições que chegam com '/api/v1' são enviadas para o arquivo './routes/index.js'
app.use('/api/v1', require('./routes'));

// Welcome route for port 3001
app.get('/', (req, res) => {
    res.json({
        message: 'Inside Sales Pipeline API is running',
        version: 'v1',
        endpoints: {
            health: '/health',
            api: '/api/v1'
        }
    });
});

// Rota de Health Check (Verificação de Saúde)
// Útil na AWS ou Docker para checar se o servidor está rodando sem problemas.
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

app.listen(port, () => {
    console.log(`🚀 API Server running on port ${port}`);
});
