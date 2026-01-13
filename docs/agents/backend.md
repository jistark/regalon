# Agente: Backend

Contexto especializado para trabajar en `packages/backend/`.

## Stack

- **Runtime**: Node.js 20+
- **Framework**: Hono (ligero, tipado, edge-ready)
- **ORM**: Drizzle (type-safe, SQL-like)
- **Validación**: Zod (compartido con frontend)
- **Email**: Resend SDK

## Estructura

```
packages/backend/
├── src/
│   ├── index.ts              # Entry point, app Hono
│   ├── routes/
│   │   ├── intercambios.ts   # CRUD intercambios
│   │   ├── participantes.ts  # Gestión participantes
│   │   ├── auth.ts           # Magic links, verificación
│   │   └── sugerencias.ts    # Proxy a Mercado Libre
│   ├── services/
│   │   ├── sorteo.ts         # Algoritmo de sorteo
│   │   ├── email.ts          # Envío via Resend
│   │   ├── productos.ts      # Fetch Mercado Libre
│   │   └── precio.ts         # Cálculo precio dinámico
│   ├── middleware/
│   │   ├── auth.ts           # Verificar tokens
│   │   ├── rateLimit.ts      # Rate limiting
│   │   └── cors.ts           # CORS config
│   ├── db/
│   │   ├── index.ts          # Conexión Drizzle
│   │   ├── schema.ts         # Definición de tablas
│   │   └── migrations/       # SQL migrations
│   └── lib/
│       ├── errors.ts         # Clases de error
│       └── tokens.ts         # Generación/hash tokens
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```

## Endpoints

### Intercambios (requiere admin_token)
```typescript
// POST /api/intercambios
// Crear nuevo intercambio
{
  nombre: string,
  fecha_evento: string,      // ISO date
  tematica?: string,
  precio_base: number,
  regla_precio: 'FIJO' | 'SUBE_CON_PARTICIPANTES' | 'BAJA_CON_PARTICIPANTES',
  factor_precio?: number
}
// Response: { success: true, data: { id, admin_token, invite_url } }

// GET /api/intercambios/:id?admin_token=XXX
// PUT /api/intercambios/:id?admin_token=XXX
// DELETE /api/intercambios/:id?admin_token=XXX

// POST /api/intercambios/:id/participantes?admin_token=XXX
{ nombre: string, email: string }

// POST /api/intercambios/:id/exclusiones?admin_token=XXX
{ participante_id: string, excluido_id: string, razon?: string }

// POST /api/intercambios/:id/sortear?admin_token=XXX
// POST /api/intercambios/:id/enviar-invitaciones?admin_token=XXX

// GET /api/intercambios/:id/estado?admin_token=XXX
// Response: lista de participantes con asignaciones oscurecidas
```

### Auth (público)
```typescript
// POST /api/auth/solicitar-acceso
{ email: string, intercambio_id: string }
// Envía magic link al email

// GET /api/auth/verificar?token=XXX
// Valida token, retorna JWT de sesión
```

### Participante (requiere JWT)
```typescript
// GET /api/mi-intercambio
// Info del intercambio + mi estado

// GET /api/mi-asignacion
// A quién me tocó (solo si sorteado)

// POST /api/marcar-visto
// Marca que ya vi mi asignación
```

### Sugerencias (público con rate limit)
```typescript
// GET /api/sugerencias?precio=500&q=tecnologia
// Proxy a Mercado Libre con cache
```

## Patrones de Código

### Ruta típica con Hono
```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const app = new Hono()

const crearIntercambioSchema = z.object({
  nombre: z.string().min(1).max(100),
  fecha_evento: z.string().datetime(),
  precio_base: z.number().positive(),
  // ...
})

app.post(
  '/intercambios',
  zValidator('json', crearIntercambioSchema),
  async (c) => {
    const data = c.req.valid('json')
    
    try {
      const result = await intercambioService.crear(data)
      return c.json({ success: true, data: result })
    } catch (error) {
      if (error instanceof AppError) {
        return c.json({ success: false, error: error.message }, error.status)
      }
      throw error
    }
  }
)
```

### Middleware de auth
```typescript
import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'

export const requireAuth = createMiddleware(async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  
  if (!token) {
    return c.json({ success: false, error: 'No autorizado' }, 401)
  }
  
  try {
    const payload = await verify(token, c.env.JWT_SECRET)
    c.set('participante', payload)
    await next()
  } catch {
    return c.json({ success: false, error: 'Token inválido' }, 401)
  }
})
```

### Servicio de email
```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function enviarMagicLink(email: string, token: string, intercambio: string) {
  const url = `${process.env.APP_URL}/verificar?token=${token}`
  
  await resend.emails.send({
    from: 'Intercambio Secreto <noreply@tudominio.com>',
    to: email,
    subject: `Tu invitación al intercambio "${intercambio}"`,
    html: `
      <h1>¡Estás invitado!</h1>
      <p>Haz clic para acceder a tu intercambio:</p>
      <a href="${url}" style="...">Ver mi intercambio</a>
    `
  })
}
```

## Manejo de Errores

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public status: number = 400,
    public code?: string
  ) {
    super(message)
  }
}

export class NotFoundError extends AppError {
  constructor(recurso: string) {
    super(`${recurso} no encontrado`, 404, 'NOT_FOUND')
  }
}

export class SorteoImposibleError extends AppError {
  constructor() {
    super(
      'No es posible realizar el sorteo con las exclusiones actuales',
      400,
      'SORTEO_IMPOSIBLE'
    )
  }
}
```

## Testing

```bash
# En packages/backend/
pnpm test           # Vitest
pnpm test:watch     # Watch mode
```

Usar `vitest` + `supertest` para tests de integración de rutas.
