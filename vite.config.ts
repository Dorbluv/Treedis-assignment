import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readDevVars } from './worker/devVars';

/** Serves POST /api/summary in local dev with the same handler the Worker uses. */
function summaryApi(): Plugin {
  return {
    name: 'summary-api',
    configureServer(server) {
      let cache: unknown;
      server.middlewares.use('/api/summary', (req, res) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', async () => {
          try {
            const mod = await server.ssrLoadModule('/worker/summary.ts');
            cache ??= mod.memoryCache();
            const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
            const request = new Request('http://localhost/api/summary', {
              method: req.method,
              body: hasBody ? Buffer.concat(chunks) : undefined,
            });
            const response: Response = await mod.handleSummary(request, readDevVars(), fetch, cache);
            res.statusCode = response.status;
            res.setHeader('content-type', 'application/json; charset=utf-8');
            res.end(await response.text());
          } catch {
            res.statusCode = 500;
            res.end('{"error":"server_error"}');
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), summaryApi()],
});
