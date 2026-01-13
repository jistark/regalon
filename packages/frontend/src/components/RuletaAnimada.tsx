import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { COLORES, type Participante } from 'shared'

interface RuletaAnimadaProps {
  participantes: Participante[]
  asignado: Participante
  onComplete: () => void
}

export function RuletaAnimada({
  participantes,
  asignado,
  onComplete,
}: RuletaAnimadaProps) {
  const [fase, setFase] = useState<'spinning' | 'slowing' | 'reveal'>('spinning')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [speed, setSpeed] = useState(50)

  // Spinning animation
  useEffect(() => {
    if (fase === 'spinning') {
      const timer = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % participantes.length)
      }, speed)

      // After 2 seconds, start slowing down
      const slowTimer = setTimeout(() => {
        setFase('slowing')
      }, 2000)

      return () => {
        clearTimeout(timer)
        clearTimeout(slowTimer)
      }
    }
  }, [fase, currentIndex, speed, participantes.length])

  // Slowing down animation
  useEffect(() => {
    if (fase === 'slowing') {
      if (speed > 500) {
        // Find the assigned participant and reveal
        const asignadoIndex = participantes.findIndex(
          (p) => p.id === asignado.id
        )
        setCurrentIndex(asignadoIndex)
        setTimeout(() => setFase('reveal'), 500)
        return
      }

      const timer = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % participantes.length)
        setSpeed((prev) => prev * 1.15) // Gradually slow down
      }, speed)

      return () => clearTimeout(timer)
    }
  }, [fase, speed, currentIndex, participantes, asignado.id])

  const currentParticipante = participantes[currentIndex]
  const currentColor = COLORES.find(
    (c) => c.nombre === currentParticipante?.color
  )

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8">
      {/* Ruleta visual */}
      <div className="relative">
        {/* Outer ring with colors */}
        <motion.div
          className="w-64 h-64 rounded-full border-8 border-gray-200 relative overflow-hidden"
          animate={
            fase === 'spinning'
              ? { rotate: 360 }
              : fase === 'slowing'
              ? { rotate: [0, 360] }
              : { rotate: 0 }
          }
          transition={
            fase === 'spinning'
              ? { duration: 1, repeat: Infinity, ease: 'linear' }
              : fase === 'slowing'
              ? { duration: speed / 100, ease: 'easeOut' }
              : { duration: 0 }
          }
        >
          {participantes.map((p, i) => {
            const angle = (360 / participantes.length) * i
            const color = COLORES.find((c) => c.nombre === p.color)
            return (
              <div
                key={p.id}
                className="absolute w-8 h-8 rounded-full"
                style={{
                  backgroundColor: color?.hex,
                  top: '50%',
                  left: '50%',
                  transform: `rotate(${angle}deg) translate(100px) rotate(-${angle}deg) translate(-50%, -50%)`,
                }}
              />
            )
          })}
        </motion.div>

        {/* Center display */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentParticipante?.id}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center shadow-lg"
              style={{ backgroundColor: currentColor?.hex || '#e5e7eb' }}
            >
              <span className="text-5xl">{currentColor?.emoji}</span>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Pointer */}
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
          <div className="w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-primary-600" />
        </div>
      </div>

      {/* Text */}
      <AnimatePresence mode="wait">
        {fase !== 'reveal' ? (
          <motion.div
            key="spinning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <p className="text-xl text-gray-600">Girando...</p>
            <p className="text-sm text-gray-400">
              {currentParticipante?.color}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="revealed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center space-y-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.5 }}
            >
              <p className="text-lg text-gray-500">Tu regalo es para:</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {asignado.nombre}
              </p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span
                  className="w-6 h-6 rounded-full"
                  style={{
                    backgroundColor: COLORES.find(
                      (c) => c.nombre === asignado.color
                    )?.hex,
                  }}
                />
                <span className="text-gray-600">
                  {asignado.color} {asignado.colorEmoji}
                </span>
              </div>
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              onClick={onComplete}
              className="btn-primary mt-6"
            >
              Ver detalles
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
