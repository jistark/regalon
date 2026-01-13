import { randomBytes, createHash } from 'crypto'

export function generateToken(length = 32): string {
  return randomBytes(length).toString('hex')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function generateAdminToken(): string {
  return generateToken(32)
}

export function generateMagicToken(): string {
  return generateToken(32)
}
