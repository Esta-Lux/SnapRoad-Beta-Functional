/** Normalize errors from adminApi.request (throws Error with server message) for UI feedback. */
export function adminApiErrorMessage(error: unknown, fallback = 'Request failed'): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim()
  return fallback
}
