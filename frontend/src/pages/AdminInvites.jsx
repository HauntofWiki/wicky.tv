import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createInvite, listInvites } from '../api'

export default function AdminInvites() {
  const navigate = useNavigate()
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(null)

  useEffect(() => {
    listInvites()
      .then(setInvites)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
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

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <span style={styles.logo} onClick={() => navigate('/home')}>wicky.tv</span>
      </div>
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
}
