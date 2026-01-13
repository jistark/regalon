// Schemas de validación compartidos entre frontend y backend
import { z } from 'zod'

// Enums
export const EstadoIntercambio = z.enum([
  'BORRADOR',
  'ACTIVO',
  'SORTEADO',
  'FINALIZADO'
])
export type EstadoIntercambio = z.infer<typeof EstadoIntercambio>

export const ReglaPrecio = z.enum([
  'FIJO',
  'SUBE_CON_PARTICIPANTES',
  'BAJA_CON_PARTICIPANTES'
])
export type ReglaPrecio = z.infer<typeof ReglaPrecio>

// Colores disponibles
export const COLORES = [
  { nombre: 'Rojo', hex: '#ef4444', emoji: '🔴' },
  { nombre: 'Azul', hex: '#3b82f6', emoji: '🔵' },
  { nombre: 'Verde', hex: '#22c55e', emoji: '🟢' },
  { nombre: 'Amarillo', hex: '#eab308', emoji: '🟡' },
  { nombre: 'Morado', hex: '#a855f7', emoji: '🟣' },
  { nombre: 'Naranja', hex: '#f97316', emoji: '🟠' },
  { nombre: 'Rosa', hex: '#ec4899', emoji: '💗' },
  { nombre: 'Café', hex: '#92400e', emoji: '🟤' },
  { nombre: 'Negro', hex: '#1f2937', emoji: '⚫' },
  { nombre: 'Blanco', hex: '#f3f4f6', emoji: '⚪' },
] as const

export const ColorNombre = z.enum([
  'Rojo', 'Azul', 'Verde', 'Amarillo', 'Morado',
  'Naranja', 'Rosa', 'Café', 'Negro', 'Blanco'
])
export type ColorNombre = z.infer<typeof ColorNombre>

// Schemas de entrada (requests)
export const CrearIntercambioSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(100),
  fechaEvento: z.string().min(1, 'La fecha es requerida').refine(
    (val) => !isNaN(Date.parse(val)),
    'Fecha inválida'
  ),
  tematica: z.string().max(200).optional(),
  precioBase: z.number().positive('El precio debe ser mayor a 0'),
  reglaPrecio: ReglaPrecio.default('FIJO'),
  factorPrecio: z.number().min(0).optional(),
})
export type CrearIntercambioInput = z.infer<typeof CrearIntercambioSchema>

export const ActualizarIntercambioSchema = CrearIntercambioSchema.partial()
export type ActualizarIntercambioInput = z.infer<typeof ActualizarIntercambioSchema>

export const AgregarParticipanteSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(100),
  email: z.string().email('Email inválido'),
  color: ColorNombre,
})
export type AgregarParticipanteInput = z.infer<typeof AgregarParticipanteSchema>

export const AgregarExclusionSchema = z.object({
  participanteId: z.string().uuid(),
  excluidoId: z.string().uuid(),
  razon: z.string().max(200).optional(),
})
export type AgregarExclusionInput = z.infer<typeof AgregarExclusionSchema>

export const SolicitarAccesoSchema = z.object({
  email: z.string().email('Email inválido'),
  intercambioId: z.string().uuid(),
})
export type SolicitarAccesoInput = z.infer<typeof SolicitarAccesoSchema>

// Schemas de salida (responses)
export const IntercambioSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string(),
  fechaEvento: z.string().datetime(),
  tematica: z.string().nullable(),
  precioBase: z.number(),
  precioActual: z.number(), // Calculado según regla y participantes
  reglaPrecio: ReglaPrecio,
  factorPrecio: z.number().nullable(),
  estado: EstadoIntercambio,
  totalParticipantes: z.number(),
  createdAt: z.string().datetime(),
})
export type Intercambio = z.infer<typeof IntercambioSchema>

export const ParticipanteSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string(),
  email: z.string().email(),
  color: ColorNombre,
  colorHex: z.string(),
  colorEmoji: z.string(),
  haVistoResultado: z.boolean(),
})
export type Participante = z.infer<typeof ParticipanteSchema>

export const ParticipanteConAsignacionSchema = ParticipanteSchema.extend({
  asignadoA: ParticipanteSchema.nullable(),
})
export type ParticipanteConAsignacion = z.infer<typeof ParticipanteConAsignacionSchema>

export const ExclusionSchema = z.object({
  id: z.string().uuid(),
  participante: ParticipanteSchema,
  excluido: ParticipanteSchema,
  razon: z.string().nullable(),
})
export type Exclusion = z.infer<typeof ExclusionSchema>

export const SugerenciaRegaloSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  precio: z.number(),
  imagen: z.string().url(),
  link: z.string().url(),
  tienda: z.string(),
})
export type SugerenciaRegalo = z.infer<typeof SugerenciaRegaloSchema>

// API Response wrapper
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.discriminatedUnion('success', [
    z.object({ success: z.literal(true), data: dataSchema }),
    z.object({ success: z.literal(false), error: z.string() }),
  ])

// Utilidades
export function getColorInfo(nombre: ColorNombre) {
  return COLORES.find(c => c.nombre === nombre)!
}

export function calcularPrecio(
  precioBase: number,
  reglaPrecio: ReglaPrecio,
  factorPrecio: number | null,
  numParticipantes: number
): number {
  const factor = factorPrecio ?? 0

  switch (reglaPrecio) {
    case 'FIJO':
      return precioBase

    case 'SUBE_CON_PARTICIPANTES':
      // Ej: $200 base + $50 por cada participante extra después de 5
      const extras = Math.max(0, numParticipantes - 5)
      return precioBase + (extras * factor)

    case 'BAJA_CON_PARTICIPANTES':
      // Ej: $500 base - $30 por participante (mínimo $200)
      const descuento = (numParticipantes - 1) * factor
      return Math.max(200, precioBase - descuento)
  }
}
