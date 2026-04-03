/** Parse FastAPI / Starlette error JSON into a single user-facing string. */
export function messageFromHttpJson(payload: unknown, status: number): string {
  if (!payload || typeof payload !== 'object') {
    if (status === 401) return 'Session expired. Please sign in again.'
    if (status === 403) return 'You do not have permission to do that.'
    return `Request failed (${status}).`
  }
  const p = payload as { detail?: unknown; message?: string }
  if (typeof p.message === 'string' && p.message.trim()) return p.message.trim()
  const d = p.detail
  if (typeof d === 'string' && d.trim()) return d.trim()
  if (Array.isArray(d)) {
    const parts = d
      .map((x) =>
        typeof x === 'object' && x !== null && 'msg' in x
          ? String((x as { msg?: string }).msg ?? '').trim()
          : '',
      )
      .filter(Boolean)
    if (parts.length) return parts.join(' ')
  }
  if (status === 401) return 'Session expired. Please sign in again.'
  if (status === 403) return 'You do not have permission to do that.'
  if (status === 422) return 'Please check your input and try again.'
  return `Something went wrong (${status}).`
}
