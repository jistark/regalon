import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { verificarMagicToken } from '../middleware/auth.js'
import { UnauthorizedError } from '../lib/errors.js'

const app = new Hono()

const VerificarTokenSchema = z.object({
  token: z.string().min(1),
})

// Verificar magic token y obtener JWT
app.post(
  '/verificar',
  zValidator('json', VerificarTokenSchema),
  async (c) => {
    const { token } = c.req.valid('json')

    const participante = await verificarMagicToken(token)

    if (!participante) {
      throw new UnauthorizedError('Token inválido o expirado')
    }

    const jwtSecret = process.env.JWT_SECRET!
    const jwtToken = await sign(
      {
        participanteId: participante.id,
        intercambioId: participante.intercambioId,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 días
      },
      jwtSecret
    )

    return c.json({
      success: true,
      data: {
        token: jwtToken,
        participante: {
          id: participante.id,
          nombre: participante.nombre,
          color: participante.color,
          colorHex: participante.colorHex,
          colorEmoji: participante.colorEmoji,
        },
        intercambio: {
          id: participante.intercambio.id,
          nombre: participante.intercambio.nombre,
          estado: participante.intercambio.estado,
        },
      },
    })
  }
)

// Verificar token desde query param (para magic links)
app.get('/verificar', async (c) => {
  const token = c.req.query('token')

  if (!token) {
    throw new UnauthorizedError('Token requerido')
  }

  const participante = await verificarMagicToken(token)

  if (!participante) {
    throw new UnauthorizedError('Token inválido o expirado')
  }

  const jwtSecret = process.env.JWT_SECRET!
  const jwtToken = await sign(
    {
      participanteId: participante.id,
      intercambioId: participante.intercambioId,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    },
    jwtSecret
  )

  return c.json({
    success: true,
    data: {
      token: jwtToken,
      participante: {
        id: participante.id,
        nombre: participante.nombre,
        color: participante.color,
        colorHex: participante.colorHex,
        colorEmoji: participante.colorEmoji,
      },
      intercambio: {
        id: participante.intercambio.id,
        nombre: participante.intercambio.nombre,
        estado: participante.intercambio.estado,
      },
    },
  })
})

export default app
