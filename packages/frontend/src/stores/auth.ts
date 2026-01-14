import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../lib/api'
import type { Participante } from 'shared'

interface AuthState {
  jwt: string | null
  participante: Participante | null
  isLoading: boolean
  error: string | null

  // Actions
  verificarToken: (token: string) => Promise<boolean>
  logout: () => void
  setError: (error: string | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, _get) => ({
      jwt: null,
      participante: null,
      isLoading: false,
      error: null,

      verificarToken: async (token: string) => {
        set({ isLoading: true, error: null })

        const result = await api.verificarToken(token)

        if (result.success) {
          api.setToken(result.data.jwt)
          set({
            jwt: result.data.jwt,
            participante: result.data.participante,
            isLoading: false,
          })
          return true
        } else {
          set({
            error: result.error,
            isLoading: false,
          })
          return false
        }
      },

      logout: () => {
        api.setToken(null)
        set({
          jwt: null,
          participante: null,
          error: null,
        })
      },

      setError: (error) => set({ error }),
    }),
    {
      name: 'intercambio-auth',
      onRehydrateStorage: () => (state) => {
        // Restore token to API client on rehydration
        if (state?.jwt) {
          api.setToken(state.jwt)
        }
      },
    }
  )
)
