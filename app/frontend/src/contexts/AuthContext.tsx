/**
 * Public entry for auth: import from here so paths stay stable.
 * Context object lives in authContextInstance.ts so Fast Refresh does not recreate it when AuthProvider changes.
 */
export { AuthProvider } from './AuthProvider'
export { useAuth, AuthContext } from './authContextInstance'
export type { User, ApiUser, AuthContextType } from './authContextInstance'
