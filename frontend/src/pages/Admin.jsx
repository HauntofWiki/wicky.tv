import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  approveAccessRequest, createInvite, deleteUser,
  dismissAccessRequest, listAccessRequests, listAdminUsers, listInvites,
} from '../api'
import NavHeader from '../components/NavHeader'

const TABS = ['invites', 'members', 'requests']

export default function Admin() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('invites')
  const [error, setError] = useState(null)

  // invites
  const [invites, setInvites] = useState([])
  const [invitesLoading, setInvitesLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(null)

  // members
  const [members, setMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(null)

  // requests
  const [requests, setRequests] = useState([])
  const [requestsLoading, setRequestsLoading] = useState(true)

  useEffect(() => {
    listInvites().then(setInvites).catch(e => setError(e.message)).finally(() => setInvitesLoading(false))
    listAdminUsers().then(setMembers).catch(() => {}).finally(() => setMembersLoading(false))
    listAccessRequests().then(setRequests).catch(() => {}).finally(() => setRequestsLoading(false))
  }, [])

  async function handleGenerate() {
    setGenerating(true); setError(null)
    try {
      const invite = await createInvite()
      setInvites(prev => [invite, ...prev])
    } catch (e) { setError(e.message) }
    setGenerating(false)
  }

  function handleCopy(code) {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  async function handleDeleteUser(username) {
    try {
      await deleteUser(username)
      setMembers(prev => prev.filter(u => u.username !== username))
    } catch (e) { setError(e.message) }
    setConfirmDelete(null)
  }

  async function handleApprove(id) {
    try {
      await approveAccessRequest(id)
      setRequests(prev => prev.filter(r => r.id !== id))
    } catch (e) { setError(e.message) }
  }

  async function handleDismiss(id) {
    await dismissAccessRequest(id)
    setRequests(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div style={styles.page}>
      <NavHeader />
      <div style={styles.body}>
        <p style={styles.pageLabel}>admin</p>

        {error && <p className="error">{error}</p>}

        <div style={styles.tabs}>
          {TABS.map(t => (
            <span
              key={t}
              style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}
              onClick={() => setTab(t)}
            >
              {t}
              {t === 'requests' && requests.length > 0 && (
                <span style={styles.badge}>{requests.length}</span>
              )}
            </span>
          ))}
        </div>

        {tab === 'invites' && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <button onClick={handleGenerate} disabled={generating}>
                {generating ? 'generating...' : '+ generate code'}
              </button>
            </div>
            {invitesLoading ? <p style={styles.muted}>loading...</p>
              : invites.length === 0 ? <p style={styles.muted}>no invite codes yet.</p>
              : (
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
                    {invites.map(i => (
                      <tr key={i.code} style={styles.row}>
                        <td style={styles.td}><span style={styles.code}>{i.code}</span></td>
                        <td style={styles.td}>{i.use_count} / {i.max_uses}</td>
                        <td style={styles.td}>{i.expires_at ? new Date(i.expires_at).toLocaleDateString() : '—'}</td>
                        <td style={styles.td}>
                          <span style={styles.action} onClick={() => handleCopy(i.code)}>
                            {copied === i.code ? 'copied!' : 'copy'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        )}

        {tab === 'members' && (
          <div style={styles.section}>
            {membersLoading ? <p style={styles.muted}>loading...</p>
              : members.length === 0 ? <p style={styles.muted}>no members yet.</p>
              : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>username</th>
                      <th style={styles.th}>display name</th>
                      <th style={styles.th}>joined</th>
                      <th style={styles.th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(u => (
                      <tr key={u.username} style={styles.row}>
                        <td style={styles.td}>
                          <span style={styles.code} onClick={() => navigate(`/@${u.username}`)}>@{u.username}</span>
                        </td>
                        <td style={styles.td}>{u.display_name || '—'}</td>
                        <td style={styles.td}>{new Date(u.created_at).toLocaleDateString()}</td>
                        <td style={styles.td}>
                          {confirmDelete === u.username ? (
                            <>
                              <span style={styles.danger} onClick={() => handleDeleteUser(u.username)}>confirm</span>
                              {' · '}
                              <span style={styles.action} onClick={() => setConfirmDelete(null)}>cancel</span>
                            </>
                          ) : (
                            <span style={styles.danger} onClick={() => setConfirmDelete(u.username)}>delete</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        )}

        {tab === 'requests' && (
          <div style={styles.section}>
            {requestsLoading ? <p style={styles.muted}>loading...</p>
              : requests.length === 0 ? <p style={styles.muted}>no pending requests.</p>
              : (
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
                        <td style={styles.td}><span style={styles.code}>{r.email}</span></td>
                        <td style={{ ...styles.td, color: 'var(--text-muted)', fontSize: '13px' }}>{r.message || '—'}</td>
                        <td style={styles.td}>{new Date(r.created_at).toLocaleDateString()}</td>
                        <td style={styles.td}>
                          <span style={styles.approve} onClick={() => handleApprove(r.id)}>approve</span>
                          {' · '}
                          <span style={styles.action} onClick={() => handleDismiss(r.id)}>dismiss</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  body: {
    padding: '40px 24px', maxWidth: '700px',
    width: '100%', margin: '0 auto',
    display: 'flex', flexDirection: 'column', gap: '24px',
  },
  pageLabel: {
    color: 'var(--accent)', fontSize: '13px', letterSpacing: '0.1em',
    textTransform: 'uppercase', margin: 0,
  },
  tabs: { display: 'flex', gap: '4px', borderBottom: '1px solid var(--border)', paddingBottom: '0' },
  tab: {
    padding: '8px 16px', cursor: 'pointer', fontSize: '13px',
    color: 'var(--text-muted)', borderBottom: '2px solid transparent',
    marginBottom: '-1px', display: 'flex', alignItems: 'center', gap: '6px',
  },
  tabActive: { color: 'var(--accent)', borderBottomColor: 'var(--accent)' },
  badge: {
    background: 'var(--accent)', color: '#000',
    borderRadius: '10px', padding: '0 6px', fontSize: '11px', fontWeight: 'bold',
  },
  section: { display: 'flex', flexDirection: 'column', gap: '16px' },
  sectionHeader: { display: 'flex', justifyContent: 'flex-end' },
  muted: { color: 'var(--text-muted)', fontSize: '13px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left', color: 'var(--text-muted)', fontWeight: 'normal',
    paddingBottom: '10px', borderBottom: '1px solid var(--border)', fontSize: '13px',
  },
  row: { borderBottom: '1px solid var(--border)' },
  td: { padding: '10px 0', fontSize: '14px' },
  code: { color: 'var(--accent)', letterSpacing: '0.05em', cursor: 'pointer' },
  action: { color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' },
  approve: { color: 'var(--accent)', cursor: 'pointer', fontSize: '12px' },
  danger: { color: 'var(--error)', cursor: 'pointer', fontSize: '12px' },
}
