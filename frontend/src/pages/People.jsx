import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { followUser, listUsers, unfollowUser } from '../api'
import { useAuth } from '../App'

export default function People() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listUsers()
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleFollow(username, isFollowing) {
    try {
      if (isFollowing) {
        await unfollowUser(username)
      } else {
        await followUser(username)
      }
      setUsers(prev =>
        prev.map(u =>
          u.username === username
            ? { ...u, is_following: !isFollowing, follower_count: u.follower_count + (isFollowing ? -1 : 1) }
            : u
        )
      )
    } catch (err) {
      // ignore
    }
  }

  const others = users.filter(u => u.username !== user?.username)

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <span style={styles.logo} onClick={() => navigate('/home')}>wicky.tv</span>
        <div style={styles.nav}>
          <span style={styles.navLink} onClick={() => navigate('/home')}>home</span>
          <span style={styles.navLink} onClick={() => navigate(`/@${user?.username}`)}>
            @{user?.username}
          </span>
        </div>
      </div>

      <div style={styles.body}>
        <p style={styles.pageTitle}>people</p>

        {loading ? (
          <p style={styles.muted}>loading...</p>
        ) : others.length === 0 ? (
          <p style={styles.muted}>no one else here yet.</p>
        ) : (
          <div style={styles.list}>
            {others.map(u => (
              <div key={u.username} style={styles.row}>
                <div style={styles.avatar} onClick={() => navigate(`/@${u.username}`)}>
                  {u.profile_picture ? (
                    <img src={u.profile_picture} alt="" style={styles.avatarImg} />
                  ) : (
                    <div style={styles.avatarPlaceholder}>
                      {(u.display_name || u.username)[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div style={styles.info} onClick={() => navigate(`/@${u.username}`)}>
                  <span style={styles.displayName}>{u.display_name || u.username}</span>
                  <span style={styles.muted}>@{u.username} · {u.follower_count} followers</span>
                </div>
                {!u.is_admin && (
                  <span
                    style={u.is_following ? styles.unfollowBtn : styles.followBtn}
                    onClick={() => handleFollow(u.username, u.is_following)}
                  >
                    {u.is_following ? 'unfollow' : 'follow'}
                  </span>
                )}
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
    padding: '40px 24px', maxWidth: '600px', width: '100%',
    margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px',
  },
  pageTitle: {
    color: 'var(--accent)', fontSize: '13px', letterSpacing: '0.1em',
    textTransform: 'uppercase', margin: 0,
  },
  muted: { color: 'var(--text-muted)', fontSize: '13px' },
  list: { display: 'flex', flexDirection: 'column' },
  row: {
    display: 'flex', alignItems: 'center', gap: '14px',
    padding: '12px 0', borderBottom: '1px solid var(--border)',
  },
  avatar: { flexShrink: 0, cursor: 'pointer' },
  avatarImg: {
    width: '44px', height: '44px', borderRadius: '50%',
    objectFit: 'cover', border: '1px solid var(--border)', display: 'block',
  },
  avatarPlaceholder: {
    width: '44px', height: '44px', borderRadius: '50%',
    background: 'var(--surface)', border: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '18px', color: 'var(--text-muted)', cursor: 'pointer',
  },
  info: {
    display: 'flex', flexDirection: 'column', gap: '3px',
    flex: 1, cursor: 'pointer', minWidth: 0,
  },
  displayName: { fontSize: '15px' },
  followBtn: {
    color: 'var(--accent)', cursor: 'pointer', fontSize: '13px',
    border: '1px solid var(--accent)', borderRadius: '3px',
    padding: '4px 12px', flexShrink: 0,
  },
  unfollowBtn: {
    color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px',
    border: '1px solid var(--border)', borderRadius: '3px',
    padding: '4px 12px', flexShrink: 0,
  },
}
