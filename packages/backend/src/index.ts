import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { createCorsMiddleware } from './middleware/cors.js'
import { AppError } from './lib/errors.js'
import intercambiosRoutes from './routes/intercambios.js'
import participantesRoutes from './routes/participantes.js'
import authRoutes from './routes/auth.js'
import sugerenciasRoutes from './routes/sugerencias.js'

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

// 404
app.notFound((c) => {
  return c.json({ success: false, error: 'Ruta no encontrada' }, 404)
})

// Iniciar servidor
const port = Number(process.env.PORT) || 3000

console.log(`Servidor iniciando en puerto ${port}...`)

serve({
  fetch: app.fetch,
  port,
})

console.log(`Servidor corriendo en http://localhost:${port}`)
