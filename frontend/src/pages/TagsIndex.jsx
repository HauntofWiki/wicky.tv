import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTags } from '../api'
import { useAuth } from '../App'

export default function TagsIndex() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTags()
      .then(setTags)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const max = tags[0]?.count || 1

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <span style={styles.logo} onClick={() => navigate('/home')}>wicky.tv</span>
        <div style={styles.nav}>
          {user ? (
            <span style={styles.navLink} onClick={() => navigate('/home')}>home</span>
          ) : (
            <span style={styles.navLink} onClick={() => navigate('/login')}>log in</span>
          )}
        </div>
      </div>

      <div className="page-body" style={styles.body}>
        <p style={styles.pageLabel}>tags</p>

        {loading ? (
          <p style={styles.muted}>loading...</p>
        ) : tags.length === 0 ? (
          <p style={styles.muted}>no tags yet.</p>
        ) : (
          <div style={styles.list}>
            {tags.map(({ tag, count }) => (
              <div
                key={tag}
                style={styles.row}
                onClick={() => navigate(`/tags/${encodeURIComponent(tag)}`)}
              >
                <div style={styles.barWrap}>
                  <div style={{ ...styles.bar, width: `${(count / max) * 100}%` }} />
                </div>
                <span style={styles.tagName}>{tag}</span>
                <span style={styles.count}>{count}</span>
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
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 24px', borderBottom: '1px solid var(--border)',
  },
  logo: { color: 'var(--accent)', fontSize: '18px', cursor: 'pointer' },
  nav: { display: 'flex', gap: '20px' },
  navLink: { color: 'var(--text-muted)', cursor: 'pointer' },
  body: {
    maxWidth: '600px', width: '100%',
    margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '8px',
  },
  pageLabel: {
    color: 'var(--accent)', fontSize: '13px', letterSpacing: '0.1em',
    textTransform: 'uppercase', marginBottom: '16px',
  },
  muted: { color: 'var(--text-muted)', fontSize: '13px' },
  list: { display: 'flex', flexDirection: 'column', gap: '2px' },
  row: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '10px 0', borderBottom: '1px solid var(--border)',
    cursor: 'pointer', position: 'relative',
  },
  barWrap: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: '2px',
    background: 'var(--border)',
  },
  bar: {
    height: '100%', background: 'var(--accent)', opacity: 0.4,
    transition: 'width 0.3s',
  },
  tagName: { fontSize: '15px', flex: 1 },
  count: { color: 'var(--text-muted)', fontSize: '13px', flexShrink: 0 },
}
