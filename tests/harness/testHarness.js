/**
 * tests/harness/testHarness.js
 * In-memory test harness and ephemeral server managers.
 */

import http from 'node:http';

// Set test environment globally
process.env.NODE_ENV = 'test';

/**
 * Spawns an ephemeral Express test server on an OS-assigned dynamic port (port 0)
 */
export async function startAppServer() {
  process.env.NODE_ENV = 'test';
  const { default: app } = await import('../../server/index.js');

  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve({
        server,
        baseUrl,
        port: addr.port,
        close: () => new Promise(res => server.close(res))
      });
    });
    server.on('error', reject);
  });
}

/**
 * Spawns an ephemeral mock Python ML sidecar server on port 0
 * Implements Interface Contracts: /health, /forecast, /anomaly
 */
export async function startMockSidecarServer(customHandlers = {}) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://${req.headers.host}`);

      if (req.method === 'GET' && url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', model: 'TabPFN-v2.0', mode: 'local' }));
        return;
      }

      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        let parsed = {};
        try { parsed = JSON.parse(body || '{}'); } catch {}

        if (req.method === 'POST' && url.pathname === '/forecast') {
          if (customHandlers.forecast) {
            return customHandlers.forecast(parsed, req, res);
          }
          const horizon = parsed.horizonHours || 24;
          const p10 = Array.from({ length: horizon }, (_, i) => 50 + i * 0.8);
          const p50 = Array.from({ length: horizon }, (_, i) => 65 + i * 0.9);
          const p90 = Array.from({ length: horizon }, (_, i) => 80 + i * 1.0);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            ok: true,
            model: 'TabPFN-v2.0',
            version: '2.0.4',
            quantiles: { p10, p50, p90 },
            agreement: 0.94
          }));
          return;
        }

        if (req.method === 'POST' && url.pathname === '/anomaly') {
          if (customHandlers.anomaly) {
            return customHandlers.anomaly(parsed, req, res);
          }
          const isSmoky = (parsed.current?.pm25 || 0) > 100;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            detected: isSmoky,
            severity: isSmoky ? 'warning' : 'info',
            message: isSmoky ? 'Unusually smoky relative to history' : 'Normal conditions',
            safetyRelevant: isSmoky
          }));
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Not Found' }));
      });
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve({
        server,
        baseUrl,
        port: addr.port,
        close: () => new Promise(res => server.close(res))
      });
    });
    server.on('error', reject);
  });
}
