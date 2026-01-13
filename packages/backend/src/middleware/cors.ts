import { cors } from 'hono/cors'

export function createCorsMiddleware() {
  const appUrl = process.env.APP_URL || 'http://localhost:5173'
  const isProduction = process.env.NODE_ENV === 'production'

  return cors({
    origin: isProduction ? appUrl : '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 86400,
    credentials: true,
  })
}
