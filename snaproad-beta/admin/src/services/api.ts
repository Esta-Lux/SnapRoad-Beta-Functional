import axios, { AxiosInstance } from 'axios'
import { useAuthStore } from '../store/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth on unauthorized
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient

// API service methods (placeholders for implementation)
export const authService = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  logout: () => apiClient.post('/auth/logout'),
  me: () => apiClient.get('/auth/me'),
}

export const usersService = {
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get('/admin/users', { params }),
  get: (id: string) => apiClient.get(`/admin/users/${id}`),
  updateStatus: (id: string, status: string, reason?: string) =>
    apiClient.put(`/admin/users/${id}/status`, { status, reason }),
}

export const tripsService = {
  list: (params?: { page?: number; limit?: number; userId?: string }) =>
    apiClient.get('/admin/trips', { params }),
  get: (id: string) => apiClient.get(`/admin/trips/${id}`),
  getActive: () => apiClient.get('/admin/trips/status/active'),
}

export const incidentsService = {
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get('/admin/incidents', { params }),
  get: (id: string) => apiClient.get(`/admin/incidents/${id}`),
  moderate: (id: string, action: string, notes?: string) =>
    apiClient.put(`/admin/incidents/${id}`, { action, notes }),
}

export const rewardsService = {
  getMonitoring: (period?: string) =>
    apiClient.get('/admin/rewards', { params: { period } }),
  adjust: (userId: string, gemsAmount: number, reason: string) =>
    apiClient.post('/admin/rewards/adjust', { userId, gemsAmount, reason }),
  getLeaderboard: (period?: string, limit?: number) =>
    apiClient.get('/admin/leaderboard', { params: { period, limit } }),
}

export const partnersService = {
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get('/admin/partners', { params }),
  get: (id: string) => apiClient.get(`/admin/partners/${id}`),
  updateStatus: (id: string, status: string, reason?: string) =>
    apiClient.put(`/admin/partners/${id}/status`, { status, reason }),
  getOffers: (id: string) => apiClient.get(`/admin/partners/${id}/offers`),
}

export const dashboardService = {
  get: () => apiClient.get('/admin/dashboard'),
  getAnalytics: (params?: { metric?: string; period?: string }) =>
    apiClient.get('/admin/analytics', { params }),
}
