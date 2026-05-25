import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    build: { outDir: 'dist' },
    plugins: [
      {
        name: 'shazam-proxy',
        configureServer(server) {
          server.middlewares.use('/api/shazam', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.end('Method Not Allowed');
              return;
            }

            const apiKey = env.RAPIDAPI_KEY;
            if (!apiKey) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'RAPIDAPI_KEY not set in .env' }));
              return;
            }

            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                const response = await fetch('https://shazam.p.rapidapi.com/songs/v2/detect', {
                  method: 'POST',
                  headers: {
                    'content-type': 'text/plain',
                    'X-RapidAPI-Key': apiKey,
                    'X-RapidAPI-Host': 'shazam.p.rapidapi.com'
                  },
                  body
                });
                const data = await response.json();
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              } catch (err) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message }));
              }
            });
          });
        }
      }
    ]
  };
});
