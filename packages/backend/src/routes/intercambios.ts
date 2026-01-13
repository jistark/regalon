import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, intercambios, participantes, exclusiones } from '../db/index.js'
import { requireAdmin } from '../middleware/auth.js'
import { generateAdminToken, generateMagicToken, hashToken } from '../lib/tokens.js'
import { NotFoundError, ValidationError, IntercambioYaSorteadoError } from '../lib/errors.js'
import { realizarSorteo, validarExclusiones } from '../services/sorteo.js'
import { enviarInvitacion } from '../services/email.js'
import {
  CrearIntercambioSchema,
  ActualizarIntercambioSchema,
  AgregarParticipanteSchema,
  AgregarExclusionSchema,
  getColorInfo,
  calcularPrecio,
} from 'shared'

const app = new Hono()

// Crear intercambio
app.post(
  '/',
  zValidator('json', CrearIntercambioSchema),
  async (c) => {
    const data = c.req.valid('json')
    const adminToken = generateAdminToken()

    const [intercambio] = await db.insert(intercambios).values({
      nombre: data.nombre,
      fechaEvento: new Date(data.fechaEvento),
      tematica: data.tematica,
      precioBase: data.precioBase.toString(),
      reglaPrecio: data.reglaPrecio,
      factorPrecio: data.factorPrecio?.toString(),
      adminToken: hashToken(adminToken),
    }).returning()

    const appUrl = process.env.APP_URL || 'http://localhost:5173'

    return c.json({
      success: true,
      data: {
        id: intercambio.id,
        adminToken,
        adminUrl: `${appUrl}/admin/${intercambio.id}?admin_token=${adminToken}`,
      },
    }, 201)
  }
)

// Obtener intercambio (admin)
app.get('/:id', requireAdmin, async (c) => {
  const intercambio = c.get('intercambio')

  const data = await db.query.intercambios.findFirst({
    where: eq(intercambios.id, intercambio.id),
    with: {
      participantes: {
        columns: {
          magicToken: false,
        },
      },
      exclusiones: {
        with: {
          participante: {
            columns: { id: true, nombre: true, color: true },
          },
          excluido: {
            columns: { id: true, nombre: true, color: true },
          },
        },
      },
    },
  })

  const numParticipantes = data?.participantes.length || 0
  const precioActual = calcularPrecio(
    Number(data?.precioBase || 0),
    data?.reglaPrecio || 'FIJO',
    data?.factorPrecio ? Number(data.factorPrecio) : null,
    numParticipantes
  )

  return c.json({
    success: true,
    data: {
      ...data,
      precioBase: Number(data?.precioBase),
      factorPrecio: data?.factorPrecio ? Number(data.factorPrecio) : null,
      precioActual,
    },
  })
})

// Actualizar intercambio
app.put(
  '/:id',
  requireAdmin,
  zValidator('json', ActualizarIntercambioSchema),
  async (c) => {
    const intercambio = c.get('intercambio')
    const data = c.req.valid('json')

    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (data.nombre) updateData.nombre = data.nombre
    if (data.fechaEvento) updateData.fechaEvento = new Date(data.fechaEvento)
    if (data.tematica !== undefined) updateData.tematica = data.tematica
    if (data.precioBase) updateData.precioBase = data.precioBase.toString()
    if (data.reglaPrecio) updateData.reglaPrecio = data.reglaPrecio
    if (data.factorPrecio !== undefined) updateData.factorPrecio = data.factorPrecio?.toString()

    const [updated] = await db
      .update(intercambios)
      .set(updateData)
      .where(eq(intercambios.id, intercambio.id))
      .returning()

    return c.json({ success: true, data: updated })
  }
)

// Eliminar intercambio
app.delete('/:id', requireAdmin, async (c) => {
  const intercambio = c.get('intercambio')

  await db.delete(intercambios).where(eq(intercambios.id, intercambio.id))

  return c.json({ success: true })
})

// Agregar participante
app.post(
  '/:id/participantes',
  requireAdmin,
  zValidator('json', AgregarParticipanteSchema),
  async (c) => {
    const intercambio = c.get('intercambio')
    const data = c.req.valid('json')

    // Verificar que el intercambio no esté sorteado
    if (intercambio.estado === 'SORTEADO' || intercambio.estado === 'FINALIZADO') {
      throw new ValidationError('No se pueden agregar participantes después del sorteo')
    }

    // Verificar email único en este intercambio
    const existente = await db.query.participantes.findFirst({
      where: eq(participantes.email, data.email),
    })

    if (existente && existente.intercambioId === intercambio.id) {
      throw new ValidationError('Ya existe un participante con ese email en este intercambio')
    }

    const colorInfo = getColorInfo(data.color)
    const magicToken = generateMagicToken()

    const [participante] = await db.insert(participantes).values({
      intercambioId: intercambio.id,
      nombre: data.nombre,
      email: data.email,
      color: data.color,
      colorHex: colorInfo.hex,
      colorEmoji: colorInfo.emoji,
      magicToken: hashToken(magicToken),
    }).returning()

    return c.json({
      success: true,
      data: {
        id: participante.id,
        nombre: participante.nombre,
        email: participante.email,
        color: participante.color,
        colorHex: participante.colorHex,
        colorEmoji: participante.colorEmoji,
      },
    }, 201)
  }
)

// Eliminar participante
app.delete('/:id/participantes/:pid', requireAdmin, async (c) => {
  const intercambio = c.get('intercambio')
  const participanteId = c.req.param('pid')

  if (intercambio.estado === 'SORTEADO' || intercambio.estado === 'FINALIZADO') {
    throw new ValidationError('No se pueden eliminar participantes después del sorteo')
  }

  const result = await db
    .delete(participantes)
    .where(eq(participantes.id, participanteId))
    .returning()

  if (result.length === 0) {
    throw new NotFoundError('Participante')
  }

  return c.json({ success: true })
})

// Agregar exclusión
app.post(
  '/:id/exclusiones',
  requireAdmin,
  zValidator('json', AgregarExclusionSchema),
  async (c) => {
    const intercambio = c.get('intercambio')
    const data = c.req.valid('json')

    if (intercambio.estado === 'SORTEADO' || intercambio.estado === 'FINALIZADO') {
      throw new ValidationError('No se pueden agregar exclusiones después del sorteo')
    }

    if (data.participanteId === data.excluidoId) {
      throw new ValidationError('Un participante no puede excluirse a sí mismo')
    }

    const [exclusion] = await db.insert(exclusiones).values({
      intercambioId: intercambio.id,
      participanteId: data.participanteId,
      excluidoId: data.excluidoId,
      razon: data.razon,
    }).returning()

    return c.json({ success: true, data: exclusion }, 201)
  }
)

// Eliminar exclusión
app.delete('/:id/exclusiones/:eid', requireAdmin, async (c) => {
  const intercambio = c.get('intercambio')
  const exclusionId = c.req.param('eid')

  if (intercambio.estado === 'SORTEADO' || intercambio.estado === 'FINALIZADO') {
    throw new ValidationError('No se pueden eliminar exclusiones después del sorteo')
  }

  const result = await db
    .delete(exclusiones)
    .where(eq(exclusiones.id, exclusionId))
    .returning()

  if (result.length === 0) {
    throw new NotFoundError('Exclusión')
  }

  return c.json({ success: true })
})

// Realizar sorteo
app.post('/:id/sortear', requireAdmin, async (c) => {
  const intercambioData = c.get('intercambio')

  if (intercambioData.estado === 'SORTEADO' || intercambioData.estado === 'FINALIZADO') {
    throw new IntercambioYaSorteadoError()
  }

  // Obtener datos completos
  const intercambio = await db.query.intercambios.findFirst({
    where: eq(intercambios.id, intercambioData.id),
    with: {
      participantes: true,
      exclusiones: true,
    },
  })

  if (!intercambio || intercambio.participantes.length < 2) {
    throw new ValidationError('Se necesitan al menos 2 participantes para el sorteo')
  }

  // Validar que sea posible
  const validacion = validarExclusiones(
    intercambio.participantes.map(p => ({ id: p.id, nombre: p.nombre })),
    intercambio.exclusiones.map(e => ({ participanteId: e.participanteId, excluidoId: e.excluidoId }))
  )

  if (!validacion.valido) {
    throw new ValidationError(`No se puede realizar el sorteo: ${validacion.problemas.join(', ')}`)
  }

  // Realizar sorteo
  const resultado = realizarSorteo(
    intercambio.participantes.map(p => ({ id: p.id, nombre: p.nombre })),
    intercambio.exclusiones.map(e => ({ participanteId: e.participanteId, excluidoId: e.excluidoId }))
  )

  if (!resultado.success) {
    throw new ValidationError(resultado.error)
  }

  // Guardar asignaciones en transacción
  await db.transaction(async (tx) => {
    for (const [deId, paraId] of resultado.asignaciones) {
      await tx
        .update(participantes)
        .set({ asignadoAId: paraId })
        .where(eq(participantes.id, deId))
    }

    await tx
      .update(intercambios)
      .set({ estado: 'SORTEADO', updatedAt: new Date() })
      .where(eq(intercambios.id, intercambio.id))
  })

  return c.json({
    success: true,
    data: { total: resultado.asignaciones.size },
  })
})

// Enviar invitaciones
app.post('/:id/enviar-invitaciones', requireAdmin, async (c) => {
  const intercambioData = c.get('intercambio')

  const intercambio = await db.query.intercambios.findFirst({
    where: eq(intercambios.id, intercambioData.id),
    with: {
      participantes: true,
    },
  })

  if (!intercambio || intercambio.participantes.length === 0) {
    throw new ValidationError('No hay participantes para enviar invitaciones')
  }

  // Regenerar magic tokens y enviar emails
  const enviados: string[] = []
  const errores: string[] = []

  for (const participante of intercambio.participantes) {
    const magicToken = generateMagicToken()

    try {
      // Actualizar token en DB
      await db
        .update(participantes)
        .set({ magicToken: hashToken(magicToken) })
        .where(eq(participantes.id, participante.id))

      // Enviar email
      await enviarInvitacion({
        email: participante.email,
        nombre: participante.nombre,
        intercambioNombre: intercambio.nombre,
        magicToken,
        fechaEvento: intercambio.fechaEvento,
        tematica: intercambio.tematica,
      })

      enviados.push(participante.email)
    } catch (error) {
      errores.push(`${participante.email}: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  // Actualizar estado si estaba en borrador
  if (intercambio.estado === 'BORRADOR') {
    await db
      .update(intercambios)
      .set({ estado: 'ACTIVO', updatedAt: new Date() })
      .where(eq(intercambios.id, intercambio.id))
  }

  return c.json({
    success: true,
    data: {
      enviados: enviados.length,
      errores,
    },
  })
})

// Ver estado del intercambio
app.get('/:id/estado', requireAdmin, async (c) => {
  const intercambioData = c.get('intercambio')

  const intercambio = await db.query.intercambios.findFirst({
    where: eq(intercambios.id, intercambioData.id),
    with: {
      participantes: {
        columns: {
          id: true,
          nombre: true,
          color: true,
          colorHex: true,
          colorEmoji: true,
          haVistoResultado: true,
        },
      },
    },
  })

  return c.json({
    success: true,
    data: {
      estado: intercambio?.estado,
      participantes: intercambio?.participantes.map(p => ({
        ...p,
        haVistoResultado: intercambio.estado === 'SORTEADO' ? p.haVistoResultado : null,
      })),
    },
  })
})

export default app
