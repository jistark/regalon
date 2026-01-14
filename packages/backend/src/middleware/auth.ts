import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'
import { eq } from 'drizzle-orm'
import { db, intercambios, participantes } from '../db/index.js'
import { hashToken } from '../lib/tokens.js'
import { UnauthorizedError, NotFoundError } from '../lib/errors.js'

type ParticipantePayload = {
  participanteId: string
  intercambioId: string
}

type AdminContext = {
  intercambio: typeof intercambios.$inferSelect
}

type ParticipanteContext = {
  participante: typeof participantes.$inferSelect & { intercambio: typeof intercambios.$inferSelect }
}

// Middleware para verificar session_token (query param)
export const requireSession = createMiddleware<{ Variables: AdminContext }>(async (c, next) => {
  const sessionToken = c.req.query('session_token')

  if (!sessionToken) {
    throw new UnauthorizedError('Se requiere session_token')
  }

  const hashedToken = hashToken(sessionToken)

  const intercambio = await db.query.intercambios.findFirst({
    where: eq(intercambios.sessionToken, hashedToken),
  })

  if (!intercambio) {
    throw new NotFoundError('Intercambio')
  }

  c.set('intercambio', intercambio)
  await next()
})

// Alias for backwards compatibility
export const requireAdmin = requireSession

// Middleware para verificar JWT de participante
export const requireParticipante = createMiddleware<{ Variables: ParticipanteContext }>(async (c, next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Se requiere token de autorización')
  }

  const token = authHeader.slice(7)
  const jwtSecret = process.env.JWT_SECRET!

  try {
    const payload = await verify(token, jwtSecret, 'HS256') as ParticipantePayload

    const participante = await db.query.participantes.findFirst({
      where: eq(participantes.id, payload.participanteId),
      with: {
        intercambio: true,
      },
    })

    if (!participante) {
      throw new UnauthorizedError('Participante no encontrado')
    }

    c.set('participante', participante)
    await next()
  } catch {
    throw new UnauthorizedError('Token inválido o expirado')
  }
})

// Middleware para verificar magic_token y retornar JWT
export async function verificarMagicToken(token: string) {
  const hashedToken = hashToken(token)

  const participante = await db.query.participantes.findFirst({
    where: eq(participantes.magicToken, hashedToken),
    with: {
      intercambio: true,
    },
  })

  return participante
}
