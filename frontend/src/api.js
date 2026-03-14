const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

export const getMe = () => request('/auth/me')

export const login = (username, password) =>
  request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })

export const signup = (username, email, password, invite_code) =>
  request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ username, email, password, invite_code }),
  })

export const logout = () => request('/auth/logout', { method: 'POST' })

export const createInvite = () =>
  request('/admin/invites', { method: 'POST' })

export const listInvites = () => request('/admin/invites')
