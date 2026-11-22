// Ensure HMR is disabled in AI Studio dev environment unless explicitly configured
if (!process.env.DISABLE_HMR) {
  process.env.DISABLE_HMR = 'true';
}

import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApiRouter, getAdminCredentials } from './api/_auth.ts';

// Load environment variables from .env
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global resilience handlers to prevent unexpected process death on non-fatal events (e.g. WebSocket/HMR collisions)
process.on('uncaughtException', (err: any) => {
  const errMsg = String(err?.message || '');
  if (err?.code === 'EADDRINUSE' && (err?.port === 24678 || errMsg.includes('24678'))) {
    // Ignore harmless Vite HMR port collision
    return;
  }
  if (errMsg.includes('WebSocket') || errMsg.includes('ws') || err?.code === 'ECONNRESET') {
    // Ignore WebSocket connection resets or dev transport drops
    return;
  }
  console.error('[Server UncaughtException]', err);
});

process.on('unhandledRejection', (reason: any) => {
  const reasonStr = String(reason?.message || reason || '');
  if (reasonStr.includes('WebSocket') || reasonStr.includes('ECONNRESET')) {
    return;
  }
  console.error('[Server UnhandledRejection]', reason);
});

function resolvePort(): number {
  for (let i = 0; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--port' && process.argv[i + 1]) {
      const parsed = Number(process.argv[i + 1]);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    if (arg.startsWith('--port=')) {
      const parsed = Number(arg.split('=')[1]);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  }
  if (process.env.PORT) {
    const parsed = Number(process.env.PORT);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  // In dev / AI studio preview, the required default port is 3000
  return 3000;
}

function resolveHost(): string {
  for (let i = 0; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--host' && process.argv[i + 1]) {
      return process.argv[i + 1];
    }
    if (arg.startsWith('--host=')) {
      return arg.split('=')[1];
    }
  }
  return process.env.HOST || '0.0.0.0';
}

const PORT = resolvePort();
const HOST = resolveHost();
const app = express();
app.set('trust proxy', 1);

// Body parser
app.use(express.json());

// Security headers middleware
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Unified hardened API router
app.use('/api', createApiRouter());

// Return JSON 404 for unknown API routes instead of falling through to SPA HTML
app.all('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API endpoint not found.' });
});

function mountProductionStatic() {
  const distDir = path.resolve(__dirname, 'dist');
  const indexHtml = path.resolve(distDir, 'index.html');
  if (!fs.existsSync(indexHtml)) {
    console.warn('[Server Warning] dist/index.html not found. Run "npm run build" first.');
  }
  app.use(express.static(distDir, {
    maxAge: '1d',
    index: false,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else if (filePath.includes(`${path.sep}assets${path.sep}`) || filePath.includes('/assets/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));

  app.get('*', (req: Request, res: Response) => {
    // If request looks like a missing asset file (e.g. .js, .css, .png, etc.), return 404 instead of HTML
    if (req.path.startsWith('/assets/') || path.extname(req.path)) {
      res.status(404).json({ success: false, error: 'Asset not found' });
      return;
    }
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(indexHtml);
  });
}

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  let useProductionStatic = isProduction;

  if (!useProductionStatic) {
    try {
      // Mount Vite middleware in development without starting redundant WebSocket HMR
      const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
        watch: null,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);

    // Fallback for HTML navigation requests in SPA development mode
    app.use('*', async (req: Request, res: Response, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api/')) {
        return next();
      }
      try {
        const fs = await import('fs/promises');
        const indexPath = path.resolve(__dirname, 'index.html');
        let template = await fs.readFile(indexPath, 'utf-8');
        try {
          template = await vite.transformIndexHtml(url, template);
        } catch (viteTransformErr) {
          console.warn('[Vite Transform Notice]', viteTransformErr);
        }
        if (!res.headersSent) {
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        }
      } catch (e: any) {
        if (vite?.ssrFixStacktrace) {
          vite.ssrFixStacktrace(e);
        }
        if (!res.headersSent) {
          try {
            const fsPromises = await import('fs/promises');
            const indexPath = path.resolve(__dirname, 'index.html');
            const template = await fsPromises.readFile(indexPath, 'utf-8');
            res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
            return;
          } catch {}
          next(e);
        }
      }
    });
    } catch (viteImportErr: any) {
      if (viteImportErr?.code === 'ERR_MODULE_NOT_FOUND' && fs.existsSync(path.resolve(__dirname, 'dist', 'index.html'))) {
        console.warn('[Server Notice] Vite dev dependency not installed; serving built dist/ static bundle.');
        useProductionStatic = true;
      } else {
        throw viteImportErr;
      }
    }
  }

  if (useProductionStatic) {
    mountProductionStatic();
  }

  function listenWithRetry(port: number, host: string, retriesLeft = 10, delayMs = 500) {
    let currentServer: any = null;

    try {
      currentServer = app.listen(port, host, () => {
        const { adminEmail } = getAdminCredentials();
        console.log(`Server running on http://${host}:${port} (Admin ENV ready: ${adminEmail})`);
      });
    } catch (err: any) {
      if (err.code === 'EADDRINUSE' && retriesLeft > 0) {
        console.warn(`[Server Notice] Port ${port} temporarily in use. Retrying in ${delayMs}ms (${retriesLeft} retries left)...`);
        setTimeout(() => {
          listenWithRetry(port, host, retriesLeft - 1, Math.min(delayMs * 1.5, 2000));
        }, delayMs);
        return;
      }
      console.error(`Server synchronous listen error on port ${port}:`, err);
      return;
    }

    currentServer.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE' && retriesLeft > 0) {
        console.warn(`[Server Notice] Port ${port} temporarily in use (async). Retrying in ${delayMs}ms (${retriesLeft} retries left)...`);
        try {
          currentServer.close();
        } catch {}
        setTimeout(() => {
          listenWithRetry(port, host, retriesLeft - 1, Math.min(delayMs * 1.5, 2000));
        }, delayMs);
        return;
      }
      console.error(`Server runtime error on port ${port}:`, err);
    });

    const cleanup = () => {
      try {
        currentServer?.close(() => process.exit(0));
      } catch {
        process.exit(0);
      }
    };
    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
  }

  listenWithRetry(PORT, HOST);
}

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export { app, startServer };
export default app;
