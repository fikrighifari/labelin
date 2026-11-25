import { defineConfig, loadEnv, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { endpoint } from './server/cloud.js'

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const plugins = [react(), tailwindcss()];
  try {
    // @ts-expect-error The optional workspace instrumentation is provided by the preview host.
    const m = await import('./.vite-source-tags.js');
    plugins.push(m.sourceTags());
  } catch { /* Standalone builds work without the preview instrumentation. */ }

  const env = loadEnv(mode, process.cwd(), ['VITE_', 'NEXT_PUBLIC_']);
  // Vite reads .env.local for the client, but server middleware reads process.env.
  // Keep these settings server-only; never put them in `define` or `envPrefix`.
  const serverEnv = loadEnv(mode, process.cwd(), ['DATABASE_URL', 'GOOGLE_CLIENT_ID', 'LABELIN_ALLOWED_ORIGINS']);
  for (const key of ['DATABASE_URL', 'GOOGLE_CLIENT_ID', 'LABELIN_ALLOWED_ORIGINS', 'VITE_GOOGLE_CLIENT_ID']) {
    const value = serverEnv[key] || env[key];
    if (!process.env[key] && value) process.env[key] = value;
  }
  const processEnvDefines: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    processEnvDefines[`process.env.${key}`] = JSON.stringify(value);
  }

  return {
    plugins: [...plugins, { name: 'labelin-cloud-api', configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/account', endpoint('account'));
      server.middlewares.use('/api/workspace', endpoint('workspace'));
    } }],
    server: {fs:{deny:['.env','.env.*','**/server/**','**/CLOUD-SETUP.local.md','**/.git/**','*.{crt,pem}']}},
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    define: processEnvDefines,
  };
})
