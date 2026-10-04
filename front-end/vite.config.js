import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'local-community-api',
      async configureServer(server) {
        const backend = new URL('../back-end/', import.meta.url);
        Object.assign(process.env, loadEnv(mode, fileURLToPath(backend), ''));
        const moduleUrl = new URL('src/http/handler.js', backend).href;
        const { default: handler } = await import(/* @vite-ignore */ moduleUrl);
        server.middlewares.use((req, res, next) =>
          req.url.split('?')[0] === '/api/community' ? handler(req, res) : next(),
        );
      },
    },
  ],
  build: { target: 'es2022' },
}));
