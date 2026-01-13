# Intercambio Secreto

Aplicación web para organizar intercambios de regalos con sistema de colores como identificadores secretos, reglas de exclusión, y sugerencias de regalos.

## Stack

- **Monorepo**: pnpm workspaces
- **Backend**: Hono + Drizzle ORM + PostgreSQL
- **Frontend**: React + Vite + Tailwind CSS + Framer Motion
- **Auth**: Magic links vía Resend
- **Hosting**: Render (backend + DB + frontend estático)

## Estructura del Proyecto

```
intercambio-secreto/
├── packages/
│   ├── backend/          # API Hono
│   ├── frontend/         # React SPA
│   └── shared/           # Tipos compartidos, validaciones (zod)
├── docs/
│   └── agents/           # Agentes especializados
├── pnpm-workspace.yaml
├── package.json
└── CLAUDE.md
```

## Comandos

```bash
# Instalar dependencias
pnpm install

# Desarrollo
pnpm dev              # Corre backend y frontend en paralelo
pnpm dev:backend      # Solo backend (puerto 3000)
pnpm dev:frontend     # Solo frontend (puerto 5173)

# Base de datos
pnpm db:generate      # Generar migraciones
pnpm db:migrate       # Aplicar migraciones
pnpm db:studio        # Abrir Drizzle Studio

# Build
pnpm build            # Build de producción
pnpm typecheck        # Verificar tipos en todo el monorepo
```

## Variables de Entorno

### Backend (`packages/backend/.env`)
```
DATABASE_URL=postgresql://user:pass@host:5432/intercambio
RESEND_API_KEY=re_xxxxx
APP_URL=http://localhost:5173
JWT_SECRET=tu-secreto-seguro
```

### Frontend (`packages/frontend/.env`)
```
VITE_API_URL=http://localhost:3000
```

## Flujos Principales

### Organizador (Admin)
1. Crear intercambio → recibe `admin_token` en URL
2. Agregar participantes (nombre + email)
3. Configurar exclusiones
4. Configurar precio y reglas
5. Enviar invitaciones (dispara magic links)
6. Realizar sorteo
7. Ver estado

### Participante
1. Recibe magic link por email
2. Accede a su vista personal
3. Ve info del intercambio (fecha, temática, precio)
4. Post-sorteo: revela su asignación (animación ruleta)
5. Ve sugerencias de regalos

## Convenciones de Código

- **Tipos**: Usar Zod para validación, inferir tipos con `z.infer<>`
- **API responses**: Siempre `{ success: boolean, data?: T, error?: string }`
- **Errores**: Usar clases de error personalizadas en `shared/errors.ts`
- **Nombres**: camelCase para código, snake_case para DB
- **Commits**: Conventional commits (`feat:`, `fix:`, `docs:`, etc.)

## Agentes Disponibles

Ver `docs/agents/` para contexto especializado:
- `backend.md` - API, rutas, servicios
- `frontend.md` - Componentes, páginas, estado
- `database.md` - Schema, migraciones, queries
- `sorteo.md` - Algoritmo de sorteo con exclusiones

## API Externa

**Mercado Libre** para sugerencias de regalos:
```
GET https://api.mercadolibre.com/sites/MLM/search
  ?q={query}
  &price={min}-{max}
  &limit=10
```

No requiere API key para búsquedas básicas.

## Seguridad

- Magic tokens: UUID v4, hasheados en DB
- Admin tokens: Separados de participante tokens
- Rate limiting: 100 req/min por IP en endpoints públicos
- CORS: Solo dominios permitidos en producción
- Inputs: Validación con Zod en todas las rutas
