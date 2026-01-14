import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../stores/auth'
import { api } from '../../lib/api'
import { RuletaAnimada } from '../../components/RuletaAnimada'
import { COLORES, type Participante, type SugerenciaRegalo } from 'shared'

type State = 'loading' | 'error' | 'ruleta' | 'resultado'

export function Revelar() {
  const navigate = useNavigate()
  const { jwt } = useAuthStore()

  const [state, setState] = useState<State>('loading')
  const [error, setError] = useState<string | null>(null)
  const [asignado, setAsignado] = useState<Participante | null>(null)
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [sugerencias, setSugerencias] = useState<SugerenciaRegalo[]>([])
  const [haVistoAntes, setHaVistoAntes] = useState(false)

  useEffect(() => {
    async function loadData() {
      if (!jwt) {
        navigate('/mi-intercambio')
        return
      }

      const result = await api.obtenerMiAsignacion()

      if (result.success) {
        setAsignado(result.data.asignadoA)
        setParticipantes(result.data.participantes)

        // Check if already seen
        const miIntercambio = await api.obtenerMiIntercambio()
        if (miIntercambio.success && miIntercambio.data.haVistoResultado) {
          setHaVistoAntes(true)
          setState('resultado')
        } else {
          setState('ruleta')
          // Mark as seen
          await api.marcarVisto()
        }

        // Load suggestions based on assignee name
        if (result.data.asignadoA) {
          const sugResult = await api.obtenerSugerencias(
            result.data.asignadoA.nombre,
            undefined
          )
          if (sugResult.success) {
            setSugerencias(sugResult.data.sugerencias)
          }
        }
      } else {
        setError(result.error)
        setState('error')
      }
    }

    loadData()
  }, [jwt, navigate])

  const handleRuletaComplete = () => {
    setState('resultado')
  }

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="card text-center max-w-md mx-auto">
        <div className="text-5xl mb-4">😕</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Algo salio mal
        </h1>
        <p className="text-gray-600 mb-4">{error}</p>
        <Link to="/mi-intercambio" className="btn-primary">
          Volver
        </Link>
      </div>
    )
  }

  if (state === 'ruleta' && asignado && participantes.length > 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card"
        >
          <RuletaAnimada
            participantes={participantes}
            asignado={asignado}
            onComplete={handleRuletaComplete}
          />
        </motion.div>
      </div>
    )
  }

  if (state === 'resultado' && asignado) {
    const colorInfo = COLORES.find((c) => c.nombre === asignado.color)

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card text-center"
        >
          {haVistoAntes && (
            <p className="text-sm text-gray-500 mb-4">
              Ya habias visto tu asignacion
            </p>
          )}

          <div className="text-6xl mb-4">🎁</div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Tu regalo es para:
          </h1>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="my-8"
          >
            <div
              className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center text-5xl shadow-lg"
              style={{ backgroundColor: colorInfo?.hex }}
            >
              {colorInfo?.emoji}
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              {asignado.nombre}
            </h2>
            <p className="text-gray-600 mt-1">
              Color: {asignado.color} {asignado.colorEmoji}
            </p>
          </motion.div>

          <div className="bg-primary-50 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-primary-800">
              Recuerda mantener el secreto! Solo tu sabes a quien le toca
              regalar.
            </p>
          </div>
        </motion.div>

        {/* Suggestions */}
        {sugerencias.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Ideas de regalos para {asignado.nombre}
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

        {/* Back button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <Link to="/mi-intercambio" className="btn-secondary">
            Volver a mi intercambio
          </Link>
        </motion.div>
      </div>
    )
  }

  return null
}
