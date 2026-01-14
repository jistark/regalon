import { pgTable, uuid, varchar, timestamp, decimal, boolean, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Enums
export const estadoIntercambioEnum = pgEnum('estado_intercambio', [
  'BORRADOR',
  'ACTIVO',
  'SORTEADO',
  'FINALIZADO'
])

export const reglaPrecioEnum = pgEnum('regla_precio', [
  'FIJO',
  'SUBE_CON_PARTICIPANTES',
  'BAJA_CON_PARTICIPANTES'
])

// Tablas
export const intercambios = pgTable('intercambios', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 120 }).notNull().unique(),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  fechaEvento: timestamp('fecha_evento').notNull(),
  tematica: varchar('tematica', { length: 200 }),
  precioBase: decimal('precio_base', { precision: 10, scale: 2 }).notNull(),
  reglaPrecio: reglaPrecioEnum('regla_precio').default('FIJO').notNull(),
  factorPrecio: decimal('factor_precio', { precision: 10, scale: 2 }).default('0'),
  estado: estadoIntercambioEnum('estado').default('BORRADOR').notNull(),
  sessionToken: varchar('session_token', { length: 32 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const participantes = pgTable('participantes', {
  id: uuid('id').defaultRandom().primaryKey(),
  intercambioId: uuid('intercambio_id').notNull().references(() => intercambios.id, { onDelete: 'cascade' }),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  color: varchar('color', { length: 20 }),
  colorHex: varchar('color_hex', { length: 7 }),
  colorEmoji: varchar('color_emoji', { length: 10 }),
  magicToken: varchar('magic_token', { length: 64 }).notNull().unique(),
  asignadoAId: uuid('asignado_a_id'),
  haVistoResultado: boolean('ha_visto_resultado').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const exclusiones = pgTable('exclusiones', {
  id: uuid('id').defaultRandom().primaryKey(),
  intercambioId: uuid('intercambio_id').notNull().references(() => intercambios.id, { onDelete: 'cascade' }),
  participanteId: uuid('participante_id').notNull().references(() => participantes.id, { onDelete: 'cascade' }),
  excluidoId: uuid('excluido_id').notNull().references(() => participantes.id, { onDelete: 'cascade' }),
  razon: varchar('razon', { length: 200 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Relaciones
export const intercambiosRelations = relations(intercambios, ({ many }) => ({
  participantes: many(participantes),
  exclusiones: many(exclusiones),
}))

export const participantesRelations = relations(participantes, ({ one, many }) => ({
  intercambio: one(intercambios, {
    fields: [participantes.intercambioId],
    references: [intercambios.id],
  }),
  asignadoA: one(participantes, {
    fields: [participantes.asignadoAId],
    references: [participantes.id],
    relationName: 'asignacion',
  }),
  recibeDe: many(participantes, { relationName: 'asignacion' }),
  exclusionesComoOrigen: many(exclusiones, { relationName: 'origen' }),
  exclusionesComoDestino: many(exclusiones, { relationName: 'destino' }),
}))

export const exclusionesRelations = relations(exclusiones, ({ one }) => ({
  intercambio: one(intercambios, {
    fields: [exclusiones.intercambioId],
    references: [intercambios.id],
  }),
  participante: one(participantes, {
    fields: [exclusiones.participanteId],
    references: [participantes.id],
    relationName: 'origen',
  }),
  excluido: one(participantes, {
    fields: [exclusiones.excluidoId],
    references: [participantes.id],
    relationName: 'destino',
  }),
}))

// Types inferidos
export type Intercambio = typeof intercambios.$inferSelect
export type NewIntercambio = typeof intercambios.$inferInsert
export type Participante = typeof participantes.$inferSelect
export type NewParticipante = typeof participantes.$inferInsert
export type Exclusion = typeof exclusiones.$inferSelect
export type NewExclusion = typeof exclusiones.$inferInsert
