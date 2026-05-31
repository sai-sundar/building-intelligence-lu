import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const require = createRequire(import.meta.url)
const dirname = path.dirname(fileURLToPath(import.meta.url))

// Dev-only middleware: serve the Vercel serverless functions under `npm run dev`
// so the map AND the Gemini risk narrative work locally with one command — no
// Vercel CLI required. Production is unaffected; Vercel runs the real /api files.
function localApiPlugin() {
  return {
    name: 'local-api',
    configureServer(server) {
      // Load the repo-root .env (GEMINI_API_KEY) into process.env for the handlers.
      try {
        process.loadEnvFile(path.resolve(dirname, '../.env'))
      } catch {
        // No .env — the narrative falls back gracefully and the map still works.
      }

      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''
        if (!url.startsWith('/api/')) return next()

        const pathname = url.split('?')[0]
        const query = {}
        let handlerFile

        if (pathname === '/api/communes') {
          handlerFile = '../api/communes.js'
        } else if (pathname.startsWith('/api/commune/')) {
          handlerFile = '../api/commune/[code].js'
          query.code = decodeURIComponent(pathname.slice('/api/commune/'.length))
        } else {
          return next()
        }

        // Minimal Vercel-style req/res shim over Node's http objects.
        req.query = query
        res.status = (code) => { res.statusCode = code; return res }
        res.json = (obj) => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(obj))
          return res
        }
        res.send = (body) => { res.end(body); return res }

        try {
          const handlerPath = require.resolve(path.resolve(dirname, handlerFile))
          delete require.cache[handlerPath] // reflect handler edits without a restart
          const handler = require(handlerPath)
          await handler(req, res)
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'dev_api_error', message: String(err?.message || err) }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localApiPlugin()],
})
