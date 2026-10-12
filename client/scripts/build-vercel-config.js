import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const vercelJsonPath = path.resolve(__dirname, '../vercel.json');

// Check for configured backend URL in environment variables (e.g. from Vercel Project Settings)
const rawBackendUrl = process.env.BACKEND_URL || process.env.VITE_BACKEND_URL;
let backendUrl = rawBackendUrl ? rawBackendUrl.trim().replace(/\/+$/, '') : null;

// If BACKEND_URL environment variable is provided, update vercel.json dynamically
if (backendUrl) {
  const config = {
    rewrites: [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
      {
        source: '/((?!api/).*)',
        destination: '/index.html',
      },
    ],
  };
  fs.writeFileSync(vercelJsonPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  console.log(`[build-vercel-config] Configured API proxy rewrite -> ${backendUrl}/api/v1/:path*`);
} else {
  // If BACKEND_URL is not provided, inspect existing vercel.json
  if (fs.existsSync(vercelJsonPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf-8'));
      const hasApiRewrite =
        Array.isArray(existing.rewrites) &&
        existing.rewrites.some((r) => r.source === '/api/v1/:path*' && r.destination);

      if (hasApiRewrite) {
        console.log('[build-vercel-config] Preserving existing static API proxy rewrite in vercel.json.');
        process.exit(0);
      }
    } catch {
      // If parsing fails, fall through to default fallback
    }
  }

  // Fallback only if no existing vercel.json or no API rewrite configured
  const fallbackConfig = {
    rewrites: [
      {
        source: '/((?!api/).*)',
        destination: '/index.html',
      },
    ],
  };
  fs.writeFileSync(vercelJsonPath, JSON.stringify(fallbackConfig, null, 2) + '\n', 'utf-8');
  console.warn(
    '\x1b[33m[build-vercel-config] WARNING: No BACKEND_URL provided and no existing API rewrite found in vercel.json.\x1b[0m\n' +
    '  - Falling back to client-only SPA routing excluding /api/.'
  );
}
