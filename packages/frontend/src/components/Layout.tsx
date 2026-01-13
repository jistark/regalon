import { Outlet, Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <motion.div
              className="text-2xl"
              whileHover={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5 }}
            >
              🎁
            </motion.div>
            <span className="text-xl font-bold text-gray-900">
              Intercambio Secreto
            </span>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Outlet />
        </div>
      </main>

      <footer className="bg-gray-50 border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          <p>Organiza tu intercambio de regalos de forma divertida y segura</p>
        </div>
      </footer>
    </div>
  )
}
