# Agente: Frontend

Contexto especializado para trabajar en `packages/frontend/`.

## Stack

- **Framework**: React 18 + Vite
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Animaciones**: Framer Motion
- **Estado**: Zustand (simple) o React Query para server state
- **Formularios**: React Hook Form + Zod

## Estructura

```
packages/frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── CrearIntercambio.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Participantes.tsx
│   │   │   ├── Exclusiones.tsx
│   │   │   └── Configuracion.tsx
│   │   ├── participante/
│   │   │   ├── MiIntercambio.tsx
│   │   │   ├── Revelacion.tsx        # Ruleta
│   │   │   └── Sugerencias.tsx
│   │   ├── auth/
│   │   │   ├── SolicitarAcceso.tsx
│   │   │   └── Verificar.tsx
│   │   └── Landing.tsx
│   ├── components/
│   │   ├── ui/                       # Componentes base
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   └── Modal.tsx
│   │   ├── ColorPicker.tsx
│   │   ├── ParticipanteCard.tsx
│   │   ├── RuletaAnimada.tsx
│   │   ├── CountdownTimer.tsx
│   │   └── RegaloCard.tsx
│   ├── hooks/
│   │   ├── useApi.ts
│   │   ├── useAuth.ts
│   │   └── useIntercambio.ts
│   ├── lib/
│   │   ├── api.ts                    # Cliente API
│   │   └── utils.ts
│   └── styles/
│       └── index.css
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

## Rutas

```typescript
// App.tsx
<Routes>
  {/* Público */}
  <Route path="/" element={<Landing />} />
  <Route path="/crear" element={<CrearIntercambio />} />
  <Route path="/acceso" element={<SolicitarAcceso />} />
  <Route path="/verificar" element={<Verificar />} />
  
  {/* Admin - requiere admin_token en URL */}
  <Route path="/admin/:id" element={<AdminLayout />}>
    <Route index element={<Dashboard />} />
    <Route path="participantes" element={<Participantes />} />
    <Route path="exclusiones" element={<Exclusiones />} />
    <Route path="config" element={<Configuracion />} />
  </Route>
  
  {/* Participante - requiere JWT */}
  <Route path="/mi-intercambio" element={<ProtectedRoute />}>
    <Route index element={<MiIntercambio />} />
    <Route path="revelar" element={<Revelacion />} />
    <Route path="sugerencias" element={<Sugerencias />} />
  </Route>
</Routes>
```

## Componentes Clave

### RuletaAnimada

```tsx
import { motion, useAnimation } from 'framer-motion'
import { useEffect } from 'react'

interface Props {
  colores: Array<{ nombre: string; hex: string; emoji: string }>
  colorGanador: string
  onComplete: () => void
}

export function RuletaAnimada({ colores, colorGanador, onComplete }: Props) {
  const controls = useAnimation()
  
  const indiceGanador = colores.findIndex(c => c.nombre === colorGanador)
  const segmentoAngulo = 360 / colores.length
  const anguloFinal = 360 * 5 + (360 - indiceGanador * segmentoAngulo) - segmentoAngulo / 2
  
  useEffect(() => {
    controls.start({
      rotate: anguloFinal,
      transition: {
        duration: 4,
        ease: [0.25, 0.1, 0.25, 1], // Ease out cubic
      }
    }).then(onComplete)
  }, [])
  
  return (
    <div className="relative w-72 h-72">
      {/* Indicador fijo arriba */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
        <div className="w-0 h-0 border-l-8 border-r-8 border-t-12 
                        border-l-transparent border-r-transparent border-t-white" />
      </div>
      
      {/* Ruleta giratoria */}
      <motion.div
        animate={controls}
        className="w-full h-full rounded-full overflow-hidden"
        style={{
          background: `conic-gradient(${
            colores.map((c, i) => 
              `${c.hex} ${i * segmentoAngulo}deg ${(i + 1) * segmentoAngulo}deg`
            ).join(', ')
          })`
        }}
      >
        {/* Labels de colores */}
        {colores.map((color, i) => (
          <div
            key={color.nombre}
            className="absolute text-2xl"
            style={{
              top: '50%',
              left: '50%',
              transform: `
                rotate(${i * segmentoAngulo + segmentoAngulo / 2}deg)
                translateY(-120px)
              `,
              transformOrigin: '0 0'
            }}
          >
            {color.emoji}
          </div>
        ))}
      </motion.div>
    </div>
  )
}
```

### ColorPicker

```tsx
const COLORES = [
  { nombre: 'Rojo', hex: '#ef4444', emoji: '🔴' },
  { nombre: 'Azul', hex: '#3b82f6', emoji: '🔵' },
  { nombre: 'Verde', hex: '#22c55e', emoji: '🟢' },
  { nombre: 'Amarillo', hex: '#eab308', emoji: '🟡' },
  { nombre: 'Morado', hex: '#a855f7', emoji: '🟣' },
  { nombre: 'Naranja', hex: '#f97316', emoji: '🟠' },
  { nombre: 'Rosa', hex: '#ec4899', emoji: '💗' },
  { nombre: 'Café', hex: '#92400e', emoji: '🟤' },
  { nombre: 'Negro', hex: '#1f2937', emoji: '⚫' },
  { nombre: 'Blanco', hex: '#f3f4f6', emoji: '⚪' },
]

interface Props {
  usados: string[]
  seleccionado: string | null
  onSelect: (color: typeof COLORES[0]) => void
}

export function ColorPicker({ usados, seleccionado, onSelect }: Props) {
  const disponibles = COLORES.filter(c => !usados.includes(c.nombre))
  
  return (
    <div className="flex flex-wrap gap-2">
      {disponibles.map((color) => (
        <button
          key={color.nombre}
          onClick={() => onSelect(color)}
          className={`
            w-10 h-10 rounded-full border-2 transition-all
            ${seleccionado === color.nombre 
              ? 'border-white scale-110 shadow-lg' 
              : 'border-transparent hover:border-slate-500'}
          `}
          style={{ backgroundColor: color.hex }}
          title={color.nombre}
        />
      ))}
    </div>
  )
}
```

### Cliente API

```typescript
// lib/api.ts
const API_URL = import.meta.env.VITE_API_URL

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string }

class ApiClient {
  private token: string | null = null
  
  setToken(token: string) {
    this.token = token
    localStorage.setItem('token', token)
  }
  
  clearToken() {
    this.token = null
    localStorage.removeItem('token')
  }
  
  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    }
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }
    
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    })
    
    const json: ApiResponse<T> = await res.json()
    
    if (!json.success) {
      throw new Error(json.error)
    }
    
    return json.data
  }
  
  // Intercambios (admin)
  async crearIntercambio(data: CrearIntercambioInput) {
    return this.fetch<{ id: string; admin_token: string }>('/api/intercambios', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
  
  async getIntercambio(id: string, adminToken: string) {
    return this.fetch<Intercambio>(`/api/intercambios/${id}?admin_token=${adminToken}`)
  }
  
  // ... más métodos
}

export const api = new ApiClient()
```

## Diseño Visual

### Paleta de colores (Tailwind)
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Fondo oscuro
        background: '#0f172a',  // slate-900
        surface: '#1e293b',     // slate-800
        // Acentos
        primary: '#3b82f6',     // blue-500
        success: '#22c55e',     // green-500
        warning: '#eab308',     // yellow-500
      }
    }
  }
}
```

### Layout base
- Fondo: Gradiente slate-900 → slate-800
- Cards: slate-800/50 con backdrop-blur y border slate-700
- Texto: white para títulos, slate-400 para secundario
- Botones: Rounded-xl, transiciones suaves

## Estados de la App

### Zustand Store

```typescript
// stores/authStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  participante: Participante | null
  setAuth: (token: string, participante: Participante) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      participante: null,
      setAuth: (token, participante) => set({ token, participante }),
      logout: () => set({ token: null, participante: null }),
    }),
    { name: 'auth-storage' }
  )
)
```

## Animaciones

Usar Framer Motion para:
- Transiciones de página (fade + slide)
- Ruleta de revelación
- Confetti al revelar asignación
- Hover en cards
- Loading skeletons

```tsx
// Layout con animación de página
<AnimatePresence mode="wait">
  <motion.div
    key={location.pathname}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.2 }}
  >
    <Outlet />
  </motion.div>
</AnimatePresence>
```
