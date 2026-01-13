import { z } from 'zod'

const ProductoMLSchema = z.object({
  id: z.string(),
  title: z.string(),
  price: z.number(),
  thumbnail: z.string(),
  permalink: z.string(),
})

const BusquedaMLSchema = z.object({
  results: z.array(ProductoMLSchema),
})

export interface Sugerencia {
  id: string
  titulo: string
  precio: number
  imagen: string
  link: string
  tienda: string
}

interface BuscarProductosParams {
  query: string
  precioMin?: number
  precioMax?: number
  limit?: number
}

// Cache simple en memoria
const cache = new Map<string, { data: Sugerencia[]; timestamp: number }>()
const CACHE_TTL = 60 * 60 * 1000 // 1 hora

export async function buscarProductos({
  query,
  precioMin,
  precioMax,
  limit = 10,
}: BuscarProductosParams): Promise<Sugerencia[]> {
  const cacheKey = `${query}-${precioMin}-${precioMax}-${limit}`

  // Revisar cache
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  // Construir URL
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  })

  if (precioMin !== undefined || precioMax !== undefined) {
    const min = precioMin ?? 0
    const max = precioMax ?? ''
    params.set('price', `${min}-${max}`)
  }

  const url = `https://api.mercadolibre.com/sites/MLM/search?${params}`

  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Mercado Libre API error: ${response.status}`)
    }

    const json = await response.json()
    const parsed = BusquedaMLSchema.parse(json)

    const sugerencias: Sugerencia[] = parsed.results.map(p => ({
      id: p.id,
      titulo: p.title,
      precio: p.price,
      imagen: p.thumbnail.replace('http://', 'https://'),
      link: p.permalink,
      tienda: 'Mercado Libre',
    }))

    // Guardar en cache
    cache.set(cacheKey, { data: sugerencias, timestamp: Date.now() })

    // Limpiar cache viejo
    for (const [key, value] of cache.entries()) {
      if (Date.now() - value.timestamp > CACHE_TTL) {
        cache.delete(key)
      }
    }

    return sugerencias
  } catch (error) {
    console.error('Error buscando productos:', error)
    return []
  }
}
