import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getNotifications, logout } from '../api'
import { useAuth } from '../App'

export default function NavHeader() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!user) return
    const poll = () => getNotifications().then(d => setUnread(d.unread)).catch(() => {})
    poll()
    const id = setInterval(poll, 30000)
    return () => clearInterval(id)
  }, [user])

  async function handleLogout() {
    await logout()
    setUser(null)
    navigate('/login')
  }

  const go = (path) => { navigate(path); setMenuOpen(false) }

  return (
    <>
      <div style={styles.header}>
        <span style={styles.logo} onClick={() => go(user ? '/home' : '/')}>wicky.tv</span>
        {user ? (
          <>
            <div className="nav-full" style={styles.nav}>
              {user.is_admin && (
                <span style={styles.navLink} onClick={() => go('/admin/invites')}>invites</span>
              )}
              <span style={styles.navLink} onClick={() => go('/new')}>new post</span>
              <span style={styles.navLink} onClick={() => go('/people')}>people</span>
              <span style={styles.navLink} onClick={() => go('/tags')}>tags</span>
              <span style={styles.navLink} onClick={() => go('/settings')}>settings</span>
              <span style={styles.navLink} onClick={() => go('/notifications')}>
                notifications{unread > 0 && <span style={styles.badge}>{unread}</span>}
              </span>
              <span style={styles.navLink} onClick={() => go(`/@${user.username}`)}>@{user.username}</span>
              <span style={styles.navLink} onClick={handleLogout}>log out</span>
            </div>
            <button className="hamburger-btn" onClick={() => setMenuOpen(o => !o)}>
              {menuOpen ? '✕' : '≡'}
            </button>
          </>
        ) : (
          <div style={styles.nav}>
            <span style={styles.navLink} onClick={() => go('/login')}>log in</span>
          </div>
        )}
      </div>

      {user && menuOpen && (
        <div className="mobile-nav-menu">
          {user.is_admin && (
            <span className="mobile-nav-menu-item" onClick={() => go('/admin/invites')}>invites</span>
          )}
          <span className="mobile-nav-menu-item" onClick={() => go('/new')}>new post</span>
          <span className="mobile-nav-menu-item" onClick={() => go('/people')}>people</span>
          <span className="mobile-nav-menu-item" onClick={() => go('/tags')}>tags</span>
          <span className="mobile-nav-menu-item" onClick={() => go('/settings')}>settings</span>
          <span className="mobile-nav-menu-item" onClick={() => go('/notifications')}>
            notifications{unread > 0 && <span style={styles.badge}>{unread}</span>}
          </span>
          <span className="mobile-nav-menu-item" onClick={() => go(`/@${user.username}`)}>@{user.username}</span>
          <span className="mobile-nav-menu-item" onClick={handleLogout}>log out</span>
        </div>
      )}
    </>
  )
}

const styles = {
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
    cursor: 'pointer',
  },
  nav: {
    display: 'flex',
    gap: '20px',
  },
  navLink: {
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  badge: {
    display: 'inline-block',
    background: 'var(--accent)',
    color: '#000',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 'bold',
    padding: '0 5px',
    marginLeft: '5px',
    lineHeight: '16px',
  },
}
