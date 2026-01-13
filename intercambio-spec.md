# Intercambio Secreto - Especificación Técnica

## Resumen
Aplicación web para organizar intercambios de regalos con sistema de colores como identificadores, reglas de exclusión, y sugerencias de regalos basadas en precio.

---

## Stack Propuesto

### Backend
- **Runtime**: Node.js + Express (o Hono para más ligereza)
- **Base de datos**: SQLite (desarrollo) / PostgreSQL (producción)
- **ORM**: Prisma o Drizzle
- **Auth**: Magic links con Resend (email) o tokens JWT simples
- **Hosting sugerido**: Vercel, Railway, o Render

### Frontend
- **Framework**: React + Vite (o Next.js si quieres SSR)
- **Styling**: Tailwind CSS
- **Animaciones**: Framer Motion (para la ruleta)

---

## Modelo de Datos

```
┌─────────────────────────────────────────────────────────────┐
│ Intercambio                                                 │
├─────────────────────────────────────────────────────────────┤
│ id: UUID (PK)                                               │
│ nombre: string                                              │
│ fecha_evento: datetime                                      │
│ tematica: string?                                           │
│ precio_base: decimal                                        │
│ regla_precio: enum (FIJO | SUBE_CON_PARTICIPANTES | BAJA)   │
│ factor_precio: decimal (multiplicador por participante)     │
│ estado: enum (BORRADOR | ACTIVO | SORTEADO | FINALIZADO)    │
│ created_at: datetime                                        │
│ admin_token: string (para gestionar sin login)              │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Participante                                                │
├─────────────────────────────────────────────────────────────┤
│ id: UUID (PK)                                               │
│ intercambio_id: UUID (FK)                                   │
│ nombre: string                                              │
│ email: string                                               │
│ color: string                                               │
│ color_hex: string                                           │
│ magic_token: string (único, para acceso)                    │
│ asignado_a_id: UUID? (FK self, después del sorteo)          │
│ ha_visto_resultado: boolean                                 │
│ created_at: datetime                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ N:N (self)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Exclusion                                                   │
├─────────────────────────────────────────────────────────────┤
│ id: UUID (PK)                                               │
│ intercambio_id: UUID (FK)                                   │
│ participante_id: UUID (FK) -- quien NO debe regalar         │
│ excluido_id: UUID (FK) -- a quien NO debe tocarle           │
│ razon: string? (opcional, para el admin)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Intercambio (Admin)
```
POST   /api/intercambios              # Crear intercambio
GET    /api/intercambios/:id          # Ver intercambio (con admin_token)
PUT    /api/intercambios/:id          # Actualizar config
DELETE /api/intercambios/:id          # Eliminar

POST   /api/intercambios/:id/participantes     # Agregar participante
DELETE /api/intercambios/:id/participantes/:pid # Eliminar participante

POST   /api/intercambios/:id/exclusiones       # Agregar exclusión
DELETE /api/intercambios/:id/exclusiones/:eid  # Eliminar exclusión

POST   /api/intercambios/:id/sortear           # Realizar sorteo
GET    /api/intercambios/:id/estado            # Ver estado (lista oscurecida)
POST   /api/intercambios/:id/enviar-invitaciones # Enviar magic links
```

### Participante (Frontend público)
```
GET    /api/mi-intercambio?token=XXX   # Ver mi info + estado del intercambio
GET    /api/mi-asignacion?token=XXX    # Ver a quién me tocó (una vez sorteado)
POST   /api/validar-email              # Enviar código de verificación
POST   /api/verificar-codigo           # Verificar código y obtener token
```

### Sugerencias de Regalos
```
GET    /api/sugerencias?precio=500&categoria=tecnologia
```

---

## APIs de Productos - Opciones

### 1. **Mercado Libre API** ⭐ Recomendada para México
- **Pros**: Gratuita, excelente cobertura LATAM, bien documentada
- **Cons**: Requiere registro de app
- **Endpoint**: `https://api.mercadolibre.com/sites/MLM/search?q={query}&price={min}-{max}`
- **Docs**: https://developers.mercadolibre.com.mx/

### 2. **Amazon Product Advertising API**
- **Pros**: Catálogo enorme, precios actualizados
- **Cons**: Requiere cuenta de afiliados activa con ventas
- **Mejor para**: Si ya tienes cuenta de Amazon Afiliados

### 3. **RapidAPI - Real-Time Amazon Data**
- **Pros**: Fácil de integrar, no requiere afiliados
- **Cons**: Freemium (100 requests/mes gratis)
- **URL**: https://rapidapi.com/letscrape-6bRBa3QguO5/api/real-time-amazon-data

### 4. **Google Shopping (via SerpAPI)**
- **Pros**: Agrega múltiples tiendas
- **Cons**: De pago ($50/mes mínimo)

### 5. **Walmart México API**
- **Pros**: Buena para México
- **Cons**: Requiere solicitud de acceso

### Recomendación
**Mercado Libre** como principal + **fallback a scraping de Amazon** vía RapidAPI para el tier gratuito.

---

## Algoritmo de Sorteo con Exclusiones

```javascript
function sortearConExclusiones(participantes, exclusiones) {
  // Crear grafo de restricciones
  const restricciones = new Map(); // participante -> Set de IDs prohibidos
  
  participantes.forEach(p => {
    restricciones.set(p.id, new Set([p.id])); // No puede tocarse a sí mismo
  });
  
  exclusiones.forEach(e => {
    restricciones.get(e.participante_id).add(e.excluido_id);
  });
  
  // Algoritmo de backtracking para encontrar asignación válida
  const asignaciones = new Map();
  const disponibles = new Set(participantes.map(p => p.id));
  
  function backtrack(index) {
    if (index === participantes.length) return true;
    
    const actual = participantes[index];
    const prohibidos = restricciones.get(actual.id);
    
    // Intentar cada destino disponible
    const candidatos = [...disponibles].filter(id => !prohibidos.has(id));
    
    // Shuffle para aleatoriedad
    shuffleArray(candidatos);
    
    for (const candidato of candidatos) {
      asignaciones.set(actual.id, candidato);
      disponibles.delete(candidato);
      
      if (backtrack(index + 1)) return true;
      
      // Backtrack
      asignaciones.delete(actual.id);
      disponibles.add(candidato);
    }
    
    return false;
  }
  
  if (!backtrack(0)) {
    throw new Error('No es posible realizar el sorteo con las exclusiones dadas');
  }
  
  return asignaciones;
}
```

---

## Reglas de Precio Dinámico

```javascript
function calcularPrecio(intercambio, numParticipantes) {
  const { precio_base, regla_precio, factor_precio } = intercambio;
  
  switch (regla_precio) {
    case 'FIJO':
      return precio_base;
    
    case 'SUBE_CON_PARTICIPANTES':
      // Ej: $200 base + $50 por cada participante extra después de 5
      const extras = Math.max(0, numParticipantes - 5);
      return precio_base + (extras * factor_precio);
    
    case 'BAJA_CON_PARTICIPANTES':
      // Ej: $500 base - $30 por participante (mínimo $200)
      const descuento = (numParticipantes - 1) * factor_precio;
      return Math.max(200, precio_base - descuento);
    
    default:
      return precio_base;
  }
}
```

---

## Flujo de Usuario

### Admin (Organizador)
```
1. Crear intercambio → Obtiene URL admin + URL para compartir
2. Configurar: fecha, temática, precio, reglas
3. Agregar participantes (nombre + email)
4. Definir exclusiones (opcional)
5. Enviar invitaciones (magic links por email)
6. Realizar sorteo cuando todos estén listos
7. Ver dashboard de estado
```

### Participante
```
1. Recibe email con magic link
2. Click → Llega a su página personal
3. Ve: fecha, temática, precio del regalo, participantes
4. Después del sorteo: puede "revelar" su asignación
5. Animación de ruleta → Ve el color + nombre
6. Ve sugerencias de regalos según el precio
```

---

## Componente de Ruleta (Concepto)

```jsx
// Ruleta que gira y cae en el color asignado
const Ruleta = ({ colores, colorGanador, onComplete }) => {
  // - Animar rotación con Framer Motion
  // - Calcular ángulo final para que caiga en colorGanador
  // - Efecto de "casi cae en otro" para emoción
  // - Sonido de tick-tick mientras gira (opcional)
  // - Confetti al revelar
};
```

---

## Estructura de Archivos Propuesta

```
intercambio-app/
├── backend/
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   │   ├── intercambios.ts
│   │   │   ├── participantes.ts
│   │   │   └── sugerencias.ts
│   │   ├── services/
│   │   │   ├── sorteo.ts
│   │   │   ├── email.ts
│   │   │   └── productos.ts
│   │   ├── db/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── utils/
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Admin/
│   │   │   │   ├── CrearIntercambio.tsx
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   └── Configurar.tsx
│   │   │   └── Participante/
│   │   │       ├── MiIntercambio.tsx
│   │   │       ├── Ruleta.tsx
│   │   │       └── Sugerencias.tsx
│   │   ├── components/
│   │   │   ├── ColorPicker.tsx
│   │   │   ├── ParticipanteCard.tsx
│   │   │   └── RuletaAnimada.tsx
│   │   └── lib/
│   │       └── api.ts
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```

---

## Próximos Pasos

1. **¿Confirmas el stack?** (Node + React + Mercado Libre API)
2. **¿Prefieres monorepo o repos separados?**
3. **¿Tienes preferencia de hosting?** (Vercel, Railway, etc.)
4. **¿Quieres empezar por backend o frontend?**

---

## Notas Técnicas

- **Magic links**: Tokens UUID v4, expiran en 7 días, se pueden regenerar
- **Rate limiting**: Importante en endpoint de sugerencias para no agotar API
- **Cache**: Redis o en memoria para resultados de productos (TTL 1 hora)
- **Emails**: Resend (100 emails/día gratis) o Amazon SES
