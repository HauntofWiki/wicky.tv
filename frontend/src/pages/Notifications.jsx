import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getNotifications, markNotificationsRead } from '../api'
import NavHeader from '../components/NavHeader'

const PAGE = 20

export default function Notifications() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    getNotifications(PAGE, 0)
      .then((d) => { setNotifications(d.notifications); setTotal(d.total) })
      .catch(() => {})
      .finally(() => setLoading(false))
    markNotificationsRead().catch(() => {})
    const id = setInterval(() => {
      getNotifications(PAGE, 0).then((d) => { setNotifications(d.notifications); setTotal(d.total) }).catch(() => {})
    }, 10000)
    return () => clearInterval(id)
  }, [])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const d = await getNotifications(PAGE, notifications.length)
      setNotifications(prev => [...prev, ...d.notifications])
      setTotal(d.total)
    } catch {}
    setLoadingMore(false)
  }

  function label(n) {
    if (n.type === 'reply') return 'replied to your post'
    if (n.type === 'quote') return 'quoted your post'
    if (n.type === 'follow') return 'followed you'
    return n.type
  }

  return (
    <div style={styles.page}>
      <NavHeader />
      <div className="page-body" style={styles.body}>
        <p style={styles.pageLabel}>notifications</p>

        {loading ? (
          <p style={styles.muted}>loading...</p>
        ) : notifications.length === 0 ? (
          <p style={styles.muted}>nothing here yet.</p>
        ) : (
          <>
            <div style={styles.list}>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  style={{ ...styles.row, ...(n.is_read ? {} : styles.unread) }}
                  onClick={() => {
                    if (n.parent_post_id) navigate(`/post/${n.parent_post_id}?highlight=${n.post_id}`)
                    else navigate(`/@${n.actor_username}`)
                  }}
                >
                  <span style={styles.actor}>@{n.actor_username}</span>
                  <span style={styles.text}> {label(n)}</span>
                  <span style={styles.date}>
                    {new Date(n.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </span>
                </div>
              ))}
            </div>
            {notifications.length < total && (
              <span style={styles.loadMore} onClick={loadMore}>
                {loadingMore ? 'loading…' : `load more (${total - notifications.length} remaining)`}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  body: {
    maxWidth: '600px', width: '100%', margin: '0 auto',
    display: 'flex', flexDirection: 'column', gap: '8px',
  },
  pageLabel: {
    color: 'var(--accent)', fontSize: '13px', letterSpacing: '0.1em',
    textTransform: 'uppercase', marginBottom: '16px',
  },
  muted: { color: 'var(--text-muted)', fontSize: '13px' },
  list: { display: 'flex', flexDirection: 'column' },
  row: {
    display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap',
    padding: '12px 0', borderBottom: '1px solid var(--border)',
    cursor: 'pointer', fontSize: '14px',
  },
  unread: { borderLeft: '2px solid var(--accent)', paddingLeft: '10px' },
  actor: { color: 'var(--accent)', fontWeight: 'bold' },
  text: { color: 'var(--text)' },
  date: { color: 'var(--text-muted)', fontSize: '12px', marginLeft: 'auto' },
  loadMore: {
    color: 'var(--accent)', fontSize: '13px', cursor: 'pointer',
    padding: '12px 0', display: 'block', textAlign: 'center',
  },
}
