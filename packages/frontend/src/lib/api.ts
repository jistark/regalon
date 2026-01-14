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
    return this.request<{ slug: string; sessionToken: string; url: string }>(
      '/api/intercambios',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    )
  }

  async obtenerIntercambio(slug: string, sessionToken: string) {
    return this.request<any>(`/api/intercambios/${slug}?session_token=${sessionToken}`)
  }

  async agregarParticipante(
    slug: string,
    sessionToken: string,
    data: { nombre: string; email: string }
  ) {
    return this.request<{ participante: any }>(
      `/api/intercambios/${slug}/participantes?session_token=${sessionToken}`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    )
  }

  async eliminarParticipante(
    slug: string,
    sessionToken: string,
    participanteId: string
  ) {
    return this.request<void>(
      `/api/intercambios/${slug}/participantes/${participanteId}?session_token=${sessionToken}`,
      {
        method: 'DELETE',
      }
    )
  }

  async agregarExclusion(
    slug: string,
    sessionToken: string,
    data: { participanteId: string; excluidoId: string; razon?: string }
  ) {
    return this.request<{ exclusion: any }>(
      `/api/intercambios/${slug}/exclusiones?session_token=${sessionToken}`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    )
  }

  async eliminarExclusion(
    slug: string,
    sessionToken: string,
    exclusionId: string
  ) {
    return this.request<void>(
      `/api/intercambios/${slug}/exclusiones/${exclusionId}?session_token=${sessionToken}`,
      {
        method: 'DELETE',
      }
    )
  }

  async sortear(slug: string, sessionToken: string) {
    return this.request<{ total: number }>(
      `/api/intercambios/${slug}/sortear?session_token=${sessionToken}`,
      {
        method: 'POST',
      }
    )
  }

  async enviarInvitaciones(slug: string, sessionToken: string) {
    return this.request<{ enviados: number }>(
      `/api/intercambios/${slug}/enviar-invitaciones?session_token=${sessionToken}`,
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
