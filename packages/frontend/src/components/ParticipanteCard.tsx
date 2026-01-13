import { motion } from 'framer-motion'
import type { Participante } from 'shared'

interface ParticipanteCardProps {
  participante: Participante
  onRemove?: () => void
  showEmail?: boolean
  isSelected?: boolean
  onClick?: () => void
}

export function ParticipanteCard({
  participante,
  onRemove,
  showEmail = false,
  isSelected = false,
  onClick,
}: ParticipanteCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: onClick ? 1.02 : 1 }}
      onClick={onClick}
      className={`
        flex items-center gap-3 p-3 rounded-lg border transition-all
        ${onClick ? 'cursor-pointer' : ''}
        ${isSelected
          ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
          : 'border-gray-200 bg-white hover:border-gray-300'
        }
      `}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm"
        style={{ backgroundColor: participante.colorHex }}
      >
        {participante.colorEmoji}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">
          {participante.nombre}
        </p>
        {showEmail && (
          <p className="text-sm text-gray-500 truncate">
            {participante.email}
          </p>
        )}
        <p className="text-xs text-gray-400">
          Color: {participante.color}
        </p>
      </div>

      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
          aria-label="Eliminar participante"
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
    </motion.div>
  )
}
