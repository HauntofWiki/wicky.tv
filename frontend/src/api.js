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

export const getProfile = (username) => request(`/users/${username}`)

export const updateProfile = (display_name, bio) =>
  request('/users/me', {
    method: 'PUT',
    body: JSON.stringify({ display_name, bio }),
  })

export const getFeed = () => request('/posts/feed')

export const listUsers = () => request('/users')

export const followUser = (username) =>
  request(`/users/${username}/follow`, { method: 'POST' })

export const unfollowUser = (username) =>
  request(`/users/${username}/follow`, { method: 'DELETE' })

export const blockUser = (username) =>
  request(`/users/${username}/block`, { method: 'POST' })

export const unblockUser = (username) =>
  request(`/users/${username}/block`, { method: 'DELETE' })

export const listPosts = (username) =>
  request(`/posts${username ? `?username=${encodeURIComponent(username)}` : ''}`)

export const listReplies = (postId) => request(`/posts/${postId}/replies`)

export const getPost = (id) => request(`/posts/${id}`)

// Used for both root posts and replies. Pass parent_post_id in formData for replies.
export const createPost = (formData) =>
  fetch(`${BASE}/posts`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  }).then(async (res) => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }))
      throw new Error(err.detail || 'Upload failed')
    }
    return res.json()
  })

export const updatePost = (id, formData) =>
  fetch(`/api/posts/${id}`, {
    method: 'PUT',
    credentials: 'include',
    body: formData,
  }).then(async (res) => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Update failed' }))
      throw new Error(err.detail || 'Update failed')
    }
    return res.json()
  })

export const deletePost = (id) => request(`/posts/${id}`, { method: 'DELETE' })

export const uploadAvatar = (file) => {
  const form = new FormData()
  form.append('file', file)
  return fetch(`${BASE}/users/me/avatar`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  }).then(async (res) => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }))
      throw new Error(err.detail || 'Upload failed')
    }
    return res.json()
  })
}
