import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AgregarParticipanteSchema,
  type AgregarParticipanteInput,
  type Intercambio,
  type Participante,
  type Exclusion,
  type ColorNombre,
} from 'shared'
import { api } from '../../lib/api'
import { ParticipanteCard } from '../../components/ParticipanteCard'
import { ColorPicker } from '../../components/ColorPicker'

type Tab = 'participantes' | 'exclusiones' | 'config'

export function Dashboard() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const adminToken = searchParams.get('admin_token') || ''

  const [intercambio, setIntercambio] = useState<Intercambio | null>(null)
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [exclusiones, setExclusiones] = useState<Exclusion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('participantes')

  // Exclusion modal state
  const [showExclusionModal, setShowExclusionModal] = useState(false)
  const [exclusionFrom, setExclusionFrom] = useState<string | null>(null)
  const [exclusionTo, setExclusionTo] = useState<string | null>(null)

  // Actions state
  const [isSorteando, setIsSorteando] = useState(false)
  const [isEnviando, setIsEnviando] = useState(false)

  const loadData = useCallback(async () => {
    if (!id || !adminToken) return

    const result = await api.obtenerIntercambio(id, adminToken)

    if (result.success) {
      setIntercambio(result.data.intercambio)
      setParticipantes(result.data.participantes)
      setExclusiones(result.data.exclusiones)
    } else {
      setError(result.error)
    }

    setIsLoading(false)
  }, [id, adminToken])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Add participant form
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AgregarParticipanteInput>({
    resolver: zodResolver(AgregarParticipanteSchema),
  })

  const selectedColor = watch('color')
  const usedColors = participantes.map((p) => p.color)

  const onAddParticipante = async (data: AgregarParticipanteInput) => {
    if (!id) return

    const result = await api.agregarParticipante(id, adminToken, data)

    if (result.success) {
      setParticipantes((prev) => [...prev, result.data.participante])
      reset()
    } else {
      setError(result.error)
    }
  }

  const onRemoveParticipante = async (participanteId: string) => {
    if (!id || !confirm('Estas seguro de eliminar a este participante?')) return

    const result = await api.eliminarParticipante(id, adminToken, participanteId)

    if (result.success) {
      setParticipantes((prev) => prev.filter((p) => p.id !== participanteId))
      setExclusiones((prev) =>
        prev.filter(
          (e) =>
            e.participante.id !== participanteId &&
            e.excluido.id !== participanteId
        )
      )
    } else {
      setError(result.error)
    }
  }

  const onAddExclusion = async () => {
    if (!id || !exclusionFrom || !exclusionTo) return

    const result = await api.agregarExclusion(id, adminToken, {
      participanteId: exclusionFrom,
      excluidoId: exclusionTo,
    })

    if (result.success) {
      setExclusiones((prev) => [...prev, result.data.exclusion])
      setShowExclusionModal(false)
      setExclusionFrom(null)
      setExclusionTo(null)
    } else {
      setError(result.error)
    }
  }

  const onRemoveExclusion = async (exclusionId: string) => {
    if (!id) return

    const result = await api.eliminarExclusion(id, adminToken, exclusionId)

    if (result.success) {
      setExclusiones((prev) => prev.filter((e) => e.id !== exclusionId))
    } else {
      setError(result.error)
    }
  }

  const onSortear = async () => {
    if (!id || !confirm('Una vez realizado el sorteo, no se puede deshacer. Continuar?')) return

    setIsSorteando(true)
    const result = await api.sortear(id, adminToken)
    setIsSorteando(false)

    if (result.success) {
      await loadData()
    } else {
      setError(result.error)
    }
  }

  const onEnviarInvitaciones = async () => {
    if (!id) return

    setIsEnviando(true)
    const result = await api.enviarInvitaciones(id, adminToken)
    setIsEnviando(false)

    if (result.success) {
      alert(`Se enviaron ${result.data.enviados} invitaciones`)
    } else {
      setError(result.error)
    }
  }

  const copyAdminLink = () => {
    const url = `${window.location.origin}/admin/${id}?admin_token=${adminToken}`
    navigator.clipboard.writeText(url)
    alert('Enlace copiado al portapapeles')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error && !intercambio) {
    return (
      <div className="card text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <p className="text-gray-600">
          Verifica que el enlace sea correcto y tengas permisos de administrador.
        </p>
      </div>
    )
  }

  if (!intercambio) return null

  const isSorteado = intercambio.estado === 'SORTEADO' || intercambio.estado === 'FINALIZADO'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {intercambio.nombre}
            </h1>
            <p className="text-gray-600">
              {new Date(intercambio.fechaEvento).toLocaleDateString('es-MX', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            {intercambio.tematica && (
              <p className="text-gray-500 text-sm">
                Tematica: {intercambio.tematica}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                isSorteado
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {intercambio.estado}
            </span>
            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
              ${intercambio.precioActual} MXN
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
          <button onClick={copyAdminLink} className="btn-secondary text-sm">
            Copiar enlace admin
          </button>

          {!isSorteado && participantes.length >= 3 && (
            <button
              onClick={onSortear}
              disabled={isSorteando}
              className="btn-primary text-sm"
            >
              {isSorteando ? 'Sorteando...' : 'Realizar sorteo'}
            </button>
          )}

          {isSorteado && (
            <button
              onClick={onEnviarInvitaciones}
              disabled={isEnviando}
              className="btn-primary text-sm"
            >
              {isEnviando ? 'Enviando...' : 'Enviar invitaciones'}
            </button>
          )}
        </div>
      </div>

      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between"
          >
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
            >
              Cerrar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['participantes', 'exclusiones', 'config'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'participantes' && ` (${participantes.length})`}
            {tab === 'exclusiones' && ` (${exclusiones.length})`}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === 'participantes' && (
          <motion.div
            key="participantes"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Add participant form */}
            {!isSorteado && (
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Agregar participante
                </h2>
                <form
                  onSubmit={handleSubmit(onAddParticipante)}
                  className="space-y-4"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="nombre" className="label">
                        Nombre
                      </label>
                      <input
                        id="nombre"
                        type="text"
                        {...register('nombre')}
                        placeholder="Juan Perez"
                        className="input"
                      />
                      {errors.nombre && (
                        <p className="error-text">{errors.nombre.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="email" className="label">
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        {...register('email')}
                        placeholder="juan@email.com"
                        className="input"
                      />
                      {errors.email && (
                        <p className="error-text">{errors.email.message}</p>
                      )}
                    </div>
                  </div>

                  <ColorPicker
                    value={selectedColor}
                    onChange={(color) => setValue('color', color)}
                    usedColors={usedColors as ColorNombre[]}
                    error={errors.color?.message}
                  />

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary"
                  >
                    {isSubmitting ? 'Agregando...' : 'Agregar participante'}
                  </button>
                </form>
              </div>
            )}

            {/* Participants list */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Participantes
              </h2>
              {participantes.length === 0 ? (
                <p className="text-gray-500">
                  No hay participantes aun. Agrega al menos 3 para hacer el
                  sorteo.
                </p>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  <AnimatePresence>
                    {participantes.map((p) => (
                      <ParticipanteCard
                        key={p.id}
                        participante={p}
                        showEmail
                        onRemove={!isSorteado ? () => onRemoveParticipante(p.id) : undefined}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'exclusiones' && (
          <motion.div
            key="exclusiones"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="card"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Exclusiones
              </h2>
              {!isSorteado && participantes.length >= 2 && (
                <button
                  onClick={() => setShowExclusionModal(true)}
                  className="btn-secondary text-sm"
                >
                  Agregar exclusion
                </button>
              )}
            </div>

            <p className="text-gray-600 mb-4">
              Define quien NO puede regalar a quien (ej: parejas, familiares).
            </p>

            {exclusiones.length === 0 ? (
              <p className="text-gray-500">No hay exclusiones configuradas.</p>
            ) : (
              <div className="space-y-2">
                {exclusiones.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                        style={{ backgroundColor: e.participante.colorHex }}
                      >
                        {e.participante.colorEmoji}
                      </div>
                      <span className="font-medium">
                        {e.participante.nombre}
                      </span>
                      <span className="text-gray-400">no puede regalar a</span>
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                        style={{ backgroundColor: e.excluido.colorHex }}
                      >
                        {e.excluido.colorEmoji}
                      </div>
                      <span className="font-medium">{e.excluido.nombre}</span>
                    </div>
                    {!isSorteado && (
                      <button
                        onClick={() => onRemoveExclusion(e.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'config' && (
          <motion.div
            key="config"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="card"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Configuracion
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Presupuesto base</dt>
                <dd className="font-medium">${intercambio.precioBase} MXN</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Presupuesto actual</dt>
                <dd className="font-medium">${intercambio.precioActual} MXN</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Regla de precio</dt>
                <dd className="font-medium">{intercambio.reglaPrecio}</dd>
              </div>
              {intercambio.factorPrecio && (
                <div>
                  <dt className="text-sm text-gray-500">
                    Factor por participante
                  </dt>
                  <dd className="font-medium">
                    ${intercambio.factorPrecio} MXN
                  </dd>
                </div>
              )}
            </dl>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exclusion Modal */}
      <AnimatePresence>
        {showExclusionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowExclusionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl p-6 max-w-lg w-full"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Agregar exclusion
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="label">No puede regalar:</label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-auto">
                    {participantes.map((p) => (
                      <ParticipanteCard
                        key={p.id}
                        participante={p}
                        isSelected={exclusionFrom === p.id}
                        onClick={() => setExclusionFrom(p.id)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label">A:</label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-auto">
                    {participantes
                      .filter((p) => p.id !== exclusionFrom)
                      .map((p) => (
                        <ParticipanteCard
                          key={p.id}
                          participante={p}
                          isSelected={exclusionTo === p.id}
                          onClick={() => setExclusionTo(p.id)}
                        />
                      ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    onClick={() => setShowExclusionModal(false)}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={onAddExclusion}
                    disabled={!exclusionFrom || !exclusionTo}
                    className="btn-primary"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
