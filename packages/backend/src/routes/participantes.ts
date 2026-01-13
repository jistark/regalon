import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, participantes } from '../db/index.js'
import { requireParticipante } from '../middleware/auth.js'
import { calcularPrecio } from 'shared'

const app = new Hono()

// Obtener mi intercambio
app.get('/mi-intercambio', requireParticipante, async (c) => {
  const participanteData = c.get('participante')

  const participante = await db.query.participantes.findFirst({
    where: eq(participantes.id, participanteData.id),
    with: {
      intercambio: {
        with: {
          participantes: {
            columns: {
              id: true,
              nombre: true,
              color: true,
              colorHex: true,
              colorEmoji: true,
            },
          },
        },
      },
    },
  })

  if (!participante) {
    return c.json({ success: false, error: 'Participante no encontrado' }, 404)
  }

  const { intercambio } = participante
  const numParticipantes = intercambio.participantes.length

  const precioActual = calcularPrecio(
    Number(intercambio.precioBase),
    intercambio.reglaPrecio,
    intercambio.factorPrecio ? Number(intercambio.factorPrecio) : null,
    numParticipantes
  )

  return c.json({
    success: true,
    data: {
      intercambio: {
        id: intercambio.id,
        nombre: intercambio.nombre,
        fechaEvento: intercambio.fechaEvento,
        tematica: intercambio.tematica,
        precioActual,
        estado: intercambio.estado,
        totalParticipantes: numParticipantes,
      },
      yo: {
        id: participante.id,
        nombre: participante.nombre,
        color: participante.color,
        colorHex: participante.colorHex,
        colorEmoji: participante.colorEmoji,
        haVistoResultado: participante.haVistoResultado,
      },
      participantes: intercambio.participantes.map(p => ({
        id: p.id,
        nombre: p.nombre,
        color: p.color,
        colorHex: p.colorHex,
        colorEmoji: p.colorEmoji,
      })),
    },
  })
})

// Obtener mi asignación (a quién me tocó)
app.get('/mi-asignacion', requireParticipante, async (c) => {
  const participanteData = c.get('participante')

  const participante = await db.query.participantes.findFirst({
    where: eq(participantes.id, participanteData.id),
    with: {
      intercambio: true,
      asignadoA: {
        columns: {
          id: true,
          nombre: true,
          color: true,
          colorHex: true,
          colorEmoji: true,
        },
      },
    },
  })

  if (!participante) {
    return c.json({ success: false, error: 'Participante no encontrado' }, 404)
  }

  if (participante.intercambio.estado !== 'SORTEADO' && participante.intercambio.estado !== 'FINALIZADO') {
    return c.json({
      success: false,
      error: 'El sorteo aún no ha sido realizado',
    }, 400)
  }

  if (!participante.asignadoA) {
    return c.json({
      success: false,
      error: 'No tienes asignación',
    }, 400)
  }

  return c.json({
    success: true,
    data: {
      asignadoA: participante.asignadoA,
    },
  })
})

// Marcar que ya vi mi asignación
app.post('/marcar-visto', requireParticipante, async (c) => {
  const participanteData = c.get('participante')

  await db
    .update(participantes)
    .set({ haVistoResultado: true })
    .where(eq(participantes.id, participanteData.id))

  return c.json({ success: true })
})

export default app
