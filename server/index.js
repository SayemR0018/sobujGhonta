import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { apiRouter } from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust reverse proxy (essential for Render and rate limiting)
app.set('trust proxy', 1);

// Security Headers with tailored Content Security Policy
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        mediaSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: [
          "'self'",
          'https://api.open-meteo.com',
          'https://air-quality-api.open-meteo.com',
          'https://geocoding-api.open-meteo.com',
          'https://overpass-api.de',
          'https://generativelanguage.googleapis.com',
          'https://router.huggingface.co',
          'https://api-inference.huggingface.co'
        ]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// Compression Middleware (Gzip & Brotli)
app.use(compression());

// CORS - scoped to same origin or app domains
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      // Allow any localhost origin during dev, or Render domains
      if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('.onrender.com')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true
  })
);

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check (Lightweight, 0 external API calls for Render Blueprint monitoring)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    tts: config.ttsProvider,
    llm: config.llmProvider
  });
});

// API Rate Limiting (120 requests per 15 mins per IP)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: 'Too many requests from this IP. Please wait a few moments before trying again.'
  }
});

// API Routes
app.use('/api', apiLimiter, apiRouter);

// Production Static Asset Serving with Optimized Cache Headers
const clientDistPath = path.resolve(__dirname, '../client/dist');
const clientIndexPath = path.join(clientDistPath, 'index.html');

// Automated build safeguard: if index.html is missing on startup, compile frontend
if (!fs.existsSync(clientIndexPath) && process.env.NODE_ENV !== 'test') {
  console.log('[Sobuj Ghonta] Notice: client/dist/index.html not found! Triggering automatic frontend build...');
  try {
    execSync('npm run build --workspace=client', { stdio: 'inherit' });
    console.log('[Sobuj Ghonta] Frontend build completed successfully.');
  } catch (buildErr) {
    console.error('[Sobuj Ghonta] Failed to auto-build frontend:', buildErr.message);
  }
}

app.use(
  express.static(clientDistPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html') || filePath.endsWith('sw.js')) {
        // App Shell and Service Worker: never cache so updates take effect immediately
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else if (filePath.match(/\.(js|css|wav|svg|png|jpg|webp|woff2)$/)) {
        // Immutable hashed assets and static audio clips: cache for 1 year
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  })
);

// SPA Fallback: Never shadow /api or /health
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/health') {
    return next();
  }
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(clientIndexPath, err => {
    if (err) {
      console.error('[Static Serve Error] Failed to send index.html:', err.message);
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Sobuj Ghonta (সবুজ ঘণ্টা)</title></head>
          <body style="font-family:sans-serif;background:#0d140e;color:#e8f5e9;padding:2rem;text-align:center;">
            <h1>Sobuj Ghonta (সবুজ ঘণ্টা) — The Green Hour</h1>
            <p>API Server is running in ${config.nodeEnv} mode.</p>
            <p style="color:#ef5350;">Notice: Static client build not found (checked ${clientIndexPath}).</p>
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

// Start Server with Graceful Shutdown
let server = null;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`[Sobuj Ghonta] Server listening on http://0.0.0.0:${config.port}`);
    console.log(`[Sobuj Ghonta] Mode: ${config.nodeEnv} | LLM: ${config.llmProvider} | TTS: ${config.ttsProvider}`);
  });

  const handleShutdown = signal => {
    console.log(`[Sobuj Ghonta] ${signal} signal received. Closing HTTP server gracefully...`);
    if (server) {
      server.close(() => {
        console.log('[Sobuj Ghonta] Server shut down cleanly.');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

export default app;
