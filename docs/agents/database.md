# Agente: Database

Contexto especializado para el schema y queries en `packages/backend/src/db/`.

## Stack

- **ORM**: Drizzle (type-safe, SQL-like syntax)
- **Database**: PostgreSQL (Render managed)
- **Migraciones**: drizzle-kit

## Schema

```typescript
// packages/backend/src/db/schema.ts
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
  nombre: varchar('nombre', { length: 100 }).notNull(),
  fechaEvento: timestamp('fecha_evento').notNull(),
  tematica: varchar('tematica', { length: 200 }),
  precioBase: decimal('precio_base', { precision: 10, scale: 2 }).notNull(),
  reglaPrecio: reglaPrecioEnum('regla_precio').default('FIJO').notNull(),
  factorPrecio: decimal('factor_precio', { precision: 10, scale: 2 }).default('0'),
  estado: estadoIntercambioEnum('estado').default('BORRADOR').notNull(),
  adminToken: varchar('admin_token', { length: 64 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const participantes = pgTable('participantes', {
  id: uuid('id').defaultRandom().primaryKey(),
  intercambioId: uuid('intercambio_id').notNull().references(() => intercambios.id, { onDelete: 'cascade' }),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  color: varchar('color', { length: 20 }).notNull(),
  colorHex: varchar('color_hex', { length: 7 }).notNull(),
  colorEmoji: varchar('color_emoji', { length: 10 }).notNull(),
  magicToken: varchar('magic_token', { length: 64 }).notNull().unique(),
  magicTokenHash: varchar('magic_token_hash', { length: 128 }).notNull(),
  asignadoAId: uuid('asignado_a_id').references(() => participantes.id),
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
```

## Conexión

```typescript
// packages/backend/src/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

export const db = drizzle(pool, { schema })
```

## Queries Comunes

### Crear intercambio
```typescript
import { db } from '../db'
import { intercambios } from '../db/schema'
import { generateToken, hashToken } from '../lib/tokens'

async function crearIntercambio(data: CrearIntercambioInput) {
  const adminToken = generateToken()
  
  const [intercambio] = await db.insert(intercambios).values({
    nombre: data.nombre,
    fechaEvento: new Date(data.fechaEvento),
    tematica: data.tematica,
    precioBase: data.precioBase.toString(),
    reglaPrecio: data.reglaPrecio,
    factorPrecio: data.factorPrecio?.toString(),
    adminToken: hashToken(adminToken), // Guardamos hash
  }).returning()
  
  return {
    ...intercambio,
    adminToken, // Retornamos token plano (solo esta vez)
  }
}
```

### Obtener intercambio con participantes
```typescript
import { eq } from 'drizzle-orm'

async function getIntercambioCompleto(id: string) {
  return db.query.intercambios.findFirst({
    where: eq(intercambios.id, id),
    with: {
      participantes: {
        with: {
          asignadoA: true,
        },
      },
      exclusiones: {
        with: {
          participante: true,
          excluido: true,
        },
      },
    },
  })
}
```

### Agregar participante
```typescript
async function agregarParticipante(intercambioId: string, data: AgregarParticipanteInput) {
  const magicToken = generateToken()
  
  const [participante] = await db.insert(participantes).values({
    intercambioId,
    nombre: data.nombre,
    email: data.email,
    color: data.color,
    colorHex: data.colorHex,
    colorEmoji: data.colorEmoji,
    magicToken: magicToken.slice(0, 16), // Prefijo para lookup rápido
    magicTokenHash: hashToken(magicToken),
  }).returning()
  
  return { ...participante, magicToken }
}
```

### Guardar asignaciones del sorteo
```typescript
async function guardarAsignaciones(
  intercambioId: string,
  asignaciones: Map<string, string> // participanteId -> asignadoAId
) {
  await db.transaction(async (tx) => {
    // Actualizar cada participante con su asignación
    for (const [participanteId, asignadoAId] of asignaciones) {
      await tx
        .update(participantes)
        .set({ asignadoAId })
        .where(eq(participantes.id, participanteId))
    }
    
    // Actualizar estado del intercambio
    await tx
      .update(intercambios)
      .set({ estado: 'SORTEADO', updatedAt: new Date() })
      .where(eq(intercambios.id, intercambioId))
  })
}
```

### Obtener exclusiones para sorteo
```typescript
async function getExclusiones(intercambioId: string) {
  return db.query.exclusiones.findMany({
    where: eq(exclusiones.intercambioId, intercambioId),
    columns: {
      participanteId: true,
      excluidoId: true,
    },
  })
}
```

### Verificar magic token
```typescript
import { and, eq, like } from 'drizzle-orm'

async function verificarMagicToken(token: string) {
  const prefix = token.slice(0, 16)
  const hash = hashToken(token)
  
  const participante = await db.query.participantes.findFirst({
    where: and(
      like(participantes.magicToken, prefix),
      eq(participantes.magicTokenHash, hash)
    ),
    with: {
      intercambio: true,
    },
  })
  
  return participante
}
```

## Migraciones

```bash
# Generar migración después de cambiar schema
pnpm drizzle-kit generate:pg

# Aplicar migraciones
pnpm drizzle-kit push:pg

# Ver estado
pnpm drizzle-kit check:pg

# Studio visual
pnpm drizzle-kit studio
```

### Drizzle Config

```typescript
// packages/backend/drizzle.config.ts
import type { Config } from 'drizzle-kit'

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config
```

## Índices Recomendados

```sql
-- Para búsquedas frecuentes
CREATE INDEX idx_participantes_intercambio ON participantes(intercambio_id);
CREATE INDEX idx_participantes_email ON participantes(email);
CREATE INDEX idx_participantes_magic_token ON participantes(magic_token);
CREATE INDEX idx_exclusiones_intercambio ON exclusiones(intercambio_id);
CREATE INDEX idx_intercambios_admin_token ON intercambios(admin_token);
```

## Seguridad

- **Tokens**: Siempre hashear antes de guardar, usar SHA-256
- **Admin token**: Hash completo en DB, solo retornar plano al crear
- **Magic token**: Guardar prefijo para lookup + hash completo para verificación
- **Emails**: Considerar encriptar si hay requerimientos de privacidad
- **Soft delete**: Considerar agregar `deleted_at` para auditoría
