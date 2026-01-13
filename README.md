# 🎁 Intercambio Secreto

Aplicación web para organizar intercambios de regalos con sistema de colores como identificadores secretos.

## Features

- **Organización segura**: Cada participante tiene un color secreto para verificar su identidad
- **Reglas de exclusión**: Define quién no puede regalarle a quién
- **Precio dinámico**: Configura reglas de precio basadas en número de participantes
- **Magic links**: Acceso sin contraseña vía email
- **Revelación animada**: Ruleta divertida para descubrir tu asignación
- **Sugerencias de regalos**: Ideas según el presupuesto via Mercado Libre

## Stack

- **Monorepo**: pnpm workspaces
- **Backend**: Hono + Drizzle ORM + PostgreSQL
- **Frontend**: React + Vite + Tailwind CSS + Framer Motion
- **Auth**: Magic links vía Resend
- **Hosting**: Render

## Inicio Rápido

```bash
# Clonar
git clone https://github.com/tu-usuario/intercambio-secreto.git
cd intercambio-secreto

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env
# Edita los archivos .env con tus valores

# Iniciar base de datos (requiere PostgreSQL corriendo)
pnpm db:migrate

# Desarrollo
pnpm dev
```

## Documentación

Ver [CLAUDE.md](./CLAUDE.md) para documentación técnica completa.

Agentes especializados en `docs/agents/`:
- `backend.md` - API, rutas, servicios
- `frontend.md` - Componentes, páginas, estado
- `database.md` - Schema, migraciones, queries
- `sorteo.md` - Algoritmo de sorteo con exclusiones

## Licencia

MIT
