import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const vercelJsonPath = path.resolve(__dirname, '../vercel.json');

// Check for configured backend URL in environment variables (e.g. from Vercel Project Settings)
const rawBackendUrl = process.env.BACKEND_URL || process.env.VITE_BACKEND_URL;
let backendUrl = rawBackendUrl ? rawBackendUrl.trim().replace(/\/+$/, '') : null;

const rewrites = [];

if (backendUrl) {
  // Proxy /api/v1 requests to the target backend service
  // Preserves paths, query strings, headers, bodies, and HTTP methods without redirects
  rewrites.push({
    source: '/api/v1/:path*',
    destination: `${backendUrl}/api/v1/:path*`,
  });
}

// Fallback rule for Single Page Application routing
// Negative lookahead ensures /api/ requests are never intercepted by /index.html
rewrites.push({
  source: '/((?!api/).*)',
  destination: '/index.html',
});

const config = { rewrites };

fs.writeFileSync(vercelJsonPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');

if (backendUrl) {
  console.log(`[build-vercel-config] Configured API proxy rewrite -> ${backendUrl}/api/v1/:path*`);
} else {
  console.warn(
    '\x1b[33m[build-vercel-config] WARNING: No BACKEND_URL (or VITE_BACKEND_URL) provided in build environment.\x1b[0m\n' +
    '  - API reverse proxy rewrite was NOT generated.\n' +
    '  - In production on Vercel, set BACKEND_URL in Project Settings to route /api/v1 traffic to your backend.\n' +
    '  - Falling back to client-only SPA routing excluding /api/.'
  );
}
