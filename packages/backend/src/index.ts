import 'dotenv/config'

// Catch unhandled errors to prevent crashes
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { serveStatic } from 'hono/bun'
import { createCorsMiddleware } from './middleware/cors.js'
import { AppError } from './lib/errors.js'
import intercambiosRoutes from './routes/intercambios.js'
import participantesRoutes from './routes/participantes.js'
import authRoutes from './routes/auth.js'
import sugerenciasRoutes from './routes/sugerencias.js'

const STATIC_DIR = process.env.STATIC_DIR || '../frontend/dist'

const app = new Hono()

// Middleware global
app.use('*', logger())
app.use('*', createCorsMiddleware())

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Montar rutas
app.route('/api/intercambios', intercambiosRoutes)
app.route('/api', participantesRoutes)
app.route('/api/auth', authRoutes)
app.route('/api/sugerencias', sugerenciasRoutes)

// Manejo global de errores
app.onError((err, c) => {
  console.error('Error:', err)

  if (err instanceof AppError) {
    return c.json(
      { success: false, error: err.message, code: err.code },
      err.status as 400 | 401 | 403 | 404 | 500
    )
  }

  return c.json(
    { success: false, error: 'Error interno del servidor' },
    500
  )
})

// Servir archivos estáticos del frontend
app.use('*', serveStatic({ root: STATIC_DIR }))

// SPA fallback - servir index.html para rutas no-API
app.notFound(async (c) => {
  const path = c.req.path

  // Si es una ruta de API, devolver 404 JSON
  if (path.startsWith('/api')) {
    return c.json({ success: false, error: 'Ruta no encontrada' }, 404)
  }

  // Para otras rutas, servir index.html (SPA routing)
  try {
    const indexPath = `${STATIC_DIR}/index.html`
    const file = Bun.file(indexPath)
    if (await file.exists()) {
      return c.html(await file.text())
    }
  } catch (e) {
    console.error('Error serving index.html:', e)
  }

  return c.json({ success: false, error: 'Ruta no encontrada' }, 404)
})

// Iniciar servidor con Bun nativo
const port = Number(process.env.PORT) || 3000

console.log(`Servidor iniciando en puerto ${port}...`)

const server = Bun.serve({
  port,
  fetch: app.fetch,
})

console.log(`Servidor corriendo en http://localhost:${server.port}`)
