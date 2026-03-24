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
export const listAdminUsers = () => request('/admin/users')
export const deleteUser = (username) => request(`/admin/users/${username}`, { method: 'DELETE' })

export const getProfile = (username) => request(`/users/${username}`)

export const updateProfile = (display_name, title, bio, is_public) =>
  request('/users/me', {
    method: 'PUT',
    body: JSON.stringify({ display_name, title, bio, is_public }),
  })

export const getPublicFeed = (limit = 50, offset = 0) =>
  request(`/posts/public-feed?limit=${limit}&offset=${offset}`)

export const pinPost = (id) => request(`/posts/${id}/pin`, { method: 'POST' })

export const unpinPost = (id) => request(`/posts/${id}/pin`, { method: 'DELETE' })

export const getFeed = (sort = 'new') => request(`/posts/feed?sort=${sort}`)

export const listUsers = () => request('/users')

export const followUser = (username) =>
  request(`/users/${username}/follow`, { method: 'POST' })

export const unfollowUser = (username) =>
  request(`/users/${username}/follow`, { method: 'DELETE' })

export const requestAccess = (email, message) =>
  request('/request-access', {
    method: 'POST',
    body: JSON.stringify({ email, message }),
  })

export const listAccessRequests = () => request('/admin/access-requests')

export const dismissAccessRequest = (id) =>
  request(`/admin/access-requests/${id}`, { method: 'DELETE' })

export const approveAccessRequest = (id) =>
  request(`/admin/access-requests/${id}/approve`, { method: 'POST' })

export const blockUser = (username) =>
  request(`/users/${username}/block`, { method: 'POST' })

export const unblockUser = (username) =>
  request(`/users/${username}/block`, { method: 'DELETE' })

export const listPosts = (username) =>
  request(`/posts${username ? `?username=${encodeURIComponent(username)}` : ''}`)

export const getTags = (since) =>
  request(`/posts/tags${since ? `?since=${since}` : ''}`)

export const listPostsByTag = (tag) =>
  request(`/posts?tag=${encodeURIComponent(tag)}`)

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

export const forgotPassword = (email) =>
  request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) })

export const resetPassword = (token, new_password) =>
  request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, new_password }) })

export const changePassword = (current_password, new_password) =>
  request('/users/me/password', {
    method: 'POST',
    body: JSON.stringify({ current_password, new_password }),
  })

export const deletePost = (id) => request(`/posts/${id}`, { method: 'DELETE' })

export const getWeddingMessages = () => request('/wedding/messages')

export const submitWeddingMessage = (formData) =>
  fetch(`${BASE}/wedding/messages`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  }).then(async (res) => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Submit failed' }))
      throw new Error(err.detail || 'Submit failed')
    }
    return res.json()
  })

export const hideWeddingMessage = (id) =>
  request(`/wedding/messages/${id}`, { method: 'DELETE' })

export const getNotifications = (limit = 20, offset = 0) => request(`/notifications?limit=${limit}&offset=${offset}`)

export const markNotificationsRead = () => request('/notifications/read', { method: 'POST' })

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
