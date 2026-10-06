import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { apiRouter } from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api', apiRouter);

// Production Static Serving
const clientDistPath = path.resolve(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// SPA Fallback for client routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), err => {
    if (err) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Sobuj Ghonta (সবুজ ঘণ্টা)</title></head>
          <body style="font-family:sans-serif;background:#0d140e;color:#e8f5e9;padding:2rem;text-align:center;">
            <h1>Sobuj Ghonta (সবুজ ঘণ্টা) — The Green Hour</h1>
            <p>API Server is running in ${config.nodeEnv} mode.</p>
            <p><a href="/health" style="color:#81c784;">/health</a> | <a href="/api/demo/dhaka" style="color:#81c784;">/api/demo/dhaka</a></p>
          </body>
        </html>
      `);
    }
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]:', err.stack);
  res.status(500).json({
    ok: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`[Sobuj Ghonta] Server listening on http://0.0.0.0:${config.port}`);
    console.log(`[Sobuj Ghonta] Mode: ${config.nodeEnv} | LLM: ${config.llmProvider} | TTS: ${config.ttsProvider}`);
  });
}

export default app;
