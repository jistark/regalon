import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface EnviarInvitacionParams {
  email: string
  nombre: string
  intercambioNombre: string
  magicToken: string
  fechaEvento: Date
  tematica?: string | null
}

export async function enviarInvitacion({
  email,
  nombre,
  intercambioNombre,
  magicToken,
  fechaEvento,
  tematica,
}: EnviarInvitacionParams) {
  const appUrl = process.env.APP_URL || 'http://localhost:5173'
  const url = `${appUrl}/mi-intercambio?token=${magicToken}`

  const fechaFormateada = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(fechaEvento)

  const { error } = await resend.emails.send({
    from: 'Intercambio Secreto <noreply@tudominio.com>',
    to: email,
    subject: `${nombre}, tienes una invitación para "${intercambioNombre}"`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h1 style="color: #1a1a1a; margin: 0 0 24px 0; font-size: 24px;">
            ¡Hola ${nombre}!
          </h1>

          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
            Has sido invitado al intercambio de regalos:
          </p>

          <div style="background: #f8f8f8; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
            <h2 style="color: #1a1a1a; margin: 0 0 8px 0; font-size: 20px;">
              ${intercambioNombre}
            </h2>
            <p style="color: #666; margin: 0; font-size: 14px;">
              ${fechaFormateada}
              ${tematica ? `<br>Tema: ${tematica}` : ''}
            </p>
          </div>

          <a href="${url}" style="display: block; background: #2563eb; color: white; text-decoration: none; padding: 14px 24px; border-radius: 8px; text-align: center; font-weight: 600; font-size: 16px;">
            Ver mi intercambio
          </a>

          <p style="color: #888; font-size: 12px; margin: 24px 0 0 0; text-align: center;">
            Este enlace es personal y no debes compartirlo con nadie.
          </p>
        </div>
      </body>
      </html>
    `,
  })

  if (error) {
    throw new Error(`Error enviando email: ${error.message}`)
  }
}

export async function enviarRecordatorio({
  email,
  nombre,
  intercambioNombre,
  magicToken,
  fechaEvento,
}: Omit<EnviarInvitacionParams, 'tematica'>) {
  const appUrl = process.env.APP_URL || 'http://localhost:5173'
  const url = `${appUrl}/mi-intercambio?token=${magicToken}`

  const fechaFormateada = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(fechaEvento)

  const { error } = await resend.emails.send({
    from: 'Intercambio Secreto <noreply@tudominio.com>',
    to: email,
    subject: `Recordatorio: El sorteo de "${intercambioNombre}" ya fue realizado`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px;">
          <h1 style="color: #1a1a1a; margin: 0 0 16px 0;">
            ¡${nombre}, el sorteo ya fue realizado!
          </h1>

          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
            Entra a ver a quién te tocó regalar en "${intercambioNombre}".
          </p>

          <p style="color: #666; font-size: 14px;">
            Recuerda: el intercambio es el ${fechaFormateada}
          </p>

          <a href="${url}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 14px 24px; border-radius: 8px; font-weight: 600; margin-top: 16px;">
            Revelar mi asignación
          </a>
        </div>
      </body>
      </html>
    `,
  })

  if (error) {
    throw new Error(`Error enviando email: ${error.message}`)
  }
}
