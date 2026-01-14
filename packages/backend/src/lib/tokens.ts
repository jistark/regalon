import { randomBytes, createHash } from 'crypto'

export function generateToken(length = 32): string {
  return randomBytes(length).toString('hex')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

// Token de sesión más corto (12 bytes = 24 chars hex)
export function generateSessionToken(): string {
  return generateToken(12)
}

export function generateMagicToken(): string {
  return generateToken(32)
}

// Generar slug único a partir del nombre
export function generateSlug(nombre: string): string {
  const base = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^a-z0-9\s-]/g, '') // Solo letras, números, espacios, guiones
    .trim()
    .replace(/\s+/g, '-') // Espacios a guiones
    .replace(/-+/g, '-') // Múltiples guiones a uno
    .substring(0, 100)

  // Agregar sufijo aleatorio para evitar colisiones
  const suffix = randomBytes(3).toString('hex')
  return `${base}-${suffix}`
}
