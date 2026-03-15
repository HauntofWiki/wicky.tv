import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getNotifications, markNotificationsRead } from '../api'
import NavHeader from '../components/NavHeader'

export default function Notifications() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getNotifications()
      .then((d) => setNotifications(d.notifications))
      .catch(() => {})
      .finally(() => setLoading(false))

    markNotificationsRead().catch(() => {})
  }, [])

  function label(n) {
    if (n.type === 'reply') return 'replied to your post'
    if (n.type === 'quote') return 'quoted your post'
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
          <div style={styles.list}>
            {notifications.map((n) => (
              <div
                key={n.id}
                style={{ ...styles.row, ...(n.is_read ? {} : styles.unread) }}
                onClick={() => navigate(`/post/${n.parent_post_id}?highlight=${n.post_id}`)}
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
}
