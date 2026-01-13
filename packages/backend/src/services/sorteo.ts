interface Participante {
  id: string
  nombre: string
}

interface Exclusion {
  participanteId: string
  excluidoId: string
}

type AsignacionResult = {
  success: true
  asignaciones: Map<string, string>
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
  const asignados = new Set<string>()

  function backtrack(index: number): boolean {
    if (index === shuffled.length) {
      return true
    }

    const actual = shuffled[index]
    const prohibidos = restricciones.get(actual.id) || new Set()

    // Candidatos: participantes no asignados y no prohibidos
    const candidatos = shuffled
      .filter(p => !asignados.has(p.id) && !prohibidos.has(p.id))
      .map(p => p.id)

    shuffleArray(candidatos)

    for (const candidatoId of candidatos) {
      asignaciones.set(actual.id, candidatoId)
      asignados.add(candidatoId)

      if (esViable(index + 1) && backtrack(index + 1)) {
        return true
      }

      asignaciones.delete(actual.id)
      asignados.delete(candidatoId)
    }

    return false
  }

  function esViable(fromIndex: number): boolean {
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

  if (backtrack(0)) {
    return { success: true, asignaciones }
  }

  return {
    success: false,
    error: 'No es posible realizar el sorteo con las exclusiones actuales. Intenta eliminar algunas restricciones.'
  }
}

export function validarExclusiones(
  participantes: Participante[],
  exclusiones: Exclusion[]
): { valido: boolean; problemas: string[] } {
  const problemas: string[] = []

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

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]
  }
  return array
}
