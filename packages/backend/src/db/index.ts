import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema.js'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

// Handle pool errors to prevent process crash
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err)
})

// Test connection on startup
pool.query('SELECT 1').then(() => {
  console.log('Database connected successfully')
}).catch((err) => {
  console.error('Database connection failed:', err.message)
})

export const db = drizzle(pool, { schema })

export * from './schema.js'
