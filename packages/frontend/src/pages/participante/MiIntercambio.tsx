import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../stores/auth'
import { api } from '../../lib/api'
import type { Intercambio, Participante, SugerenciaRegalo } from 'shared'

export function MiIntercambio() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const { jwt, verificarToken, isLoading: authLoading } = useAuthStore()

  const [intercambio, setIntercambio] = useState<Intercambio | null>(null)
  const [participante, setParticipante] = useState<Participante | null>(null)
  const [haVistoResultado, setHaVistoResultado] = useState(false)
  const [sugerencias, setSugerencias] = useState<SugerenciaRegalo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Verify magic token on mount
  useEffect(() => {
    async function init() {
      if (token && !jwt) {
        const success = await verificarToken(token)
        if (!success) {
          setError('El enlace no es valido o ha expirado')
          setIsLoading(false)
          return
        }
      }
    }
    init()
  }, [token, jwt, verificarToken])

  // Load exchange info once authenticated
  useEffect(() => {
    async function loadData() {
      if (!jwt && !authLoading) {
        if (!token) {
          setError('No tienes acceso a esta pagina')
        }
        setIsLoading(false)
        return
      }

      if (!jwt) return

      const result = await api.obtenerMiIntercambio()

      if (result.success) {
        setIntercambio(result.data.intercambio)
        setParticipante(result.data.participante)
        setHaVistoResultado(result.data.haVistoResultado)

        // Load suggestions
        if (result.data.intercambio.tematica) {
          const sugResult = await api.obtenerSugerencias(
            result.data.intercambio.tematica,
            result.data.intercambio.precioActual
          )
          if (sugResult.success) {
            setSugerencias(sugResult.data.sugerencias)
          }
        }
      } else {
        setError(result.error)
      }

      setIsLoading(false)
    }

    loadData()
  }, [jwt, authLoading, token])

  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Verificando acceso...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card text-center max-w-md mx-auto">
        <div className="text-5xl mb-4">🔐</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Acceso denegado
        </h1>
        <p className="text-gray-600 mb-4">{error}</p>
        <Link to="/" className="btn-primary">
          Ir al inicio
        </Link>
      </div>
    )
  }

  if (!intercambio || !participante) return null

  const isSorteado =
    intercambio.estado === 'SORTEADO' || intercambio.estado === 'FINALIZADO'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Welcome card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card text-center"
      >
        <div
          className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl shadow-lg"
          style={{ backgroundColor: participante.colorHex }}
        >
          {participante.colorEmoji}
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Hola, {participante.nombre}!
        </h1>
        <p className="text-gray-600">
          Tu color secreto es{' '}
          <span className="font-medium">{participante.color}</span>
        </p>
      </motion.div>

      {/* Exchange info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card"
      >
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {intercambio.nombre}
        </h2>

        <dl className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📅</span>
            <div>
              <dt className="text-sm text-gray-500">Fecha del evento</dt>
              <dd className="font-medium">
                {new Date(intercambio.fechaEvento).toLocaleDateString('es-MX', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </dd>
            </div>
          </div>

          {intercambio.tematica && (
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎨</span>
              <div>
                <dt className="text-sm text-gray-500">Tematica</dt>
                <dd className="font-medium">{intercambio.tematica}</dd>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <span className="text-2xl">💰</span>
            <div>
              <dt className="text-sm text-gray-500">Presupuesto</dt>
              <dd className="font-medium">${intercambio.precioActual} MXN</dd>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-2xl">👥</span>
            <div>
              <dt className="text-sm text-gray-500">Participantes</dt>
              <dd className="font-medium">{intercambio.totalParticipantes}</dd>
            </div>
          </div>
        </dl>
      </motion.div>

      {/* Reveal button or result */}
      {isSorteado && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card text-center"
        >
          {haVistoResultado ? (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Ya revelaste tu asignacion
              </h2>
              <p className="text-gray-600 mb-4">
                Puedes volver a verla cuando quieras
              </p>
              <button
                onClick={() => navigate('/revelar')}
                className="btn-secondary"
              >
                Ver mi asignacion
              </button>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">🎁</div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                El sorteo ya se realizo!
              </h2>
              <p className="text-gray-600 mb-4">
                Descubre a quien le vas a regalar
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/revelar')}
                className="btn-primary text-lg px-8 py-3"
              >
                Revelar mi asignacion
              </motion.button>
            </>
          )}
        </motion.div>
      )}

      {!isSorteado && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card text-center bg-yellow-50 border-yellow-200"
        >
          <div className="text-5xl mb-4">⏳</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Esperando el sorteo
          </h2>
          <p className="text-gray-600">
            El organizador aun no ha realizado el sorteo. Te notificaremos cuando
            este listo.
          </p>
        </motion.div>
      )}

      {/* Suggestions */}
      {sugerencias.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Ideas de regalos
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {sugerencias.slice(0, 6).map((s) => (
              <a
                key={s.id}
                href={s.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-2">
                  <img
                    src={s.imagen}
                    alt={s.titulo}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <p className="text-sm font-medium text-gray-900 line-clamp-2">
                  {s.titulo}
                </p>
                <p className="text-sm text-primary-600">${s.precio}</p>
              </a>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
