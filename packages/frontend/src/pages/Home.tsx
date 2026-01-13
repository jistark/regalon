import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { COLORES } from 'shared'

const features = [
  {
    icon: '🎨',
    title: 'Colores Secretos',
    description:
      'Cada participante tiene un color unico que lo identifica de forma anonima.',
  },
  {
    icon: '🚫',
    title: 'Exclusiones',
    description:
      'Configura quien no puede regalar a quien (parejas, familiares, etc).',
  },
  {
    icon: '💡',
    title: 'Sugerencias',
    description:
      'Recibe ideas de regalos personalizadas segun el presupuesto acordado.',
  },
  {
    icon: '🎰',
    title: 'Ruleta Animada',
    description:
      'Revela tu asignacion con una emocionante animacion de ruleta.',
  },
]

export function Home() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="text-center py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Animated colors */}
          <div className="flex justify-center gap-2 mb-8">
            {COLORES.slice(0, 6).map((color, i) => (
              <motion.div
                key={color.nombre}
                className="w-8 h-8 rounded-full"
                style={{ backgroundColor: color.hex }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1, type: 'spring' }}
              />
            ))}
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 text-balance">
            Organiza tu intercambio de regalos
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Con colores secretos, exclusiones inteligentes y sugerencias de
            regalos. Todo desde una sola plataforma.
          </p>

          <Link to="/crear">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-primary text-lg px-8 py-3"
            >
              Crear intercambio
            </motion.button>
          </Link>
        </motion.div>
      </section>

      {/* Features */}
      <section>
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
          Todo lo que necesitas
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="card flex gap-4"
            >
              <div className="text-4xl">{feature.icon}</div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white rounded-2xl p-8 border border-gray-100">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
          Como funciona
        </h2>
        <div className="grid md:grid-cols-4 gap-8">
          {[
            { step: '1', title: 'Crea', desc: 'Define fecha, tema y presupuesto' },
            { step: '2', title: 'Invita', desc: 'Agrega participantes con sus colores' },
            { step: '3', title: 'Sortea', desc: 'El algoritmo asigna de forma justa' },
            { step: '4', title: 'Revela', desc: 'Cada quien ve su asignacion secreta' },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.15 }}
              className="text-center"
            >
              <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 font-bold text-xl flex items-center justify-center mx-auto mb-3">
                {item.step}
              </div>
              <h3 className="font-semibold text-gray-900">{item.title}</h3>
              <p className="text-sm text-gray-600">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-8">
        <p className="text-gray-600 mb-4">
          Es gratis y no requiere registro
        </p>
        <Link to="/crear">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-secondary text-lg px-8 py-3"
          >
            Comenzar ahora
          </motion.button>
        </Link>
      </section>
    </div>
  )
}
