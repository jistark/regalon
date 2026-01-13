import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { buscarProductos } from '../services/productos.js'

const app = new Hono()

const BuscarSchema = z.object({
  q: z.string().min(1).max(100),
  precio_min: z.coerce.number().positive().optional(),
  precio_max: z.coerce.number().positive().optional(),
  limit: z.coerce.number().min(1).max(20).optional(),
})

app.get(
  '/',
  zValidator('query', BuscarSchema),
  async (c) => {
    const { q, precio_min, precio_max, limit } = c.req.valid('query')

    const sugerencias = await buscarProductos({
      query: q,
      precioMin: precio_min,
      precioMax: precio_max,
      limit,
    })

    return c.json({
      success: true,
      data: sugerencias,
    })
  }
)

export default app
