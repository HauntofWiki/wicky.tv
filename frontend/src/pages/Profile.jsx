import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProfile } from '../api'
import { useAuth } from '../App'

export default function Profile() {
  const { username: rawUsername } = useParams()
  const username = rawUsername?.replace(/^@/, '')
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getProfile(username)
      .then(setProfile)
      .catch(() => setError('User not found'))
  }, [username])

  if (error) {
    return (
      <div style={styles.page}>
        <Header navigate={navigate} user={user} />
        <div style={styles.body}>
          <p style={styles.muted}>{error}</p>
        </div>
      </div>
    )
  }

  if (!profile) return null

  const isOwn = user?.username === profile.username
  const bioHtml = profile.bio
    ? DOMPurify.sanitize(marked.parse(profile.bio))
    : null

  return (
    <div style={styles.page}>
      <Header navigate={navigate} user={user} />
      <div style={styles.body}>
        <div style={styles.profileHeader}>
          <div style={styles.avatarWrap}>
            {profile.profile_picture ? (
              <img src={profile.profile_picture} alt="avatar" style={styles.avatar} />
            ) : (
              <div style={styles.avatarPlaceholder}>
                {(profile.display_name || profile.username)[0].toUpperCase()}
              </div>
            )}
          </div>
          <div style={styles.profileInfo}>
            <div style={styles.displayName}>
              {profile.display_name || profile.username}
            </div>
            <div style={styles.usernameRow}>
              <span style={styles.muted}>@{profile.username}</span>
              {isOwn && (
                <span style={styles.editLink} onClick={() => navigate('/settings')}>
                  edit profile
                </span>
              )}
            </div>
            {profile.created_at && (
              <div style={styles.muted}>
                joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
            )}
            {bioHtml && (
              <div
                style={styles.bio}
                dangerouslySetInnerHTML={{ __html: bioHtml }}
              />
            )}
          </div>
        </div>
        <div style={styles.gridPlaceholder}>
          <p style={styles.muted}>posts coming in phase 3.</p>
        </div>
      </div>
    </div>
  )
}

function Header({ navigate, user }) {
  return (
    <div style={styles.header}>
      <span style={styles.logo} onClick={() => navigate('/home')} role="button">
        wicky.tv
      </span>
      <div style={styles.nav}>
        {user && (
          <span style={styles.navLink} onClick={() => navigate(`/@${user.username}`)}>
            @{user.username}
          </span>
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
  body: {
    padding: '40px 24px',
    maxWidth: '800px',
    width: '100%',
    margin: '0 auto',
  },
  profileHeader: {
    display: 'flex',
    gap: '28px',
    alignItems: 'flex-start',
    marginBottom: '40px',
  },
  avatarWrap: {
    flexShrink: 0,
  },
  avatar: {
    width: '90px',
    height: '90px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid var(--border)',
  },
  avatarPlaceholder: {
    width: '90px',
    height: '90px',
    borderRadius: '50%',
    background: 'var(--surface)',
    border: '2px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    color: 'var(--text-muted)',
  },
  profileInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
  },
  displayName: {
    fontSize: '20px',
    fontWeight: 'bold',
  },
  usernameRow: {
    display: 'flex',
    gap: '14px',
    alignItems: 'center',
  },
  editLink: {
    color: 'var(--accent)',
    cursor: 'pointer',
    fontSize: '13px',
  },
  muted: {
    color: 'var(--text-muted)',
    fontSize: '13px',
  },
  bio: {
    marginTop: '8px',
    lineHeight: '1.6',
  },
  gridPlaceholder: {
    borderTop: '1px solid var(--border)',
    paddingTop: '32px',
  },
}
