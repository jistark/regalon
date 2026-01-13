import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { CrearIntercambio } from './pages/admin/CrearIntercambio'
import { Dashboard } from './pages/admin/Dashboard'
import { MiIntercambio } from './pages/participante/MiIntercambio'
import { Revelar } from './pages/participante/Revelar'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/crear" element={<CrearIntercambio />} />
        <Route path="/admin/:id" element={<Dashboard />} />
        <Route path="/mi-intercambio" element={<MiIntercambio />} />
        <Route path="/revelar" element={<Revelar />} />
      </Route>
    </Routes>
  )
}

export default App
