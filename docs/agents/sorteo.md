# Agente: Sorteo

Contexto especializado para el algoritmo de sorteo con exclusiones en `packages/backend/src/services/sorteo.ts`.

## Problema

Dado un conjunto de N participantes y un conjunto de exclusiones (pares donde A no puede regalarle a B), encontrar una asignación válida donde:
1. Cada participante regala exactamente a una persona
2. Cada participante recibe exactamente de una persona
3. Nadie se regala a sí mismo
4. Se respetan todas las exclusiones

Esto es equivalente a encontrar un **ciclo Hamiltoniano** en un grafo dirigido donde:
- Nodos = participantes
- Aristas = asignaciones permitidas (no excluidas)

## Algoritmo: Backtracking con Poda

```typescript
// packages/backend/src/services/sorteo.ts

interface Participante {
  id: string
  nombre: string
  color: string
}

interface Exclusion {
  participanteId: string  // Quien NO debe regalar
  excluidoId: string      // A quien NO debe tocarle
}

interface AsignacionResult {
  success: true
  asignaciones: Map<string, string>  // deId -> paraId
} | {
  success: false
  error: string
}

export function realizarSorteo(
  participantes: Participante[],
  exclusiones: Exclusion[]
): AsignacionResult {
  if (participantes.length < 2) {
    return { success: false, error: 'Se necesitan al menos 2 participantes' }
  }

  // Construir mapa de restricciones
  const restricciones = new Map<string, Set<string>>()
  
  // Cada participante no puede regalarse a sí mismo
  for (const p of participantes) {
    restricciones.set(p.id, new Set([p.id]))
  }
  
  // Agregar exclusiones explícitas
  for (const e of exclusiones) {
    restricciones.get(e.participanteId)?.add(e.excluidoId)
  }

  // Mezclar participantes para aleatoriedad
  const shuffled = shuffleArray([...participantes])
  
  // Estado del backtracking
  const asignaciones = new Map<string, string>()
  const asignados = new Set<string>()  // IDs que ya fueron asignados como destino

  function backtrack(index: number): boolean {
    // Caso base: todos asignados
    if (index === shuffled.length) {
      return true
    }

    const actual = shuffled[index]
    const prohibidos = restricciones.get(actual.id) || new Set()

    // Candidatos: participantes no asignados y no prohibidos
    const candidatos = shuffled
      .filter(p => !asignados.has(p.id) && !prohibidos.has(p.id))
      .map(p => p.id)

    // Mezclar candidatos para más aleatoriedad
    shuffleArray(candidatos)

    for (const candidatoId of candidatos) {
      // Intentar esta asignación
      asignaciones.set(actual.id, candidatoId)
      asignados.add(candidatoId)

      // Verificar si es viable continuar (poda)
      if (esViable(index + 1) && backtrack(index + 1)) {
        return true
      }

      // Backtrack
      asignaciones.delete(actual.id)
      asignados.delete(candidatoId)
    }

    return false
  }

  // Función de poda: verificar si es posible completar desde este punto
  function esViable(fromIndex: number): boolean {
    // Para cada participante restante, debe existir al menos un destino válido
    for (let i = fromIndex; i < shuffled.length; i++) {
      const p = shuffled[i]
      const prohibidos = restricciones.get(p.id) || new Set()
      
      const tieneOpcion = shuffled.some(
        dest => !asignados.has(dest.id) && !prohibidos.has(dest.id)
      )
      
      if (!tieneOpcion) return false
    }
    return true
  }

  // Ejecutar
  if (backtrack(0)) {
    return { success: true, asignaciones }
  }

  return {
    success: false,
    error: 'No es posible realizar el sorteo con las exclusiones actuales. ' +
           'Intenta eliminar algunas restricciones.'
  }
}

// Fisher-Yates shuffle (in-place, retorna el mismo array)
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]
  }
  return array
}
```

## Complejidad

- **Peor caso**: O(N!) - si hay que explorar todas las permutaciones
- **Caso típico**: Mucho mejor gracias a la poda
- **Con pocas exclusiones**: Casi lineal O(N)

Para N ≤ 20 participantes (caso de uso típico), el algoritmo es instantáneo.

## Casos Especiales

### Sorteo imposible
```typescript
// Ejemplo: 3 personas donde todos se excluyen mutuamente
const participantes = [{ id: 'A' }, { id: 'B' }, { id: 'C' }]
const exclusiones = [
  { participanteId: 'A', excluidoId: 'B' },
  { participanteId: 'A', excluidoId: 'C' },
  { participanteId: 'B', excluidoId: 'A' },
  { participanteId: 'B', excluidoId: 'C' },
  { participanteId: 'C', excluidoId: 'A' },
  { participanteId: 'C', excluidoId: 'B' },
]
// Resultado: { success: false, error: '...' }
```

### Validación previa (opcional)
```typescript
// Verificar antes de sortear si es teóricamente posible
export function validarExclusiones(
  participantes: Participante[],
  exclusiones: Exclusion[]
): { valido: boolean; problemas: string[] } {
  const problemas: string[] = []
  const n = participantes.length

  // Cada participante debe poder recibir de al menos 1 persona
  for (const p of participantes) {
    const puedenRegalarle = participantes.filter(otro => {
      if (otro.id === p.id) return false
      return !exclusiones.some(
        e => e.participanteId === otro.id && e.excluidoId === p.id
      )
    })
    
    if (puedenRegalarle.length === 0) {
      problemas.push(`${p.nombre} no puede recibir regalo de nadie`)
    }
  }

  // Cada participante debe poder regalar a al menos 1 persona
  for (const p of participantes) {
    const puedeRegalarA = participantes.filter(otro => {
      if (otro.id === p.id) return false
      return !exclusiones.some(
        e => e.participanteId === p.id && e.excluidoId === otro.id
      )
    })
    
    if (puedeRegalarA.length === 0) {
      problemas.push(`${p.nombre} no puede regalarle a nadie`)
    }
  }

  return {
    valido: problemas.length === 0,
    problemas
  }
}
```

## Tests

```typescript
// packages/backend/src/services/__tests__/sorteo.test.ts
import { describe, it, expect } from 'vitest'
import { realizarSorteo, validarExclusiones } from '../sorteo'

describe('realizarSorteo', () => {
  it('debe asignar correctamente sin exclusiones', () => {
    const participantes = [
      { id: '1', nombre: 'Ana', color: 'Rojo' },
      { id: '2', nombre: 'Bob', color: 'Azul' },
      { id: '3', nombre: 'Carlos', color: 'Verde' },
    ]
    
    const result = realizarSorteo(participantes, [])
    
    expect(result.success).toBe(true)
    if (result.success) {
      // Cada uno da a exactamente uno
      expect(result.asignaciones.size).toBe(3)
      
      // Nadie se regala a sí mismo
      for (const [de, para] of result.asignaciones) {
        expect(de).not.toBe(para)
      }
      
      // Cada uno recibe exactamente de uno
      const receptores = new Set(result.asignaciones.values())
      expect(receptores.size).toBe(3)
    }
  })

  it('debe respetar exclusiones', () => {
    const participantes = [
      { id: '1', nombre: 'Ana', color: 'Rojo' },
      { id: '2', nombre: 'Bob', color: 'Azul' },
      { id: '3', nombre: 'Carlos', color: 'Verde' },
      { id: '4', nombre: 'Diana', color: 'Amarillo' },
    ]
    
    const exclusiones = [
      { participanteId: '1', excluidoId: '2' }, // Ana no puede darle a Bob
    ]
    
    const result = realizarSorteo(participantes, exclusiones)
    
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.asignaciones.get('1')).not.toBe('2')
    }
  })

  it('debe fallar cuando es imposible', () => {
    const participantes = [
      { id: '1', nombre: 'Ana', color: 'Rojo' },
      { id: '2', nombre: 'Bob', color: 'Azul' },
    ]
    
    // Ana no puede darle a Bob, Bob no puede darle a Ana
    // Imposible con solo 2 personas
    const exclusiones = [
      { participanteId: '1', excluidoId: '2' },
      { participanteId: '2', excluidoId: '1' },
    ]
    
    const result = realizarSorteo(participantes, exclusiones)
    
    expect(result.success).toBe(false)
  })

  it('debe producir resultados aleatorios', () => {
    const participantes = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      nombre: `Persona ${i}`,
      color: `Color ${i}`,
    }))
    
    // Ejecutar múltiples veces y verificar variación
    const resultados = new Set<string>()
    
    for (let i = 0; i < 20; i++) {
      const result = realizarSorteo(participantes, [])
      if (result.success) {
        const key = [...result.asignaciones.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([de, para]) => `${de}->${para}`)
          .join(',')
        resultados.add(key)
      }
    }
    
    // Debería haber variación (no siempre el mismo resultado)
    expect(resultados.size).toBeGreaterThan(1)
  })
})
```

## Integración con el Servicio

```typescript
// packages/backend/src/services/intercambioService.ts
import { realizarSorteo, validarExclusiones } from './sorteo'
import { db } from '../db'
import { intercambios, participantes, exclusiones } from '../db/schema'

export async function sortearIntercambio(intercambioId: string) {
  // 1. Obtener datos
  const intercambio = await db.query.intercambios.findFirst({
    where: eq(intercambios.id, intercambioId),
    with: {
      participantes: true,
      exclusiones: true,
    },
  })

  if (!intercambio) {
    throw new NotFoundError('Intercambio')
  }

  if (intercambio.estado === 'SORTEADO') {
    throw new AppError('El sorteo ya fue realizado', 400)
  }

  if (intercambio.participantes.length < 2) {
    throw new AppError('Se necesitan al menos 2 participantes', 400)
  }

  // 2. Validar que sea posible
  const validacion = validarExclusiones(
    intercambio.participantes,
    intercambio.exclusiones
  )

  if (!validacion.valido) {
    throw new AppError(
      `No se puede realizar el sorteo: ${validacion.problemas.join(', ')}`,
      400
    )
  }

  // 3. Realizar sorteo
  const resultado = realizarSorteo(
    intercambio.participantes,
    intercambio.exclusiones
  )

  if (!resultado.success) {
    throw new AppError(resultado.error, 400)
  }

  // 4. Guardar en DB
  await db.transaction(async (tx) => {
    for (const [deId, paraId] of resultado.asignaciones) {
      await tx
        .update(participantes)
        .set({ asignadoAId: paraId })
        .where(eq(participantes.id, deId))
    }

    await tx
      .update(intercambios)
      .set({ estado: 'SORTEADO', updatedAt: new Date() })
      .where(eq(intercambios.id, intercambioId))
  })

  return { success: true, total: resultado.asignaciones.size }
}
```
