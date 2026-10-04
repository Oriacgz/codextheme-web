import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import community from '../back-end/src/http/handler.js';
const backend = fileURLToPath(new URL('../back-end/', import.meta.url));
function middleware(server) {
  server.middlewares.use((req, res, next) =>
    req.url.split('?')[0] === '/api/community' ? community(req, res) : next(),
  );
}
export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, backend, ''));
  return {
    envDir: backend,
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'local-community-api',
        configureServer: middleware,
        configurePreviewServer: middleware,
      },
    ],
    build: { target: 'es2022' },
  };
});
