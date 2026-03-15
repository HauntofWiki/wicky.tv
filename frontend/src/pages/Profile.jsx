import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { followUser, getProfile, listPosts, unfollowUser } from '../api'
import { useAuth } from '../App'

export default function Profile() {
  const { username: rawUsername } = useParams()
  const username = rawUsername?.replace(/^@/, '')
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [error, setError] = useState('')
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    getProfile(username)
      .then(setProfile)
      .catch(() => setError('User not found'))
    listPosts(username).then(setPosts).catch(() => {})
  }, [username])

  if (error) {
    return (
      <div style={styles.page}>
        <Header navigate={navigate} user={user} />
        <div className="page-body" style={styles.body}>
          <p style={styles.muted}>{error}</p>
        </div>
      </div>
    )
  }

  if (!profile) return null

  const isOwn = user?.username === profile.username

  async function handleFollow() {
    setFollowLoading(true)
    try {
      if (profile.is_following) {
        await unfollowUser(profile.username)
        setProfile(p => ({ ...p, is_following: false, follower_count: p.follower_count - 1 }))
      } else {
        await followUser(profile.username)
        setProfile(p => ({ ...p, is_following: true, follower_count: p.follower_count + 1 }))
      }
    } catch (err) {
      // ignore
    } finally {
      setFollowLoading(false)
    }
  }
  const bioHtml = profile.bio
    ? DOMPurify.sanitize(marked.parse(profile.bio))
    : null

  return (
    <div style={styles.page}>
      <Header navigate={navigate} user={user} />
      <div className="page-body" style={styles.body}>
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
              {profile.title && (
                <span style={styles.titleBadge}>
                  <span style={styles.titleSep}>✦</span> {profile.title}
                </span>
              )}
              {isOwn && (
                <span style={styles.editLink} onClick={() => navigate('/settings')}>
                  edit profile
                </span>
              )}
              {!isOwn && user && !profile.is_admin && (
                <span
                  style={profile.is_following ? styles.unfollowBtn : styles.followBtn}
                  onClick={followLoading ? undefined : handleFollow}
                >
                  {followLoading ? '...' : profile.is_following ? 'unfollow' : 'follow'}
                </span>
              )}
            </div>
            <div style={styles.followCounts}>
              <span style={styles.muted}><b style={styles.countNum}>{profile.follower_count}</b> followers</span>
              <span style={styles.muted}><b style={styles.countNum}>{profile.following_count}</b> following</span>
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
        <div style={styles.gridSection}>
          {posts.length === 0 ? (
            <p style={styles.muted}>no posts yet.</p>
          ) : (
            <div style={styles.grid}>
              {posts.map(post => (
                <div
                  key={post.id}
                  style={styles.gridItem}
                  onClick={() => navigate(`/post/${post.id}`)}
                >
                  {post.media_type === 'video' ? (
                    <div style={styles.videoThumb}>
                      <span style={styles.playIcon}>▶</span>
                      <span style={styles.gridItemTitle}>{post.title}</span>
                    </div>
                  ) : (
                    <img
                      src={`/uploads/${post.thumbnail_path || post.media_path}`}
                      alt={post.title}
                      style={styles.gridImg}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
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
        <span style={styles.navLink} onClick={() => navigate('/home')}>
          morioh
        </span>
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
  titleBadge: {
    color: 'var(--title, #00e8c8)',
    fontSize: '13px',
  },
  titleSep: {
    color: 'var(--title, #00e8c8)',
  },
  editLink: {
    color: 'var(--accent)',
    cursor: 'pointer',
    fontSize: '13px',
  },
  followBtn: {
    color: 'var(--accent)',
    cursor: 'pointer',
    fontSize: '13px',
    border: '1px solid var(--accent)',
    borderRadius: '3px',
    padding: '2px 10px',
  },
  unfollowBtn: {
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: '13px',
    border: '1px solid var(--border)',
    borderRadius: '3px',
    padding: '2px 10px',
  },
  followCounts: {
    display: 'flex',
    gap: '16px',
  },
  countNum: {
    color: 'var(--text)',
    fontWeight: 'bold',
  },
  muted: {
    color: 'var(--text-muted)',
    fontSize: '13px',
  },
  bio: {
    marginTop: '8px',
    lineHeight: '1.6',
  },
  gridSection: {
    borderTop: '1px solid var(--border)',
    paddingTop: '32px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '4px',
  },
  gridItem: {
    aspectRatio: '1',
    overflow: 'hidden',
    cursor: 'pointer',
    background: 'var(--surface)',
    position: 'relative',
  },
  gridImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  videoThumb: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '8px',
    boxSizing: 'border-box',
  },
  playIcon: {
    color: 'var(--accent)',
    fontSize: '28px',
  },
  gridItemTitle: {
    color: 'var(--text-muted)',
    fontSize: '11px',
    textAlign: 'center',
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
}
