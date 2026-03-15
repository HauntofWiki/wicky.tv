import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFeed, logout } from '../api'
import { useAuth } from '../App'

export default function Home() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    getFeed()
      .then(setPosts)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleLogout() {
    await logout()
    setUser(null)
    navigate('/login')
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <span style={styles.logo}>wicky.tv</span>
        <div className="nav-full">
          {user?.is_admin && (
            <span style={styles.navLink} onClick={() => navigate('/admin/invites')}>invites</span>
          )}
          <span style={styles.navLink} onClick={() => navigate('/new')}>new post</span>
          <span style={styles.navLink} onClick={() => navigate('/people')}>people</span>
          <span style={styles.navLink} onClick={() => navigate('/tags')}>tags</span>
          <span style={styles.navLink} onClick={() => navigate('/settings')}>settings</span>
          <span style={styles.navLink} onClick={() => navigate(`/@${user?.username}`)}>@{user?.username}</span>
          <span style={styles.navLink} onClick={handleLogout}>log out</span>
        </div>
        <button className="hamburger-btn" onClick={() => setMenuOpen(o => !o)}>
          {menuOpen ? '✕' : '≡'}
        </button>
      </div>

      {menuOpen && (
        <div className="mobile-nav-menu">
          {user?.is_admin && (
            <span className="mobile-nav-menu-item" onClick={() => { navigate('/admin/invites'); setMenuOpen(false) }}>invites</span>
          )}
          <span className="mobile-nav-menu-item" onClick={() => { navigate('/new'); setMenuOpen(false) }}>new post</span>
          <span className="mobile-nav-menu-item" onClick={() => { navigate('/people'); setMenuOpen(false) }}>people</span>
          <span className="mobile-nav-menu-item" onClick={() => { navigate('/tags'); setMenuOpen(false) }}>tags</span>
          <span className="mobile-nav-menu-item" onClick={() => { navigate('/settings'); setMenuOpen(false) }}>settings</span>
          <span className="mobile-nav-menu-item" onClick={() => { navigate(`/@${user?.username}`); setMenuOpen(false) }}>@{user?.username}</span>
          <span className="mobile-nav-menu-item" onClick={handleLogout}>log out</span>
        </div>
      )}

      <div className="page-body" style={styles.body}>
        <p style={styles.welcome}>hey, {user?.display_name || user?.username}.</p>
        <p style={styles.feedLabel}>morioh</p>

        {loading ? (
          <p style={styles.muted}>loading...</p>
        ) : posts.length === 0 ? (
          <p style={styles.muted}>nothing here yet. invite some people.</p>
        ) : (
          <div style={styles.feed}>
            {posts.map(post => {
              const isReply = !!post.parent_post_id
              const threadId = isReply ? post.parent_post_id : post.id
              const displayTitle = post.title
                || (post.description ? post.description.slice(0, 60) + (post.description.length > 60 ? '…' : '') : null)
                || '(reply)'
              return (
                <div
                  key={post.id}
                  style={styles.card}
                  onClick={() => navigate(`/post/${threadId}`)}
                >
                  {post.media_type === 'video' ? (
                    <div style={styles.videoThumb}>
                      <span style={styles.playIcon}>▶</span>
                    </div>
                  ) : post.media_path ? (
                    <img
                      src={`/uploads/${post.thumbnail_path || post.media_path}`}
                      alt={displayTitle}
                      style={styles.cardImg}
                    />
                  ) : (
                    <div style={styles.textThumb}>↩</div>
                  )}
                  <div style={styles.cardMeta}>
                    {isReply && post.parent_preview && (
                      <span style={styles.replyContext}>
                        ↩ in{' '}
                        <span
                          style={styles.replyContextLink}
                          onClick={e => { e.stopPropagation(); navigate(`/post/${post.parent_preview.id}`) }}
                        >
                          {post.parent_preview.title || `@${post.parent_preview.user.username}'s post`}
                        </span>
                      </span>
                    )}
                    <span style={styles.cardTitle}>{displayTitle}</span>
                    <span style={styles.cardBy}>
                      <span
                        style={styles.cardUsername}
                        onClick={e => { e.stopPropagation(); navigate(`/@${post.user.username}`) }}
                      >
                        @{post.user.username}
                      </span>
                      {post.user.title && (
                        <span style={styles.titleBadge}>✦ {post.user.title}</span>
                      )}
                      <span style={styles.muted}>
                        {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </span>
                  </div>
                </div>
              )
            })}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderBottom: '1px solid var(--border)',
  },
  logo: {
    color: 'var(--accent)',
    fontSize: '18px',
  },
  navLink: {
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  body: {
    maxWidth: '600px',
    width: '100%',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  welcome: {
    fontSize: '22px',
    margin: 0,
  },
  feedLabel: {
    color: 'var(--accent)',
    fontSize: '13px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginTop: '4px',
    marginBottom: '16px',
  },
  muted: {
    color: 'var(--text-muted)',
    fontSize: '13px',
  },
  feed: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  card: {
    display: 'flex',
    gap: '14px',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid var(--border)',
    cursor: 'pointer',
  },
  cardImg: {
    width: '72px',
    height: '72px',
    objectFit: 'cover',
    borderRadius: '3px',
    flexShrink: 0,
    background: 'var(--surface)',
  },
  videoThumb: {
    width: '72px',
    height: '72px',
    flexShrink: 0,
    background: 'var(--surface)',
    borderRadius: '3px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: 'var(--accent)',
    fontSize: '22px',
  },
  cardMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: '15px',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
  cardBy: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  cardUsername: {
    color: 'var(--accent)',
    fontSize: '13px',
    cursor: 'pointer',
  },
  textThumb: {
    width: '72px',
    height: '72px',
    flexShrink: 0,
    background: 'var(--surface)',
    borderRadius: '3px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
    fontSize: '22px',
  },
  replyContext: {
    color: 'var(--text-muted)',
    fontSize: '11px',
  },
  replyContextLink: {
    color: 'var(--accent)',
    cursor: 'pointer',
  },
  titleBadge: {
    color: 'var(--title, #00e8c8)',
    fontSize: '12px',
  },
}
