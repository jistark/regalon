import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { CrearIntercambioSchema, type CrearIntercambioInput } from 'shared'
import { api } from '../../lib/api'

export function CrearIntercambio() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CrearIntercambioInput>({
    resolver: zodResolver(CrearIntercambioSchema),
    defaultValues: {
      reglaPrecio: 'FIJO',
      precioBase: 300,
    },
  })

  const reglaPrecio = watch('reglaPrecio')

  const onSubmit = async (data: CrearIntercambioInput) => {
    setIsLoading(true)
    setError(null)

    const result = await api.crearIntercambio({
      ...data,
      fechaEvento: new Date(data.fechaEvento).toISOString(),
    })

    setIsLoading(false)

    if (result.success) {
      // Navigate to admin dashboard with admin token
      navigate(`/admin/${result.data.intercambio.id}?admin_token=${result.data.adminToken}`)
    } else {
      setError(result.error)
    }
  }

  // Get tomorrow's date as minimum
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  return (
    <div className="max-w-xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Crear nuevo intercambio
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Nombre */}
          <div>
            <label htmlFor="nombre" className="label">
              Nombre del intercambio
            </label>
            <input
              id="nombre"
              type="text"
              {...register('nombre')}
              placeholder="Ej: Navidad Familia 2024"
              className="input"
            />
            {errors.nombre && (
              <p className="error-text">{errors.nombre.message}</p>
            )}
          </div>

          {/* Fecha */}
          <div>
            <label htmlFor="fechaEvento" className="label">
              Fecha del evento
            </label>
            <input
              id="fechaEvento"
              type="datetime-local"
              {...register('fechaEvento')}
              min={minDate}
              className="input"
            />
            {errors.fechaEvento && (
              <p className="error-text">{errors.fechaEvento.message}</p>
            )}
          </div>

          {/* Tematica */}
          <div>
            <label htmlFor="tematica" className="label">
              Tematica (opcional)
            </label>
            <input
              id="tematica"
              type="text"
              {...register('tematica')}
              placeholder="Ej: Algo hecho a mano, tecnologia, libros..."
              className="input"
            />
            {errors.tematica && (
              <p className="error-text">{errors.tematica.message}</p>
            )}
          </div>

          {/* Precio */}
          <div>
            <label htmlFor="precioBase" className="label">
              Presupuesto base (MXN)
            </label>
            <input
              id="precioBase"
              type="number"
              {...register('precioBase', { valueAsNumber: true })}
              placeholder="300"
              min={1}
              className="input"
            />
            {errors.precioBase && (
              <p className="error-text">{errors.precioBase.message}</p>
            )}
          </div>

          {/* Regla de precio */}
          <div>
            <label className="label">Regla de precio</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="FIJO"
                  {...register('reglaPrecio')}
                  className="text-primary-600"
                />
                <span className="text-gray-700">Precio fijo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="SUBE_CON_PARTICIPANTES"
                  {...register('reglaPrecio')}
                  className="text-primary-600"
                />
                <span className="text-gray-700">
                  Sube con mas participantes
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="BAJA_CON_PARTICIPANTES"
                  {...register('reglaPrecio')}
                  className="text-primary-600"
                />
                <span className="text-gray-700">
                  Baja con mas participantes
                </span>
              </label>
            </div>
          </div>

          {/* Factor de precio */}
          {reglaPrecio !== 'FIJO' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <label htmlFor="factorPrecio" className="label">
                Factor por participante (MXN)
              </label>
              <input
                id="factorPrecio"
                type="number"
                {...register('factorPrecio', { valueAsNumber: true })}
                placeholder="50"
                min={0}
                className="input"
              />
              <p className="text-sm text-gray-500 mt-1">
                {reglaPrecio === 'SUBE_CON_PARTICIPANTES'
                  ? 'Se sumara este monto por cada participante extra (despues de 5)'
                  : 'Se restara este monto por cada participante (minimo $200)'}
              </p>
            </motion.div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Creando...
              </span>
            ) : (
              'Crear intercambio'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
