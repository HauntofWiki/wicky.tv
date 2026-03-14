import { useNavigate } from 'react-router-dom'
import { logout } from '../api'
import { useAuth } from '../App'

export default function Home() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    setUser(null)
    navigate('/login')
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <span style={styles.logo}>wicky.tv</span>
        <div style={styles.nav}>
          {user?.is_admin && (
            <span style={styles.navLink} onClick={() => navigate('/admin/invites')}>
              invites
            </span>
          )}
          <span style={styles.navLink} onClick={handleLogout}>
            log out
          </span>
        </div>
      </div>
      <div style={styles.body}>
        <p style={styles.welcome}>hey, {user?.display_name || user?.username}.</p>
        <p style={styles.muted}>posts coming in phase 3.</p>
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
  nav: {
    display: 'flex',
    gap: '20px',
  },
  navLink: {
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  body: {
    padding: '60px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  welcome: {
    fontSize: '22px',
  },
  muted: {
    color: 'var(--text-muted)',
  },
}
