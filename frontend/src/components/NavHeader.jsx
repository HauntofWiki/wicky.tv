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
            <div style={styles.rightGroup}>
            <span style={styles.newBtn} onClick={() => go('/new')}>+</span>
            <div className="nav-full">
              <span style={styles.navLink} onClick={() => go('/home')}>morioh</span>
              <span style={styles.navLink} onClick={() => go('/notifications')}>
                pings{unread > 0 && <span style={styles.badge}>{unread}</span>}
              </span>
              <span style={styles.navLink} onClick={() => go('/people')}>beings</span>
              <span style={styles.navLink} onClick={() => go('/tags')}>relays</span>
              <span style={styles.navLink} onClick={() => go(`/@${user.username}`)}>@{user.username}</span>
              <span style={styles.navLink} onClick={() => go('/config')}>config</span>
              <span style={styles.navLink} onClick={handleLogout}>disconnect</span>
              {user.is_admin && (
                <span style={styles.navLink} onClick={() => go('/admin')}>admin</span>
              )}
            </div>
            <button className="hamburger-btn" onClick={() => setMenuOpen(o => !o)}>
              {menuOpen ? '✕' : '≡'}
            </button>
            </div>
          </>
        ) : (
          <div style={styles.nav}>
            <span style={styles.navLink} onClick={() => go('/login')}>log in</span>
          </div>
        )}
      </div>

      {user && menuOpen && (
        <div className="mobile-nav-menu">
          <span className="mobile-nav-menu-item" onClick={() => go('/home')}>morioh</span>
          <span className="mobile-nav-menu-item" onClick={() => go('/notifications')}>
            pings{unread > 0 && <span style={styles.badge}>{unread}</span>}
          </span>
          <span className="mobile-nav-menu-item" onClick={() => go('/people')}>beings</span>
          <span className="mobile-nav-menu-item" onClick={() => go('/tags')}>relays</span>
          <span className="mobile-nav-menu-item" onClick={() => go(`/@${user.username}`)}>@{user.username}</span>
          <span className="mobile-nav-menu-item" onClick={() => go('/config')}>config</span>
          <span className="mobile-nav-menu-item" onClick={handleLogout}>disconnect</span>
          {user.is_admin && (
            <span className="mobile-nav-menu-item" onClick={() => go('/admin')}>admin</span>
          )}
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
  navLink: {
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  rightGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  newBtn: {
    color: 'var(--accent)',
    fontSize: '24px',
    cursor: 'pointer',
    lineHeight: 1,
    padding: '0 4px',
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
