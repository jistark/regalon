const API_URL = import.meta.env.VITE_API_URL || ''

interface ApiResponse<T> {
  success: true
  data: T
}

interface ApiError {
  success: false
  error: string
}

type ApiResult<T> = ApiResponse<T> | ApiError

class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  setToken(token: string | null) {
    this.token = token
  }

  getToken() {
    return this.token
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResult<T>> {
    const url = `${this.baseUrl}${endpoint}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `Error ${response.status}: ${response.statusText}`,
        }
      }

      return data as ApiResult<T>
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error de conexion',
      }
    }
  }

  // Intercambios
  async crearIntercambio(data: {
    nombre: string
    fechaEvento: string
    tematica?: string
    precioBase: number
    reglaPrecio?: string
    factorPrecio?: number
  }) {
    return this.request<{ intercambio: any; adminToken: string }>(
      '/api/intercambios',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    )
  }

  async obtenerIntercambio(id: string, adminToken: string) {
    return this.request<{
      intercambio: any
      participantes: any[]
      exclusiones: any[]
    }>(`/api/intercambios/${id}?admin_token=${adminToken}`)
  }

  async agregarParticipante(
    intercambioId: string,
    adminToken: string,
    data: { nombre: string; email: string; color: string }
  ) {
    return this.request<{ participante: any }>(
      `/api/intercambios/${intercambioId}/participantes?admin_token=${adminToken}`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    )
  }

  async eliminarParticipante(
    intercambioId: string,
    adminToken: string,
    participanteId: string
  ) {
    return this.request<void>(
      `/api/intercambios/${intercambioId}/participantes/${participanteId}?admin_token=${adminToken}`,
      {
        method: 'DELETE',
      }
    )
  }

  async agregarExclusion(
    intercambioId: string,
    adminToken: string,
    data: { participanteId: string; excluidoId: string; razon?: string }
  ) {
    return this.request<{ exclusion: any }>(
      `/api/intercambios/${intercambioId}/exclusiones?admin_token=${adminToken}`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    )
  }

  async eliminarExclusion(
    intercambioId: string,
    adminToken: string,
    exclusionId: string
  ) {
    return this.request<void>(
      `/api/intercambios/${intercambioId}/exclusiones/${exclusionId}?admin_token=${adminToken}`,
      {
        method: 'DELETE',
      }
    )
  }

  async sortear(intercambioId: string, adminToken: string) {
    return this.request<{ message: string }>(
      `/api/intercambios/${intercambioId}/sortear?admin_token=${adminToken}`,
      {
        method: 'POST',
      }
    )
  }

  async enviarInvitaciones(intercambioId: string, adminToken: string) {
    return this.request<{ enviados: number }>(
      `/api/intercambios/${intercambioId}/enviar-invitaciones?admin_token=${adminToken}`,
      {
        method: 'POST',
      }
    )
  }

  // Auth / Participante
  async verificarToken(token: string) {
    return this.request<{ jwt: string; participante: any }>(
      `/api/auth/verificar?token=${token}`
    )
  }

  async obtenerMiIntercambio() {
    return this.request<{
      intercambio: any
      participante: any
      haVistoResultado: boolean
    }>('/api/mi-intercambio')
  }

  async obtenerMiAsignacion() {
    return this.request<{
      asignadoA: any
      participantes: any[]
    }>('/api/mi-asignacion')
  }

  async marcarVisto() {
    return this.request<void>('/api/marcar-visto', {
      method: 'POST',
    })
  }

  // Sugerencias
  async obtenerSugerencias(query: string, precioMax?: number) {
    const params = new URLSearchParams({ q: query })
    if (precioMax) {
      params.set('precio_max', precioMax.toString())
    }
    return this.request<{ sugerencias: any[] }>(`/api/sugerencias?${params}`)
  }
}

export const api = new ApiClient(API_URL)
