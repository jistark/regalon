import { motion } from 'framer-motion'
import { COLORES, type ColorNombre } from 'shared'

interface ColorPickerProps {
  value: ColorNombre | null
  onChange: (color: ColorNombre) => void
  usedColors?: ColorNombre[]
  error?: string
}

export function ColorPicker({
  value,
  onChange,
  usedColors = [],
  error,
}: ColorPickerProps) {
  return (
    <div className="space-y-2">
      <label className="label">Color identificador</label>
      <div className="flex flex-wrap gap-2">
        {COLORES.map((color) => {
          const isUsed = usedColors.includes(color.nombre as ColorNombre)
          const isSelected = value === color.nombre

          return (
            <motion.button
              key={color.nombre}
              type="button"
              disabled={isUsed}
              onClick={() => onChange(color.nombre as ColorNombre)}
              whileHover={{ scale: isUsed ? 1 : 1.1 }}
              whileTap={{ scale: isUsed ? 1 : 0.95 }}
              className={`
                w-10 h-10 rounded-full flex items-center justify-center
                transition-all relative
                ${isUsed
                  ? 'opacity-30 cursor-not-allowed'
                  : 'cursor-pointer hover:shadow-md'
                }
                ${isSelected
                  ? 'ring-2 ring-offset-2 ring-primary-500'
                  : ''
                }
              `}
              style={{ backgroundColor: color.hex }}
              title={isUsed ? `${color.nombre} (usado)` : color.nombre}
            >
              <span className="text-sm">{color.emoji}</span>
              {isUsed && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-0.5 bg-gray-500 rotate-45 absolute" />
                </div>
              )}
            </motion.button>
          )
        })}
      </div>
      {error && <p className="error-text">{error}</p>}
      {value && (
        <p className="text-sm text-gray-600">
          Color seleccionado: <span className="font-medium">{value}</span>
        </p>
      )}
    </div>
  )
}
