import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createInvite, dismissAccessRequest, listAccessRequests, listInvites } from '../api'
import NavHeader from '../components/NavHeader'

export default function AdminInvites() {
  const navigate = useNavigate()
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(null)
  const [requests, setRequests] = useState([])

  useEffect(() => {
    listInvites()
      .then(setInvites)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
    listAccessRequests()
      .then(setRequests)
      .catch(() => {})
  }, [])

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const invite = await createInvite()
      setInvites(prev => [invite, ...prev])
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  function handleCopy(code) {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  async function handleDismiss(id) {
    await dismissAccessRequest(id)
    setRequests(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div style={styles.page}>
      <NavHeader />
      <div style={styles.body}>
        <div style={styles.titleRow}>
          <h2>invite codes</h2>
          <button onClick={handleGenerate} disabled={generating}>
            {generating ? 'generating...' : '+ generate'}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
        {loading ? (
          <p style={styles.muted}>loading...</p>
        ) : invites.length === 0 ? (
          <p style={styles.muted}>no invite codes yet.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>code</th>
                <th style={styles.th}>uses</th>
                <th style={styles.th}>expires</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {invites.map(invite => (
                <tr key={invite.code} style={styles.row}>
                  <td style={styles.td}>
                    <span style={styles.code}>{invite.code}</span>
                  </td>
                  <td style={styles.td}>
                    {invite.use_count} / {invite.max_uses}
                  </td>
                  <td style={styles.td}>
                    {invite.expires_at
                      ? new Date(invite.expires_at).toLocaleDateString()
                      : '—'}
                  </td>
                  <td style={styles.td}>
                    <span
                      style={styles.copyBtn}
                      onClick={() => handleCopy(invite.code)}
                    >
                      {copied === invite.code ? 'copied!' : 'copy'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {requests.length > 0 && (
          <div style={styles.requestsSection}>
            <h3 style={styles.sectionTitle}>
              access requests
              <span style={styles.badge}>{requests.length}</span>
            </h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>email</th>
                  <th style={styles.th}>message</th>
                  <th style={styles.th}>date</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id} style={styles.row}>
                    <td style={styles.td}>
                      <span style={styles.code}>{r.email}</span>
                    </td>
                    <td style={{ ...styles.td, color: 'var(--text-muted)', fontSize: '13px' }}>
                      {r.message || '—'}
                    </td>
                    <td style={styles.td}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td style={styles.td}>
                      <span style={styles.copyBtn} onClick={() => handleDismiss(r.id)}>
                        dismiss
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 24px',
    borderBottom: '1px solid var(--border)',
  },
  logo: {
    color: 'var(--accent)',
    fontSize: '18px',
    cursor: 'pointer',
  },
  body: {
    padding: '40px 24px',
    maxWidth: '700px',
  },
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  muted: {
    color: 'var(--text-muted)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    color: 'var(--text-muted)',
    fontWeight: 'normal',
    paddingBottom: '10px',
    borderBottom: '1px solid var(--border)',
  },
  row: {
    borderBottom: '1px solid var(--border)',
  },
  td: {
    padding: '10px 0',
  },
  code: {
    color: 'var(--accent)',
    letterSpacing: '0.05em',
  },
  copyBtn: {
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: '12px',
  },
  requestsSection: {
    marginTop: '48px',
  },
  sectionTitle: {
    fontWeight: 'normal',
    fontSize: '16px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  badge: {
    background: 'var(--accent)',
    color: '#000',
    borderRadius: '10px',
    padding: '1px 8px',
    fontSize: '12px',
  },
}
