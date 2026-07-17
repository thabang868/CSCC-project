import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Exported so individual pages can issue ad-hoc requests
// (e.g. Customer360 needs to fetch decrypted audio as a blob with auth).
export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dm_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('dm_token')
      localStorage.removeItem('dm_user')
      if (!location.pathname.startsWith('/login')) {
        location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

// ---------- Auth ----------
export const authApi = {
  register: (payload) => api.post('/api/auth/register', payload).then((r) => r.data),
  login:    (payload) => api.post('/api/auth/login',    payload).then((r) => r.data),
  me:       ()        => api.get('/api/auth/me').then((r) => r.data),
  forgot:   (email)   => api.post('/api/auth/forgot-password', { email }).then((r) => r.data),
  reset:    (token, new_password) =>
    api.post('/api/auth/reset-password', { token, new_password }).then((r) => r.data),
  verifyEmail:        (token) => api.post('/api/auth/verify-email', { token }).then((r) => r.data),
  resendVerification: (email) => api.post('/api/auth/resend-verification', { email }).then((r) => r.data),
  updateAvatar:       (dataUrl) => api.put('/api/auth/me/avatar', { avatar: dataUrl }).then((r) => r.data),
  removeAvatar:       ()        => api.delete('/api/auth/me/avatar').then((r) => r.data),
}

// ---------- Dashboard ----------
export const dashApi = {
  kpis:                 () => api.get('/api/dashboard/kpis').then((r) => r.data),

  revenueByMonth:       () => api.get('/api/dashboard/executive/revenue-by-month').then((r) => r.data),
  revenueByProduct:     (top = 10) =>
    api.get('/api/dashboard/executive/revenue-by-product', { params: { top } }).then((r) => r.data),
  revenueByTerritory:   () => api.get('/api/dashboard/executive/revenue-by-territory').then((r) => r.data),
  revenueByCategory:    () => api.get('/api/dashboard/executive/revenue-by-category').then((r) => r.data),

  ordersByTerritory:    () => api.get('/api/dashboard/operations/orders-by-territory').then((r) => r.data),
  ordersByMonth:        () => api.get('/api/dashboard/operations/orders-by-month').then((r) => r.data),
  ordersByCategory:     () => api.get('/api/dashboard/operations/orders-by-category').then((r) => r.data),
  ordersByProduct:      (top = 25) =>
    api.get('/api/dashboard/operations/orders-by-product', { params: { top } }).then((r) => r.data),
  ordersByListPrice:    () => api.get('/api/dashboard/operations/orders-by-listprice').then((r) => r.data),

  quantityByProduct:    (top = 25) =>
    api.get('/api/dashboard/analytics/quantity-by-product', { params: { top } }).then((r) => r.data),
  quantityByMonth:      () => api.get('/api/dashboard/analytics/quantity-by-month').then((r) => r.data),
  aovByCategory:        () => api.get('/api/dashboard/analytics/aov-by-category').then((r) => r.data),
  aovByYear:            () => api.get('/api/dashboard/analytics/aov-by-year').then((r) => r.data),
  aovByStandardCost:    () => api.get('/api/dashboard/analytics/aov-by-standardcost').then((r) => r.data),
}

// ---------- Power BI ----------
export const pbiApi = {
  embed: (category) => api.get(`/api/powerbi/embed/${category}`).then((r) => r.data),
}

// ---------- Tickets ----------
// `create` always uses multipart so an optional voice note can ride along
// with the rest of the ticket fields. `voice` is an object produced by the
// VoiceRecorder component: { blob, mime, durationSeconds, transcript }.
const buildTicketForm = (payload, voice) => {
  const fd = new FormData()
  fd.append('title', payload.title ?? '')
  fd.append('description', payload.description ?? '')
  fd.append('category', payload.category ?? 'decision')
  fd.append('priority', payload.priority ?? 'medium')
  if (payload.recipient_email) fd.append('recipient_email', payload.recipient_email)
  if (voice?.blob) {
    const ext = (voice.mime || 'audio/webm').includes('mp4') ? 'm4a' : 'webm'
    fd.append('voice', voice.blob, `voice-note.${ext}`)
    if (voice.transcript) fd.append('voice_transcript', voice.transcript)
    if (voice.durationSeconds) fd.append('voice_duration_seconds', String(voice.durationSeconds))
  }
  return fd
}

export const ticketApi = {
  create:    (payload, voice) =>
    api.post('/api/tickets', buildTicketForm(payload, voice), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),
  mine:      ()          => api.get('/api/tickets/mine').then((r) => r.data),
  byId:      (id)        => api.get(`/api/tickets/${id}`).then((r) => r.data),
  all:       (status)    =>
    api.get('/api/tickets', { params: status ? { status_filter: status } : {} }).then((r) => r.data),
  review:    (id, payload) =>
    api.patch(`/api/tickets/${id}/review`, payload).then((r) => r.data),
  audioUrl:  (id)          => `${baseURL}/api/tickets/${id}/audio`,
  transcript:(id)          => api.get(`/api/tickets/${id}/transcript`).then((r) => r.data),
  // Authorized blob fetcher - used for inline <audio> so the JWT goes along.
  audioBlob: (id)          =>
    api.get(`/api/tickets/${id}/audio`, { responseType: 'blob' }).then((r) => r.data),
}

// ---------- Chat ----------
// Each chat turn is AES-256-GCM-encrypted server-side and persisted to
// app.UserChat in SQL Server, linked to the authenticated user. `history`
// returns the decrypted rows newest-first. `welcome` returns the
// role-aware greeting + which specialist agent owns this user.
export const chatApi = {
  // `history` is the recent turns so the agent can answer follow-ups in context.
  ask:     (question, history = []) => api.post('/api/chat', { question, history }).then((r) => r.data),
  welcome: ()         => api.get('/api/chat/welcome').then((r) => r.data),
  history: (limit = 50) =>
    api.get('/api/chat/history', { params: { limit } }).then((r) => r.data),
  ingest:  ()         => api.post('/api/chat/ingest').then((r) => r.data),
  // Voice: upload recorded audio, get a transcript back (Deepgram on the backend).
  transcribe: (blob) => {
    const fd = new FormData()
    fd.append('audio', blob, 'question.webm')
    return api.post('/api/chat/voice/transcribe', fd).then((r) => r.data)
  },
  // TTS: synthesise an answer to speech (Deepgram Aura) — returns an MP3 blob.
  speak: (text) =>
    api.post('/api/chat/voice/speak', { text }, { responseType: 'blob' }).then((r) => r.data),
}

// ---------- AI intake (v1.6) ----------
// Live triage of a transcript — surfaces the AI's understanding (company,
// person, affected system, category, priority, summary) before the ticket
// is committed. Server runs the same logic on submit so the live preview
// matches what gets saved.
export const intakeApi = {
  analyze: (transcript, speaker_email = null) =>
    api.post('/api/intake/analyze', { transcript, speaker_email }).then((r) => r.data),
}

// ---------- Insights ----------
export const insightsApi = {
  recommendation: () => api.get('/api/insights/recommendation').then((r) => r.data),
}

// ---------- Health ----------
export const healthApi = {
  warehouse: () => api.get('/api/dashboard/health').then((r) => r.data),
}

// ---------- Admin ----------
export const adminApi = {
  listUsers:  () => api.get('/api/admin/users').then((r) => r.data),
  updateUser: (id, payload) => api.patch(`/api/admin/users/${id}`, payload).then((r) => r.data),
  deleteUser: (id) => api.delete(`/api/admin/users/${id}`).then((r) => r.data),
  usersCount: () => api.get('/api/admin/users/count').then((r) => r.data),
}

// ---------- Support Connect ----------
export const supportApi = {
  agents:    ()              => api.get('/api/support/agents').then((r) => r.data),
  hotline:   ()              => api.get('/api/support/hotline').then((r) => r.data),
  create:    (payload)       => api.post('/api/support', payload).then((r) => r.data),
  listMine:  ()              => api.get('/api/support/mine').then((r) => r.data),
  listAll:   (status)        => api.get('/api/support', { params: status ? { status_filter: status } : {} }).then((r) => r.data),
  update:    (id, payload)   => api.patch(`/api/support/${id}`, payload).then((r) => r.data),
  schedule:  (id, payload)   => api.post(`/api/support/${id}/schedule`, payload).then((r) => r.data),
  endCall:   (id, formData)  =>
    api.post(`/api/support/${id}/calls/end`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  listCalls: (id)            => api.get(`/api/support/${id}/calls`).then((r) => r.data),
  transcript:(callId)        => api.get(`/api/support/calls/${callId}/transcript`).then((r) => r.data),
  audioUrl:  (callId)        => `${baseURL}/api/support/calls/${callId}/audio`,
  dashboard: ()              => api.get('/api/support/dashboard').then((r) => r.data),
  customer360: (userId)      => api.get(`/api/support/customer360/${userId}`).then((r) => r.data),
}

// ---------- Notifications ----------
export const notificationsApi = {
  list:        () => api.get('/api/notifications').then((r) => r.data),
  markRead:    (id) => api.patch(`/api/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.post('/api/notifications/read-all').then((r) => r.data),
}
