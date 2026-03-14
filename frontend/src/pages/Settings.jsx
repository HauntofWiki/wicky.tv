import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updateProfile, uploadAvatar } from '../api'
import { useAuth } from '../App'

export default function Settings() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '')
      setBio(user.bio || '')
    }
  }, [user])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const updated = await updateProfile(displayName.trim() || null, bio || null)
      setUser((prev) => ({ ...prev, display_name: updated.display_name, bio: updated.bio }))
      setSuccess('Profile saved.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    setSuccess('')
    try {
      const result = await uploadAvatar(file)
      setUser((prev) => ({ ...prev, profile_picture: result.profile_picture }))
      setSuccess('Avatar updated.')
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const bioHtml = bio ? DOMPurify.sanitize(marked.parse(bio)) : null

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <span style={styles.logo} onClick={() => navigate('/home')} role="button">
          wicky.tv
        </span>
        <div style={styles.nav}>
          <span style={styles.navLink} onClick={() => navigate('/home')}>
            morioh
          </span>
          <span style={styles.navLink} onClick={() => navigate(`/@${user?.username}`)}>
            @{user?.username}
          </span>
        </div>
      </div>
      <div style={styles.body}>
        <h1 style={styles.title}>settings</h1>

        <section style={styles.section}>
          <div style={styles.sectionLabel}>avatar</div>
          <div style={styles.avatarRow}>
            {user?.profile_picture ? (
              <img src={user.profile_picture} alt="avatar" style={styles.avatar} />
            ) : (
              <div style={styles.avatarPlaceholder}>
                {(user?.display_name || user?.username || '?')[0].toUpperCase()}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={styles.secondaryBtn}
            >
              {uploading ? 'uploading…' : 'change photo'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
          </div>
        </section>

        <form onSubmit={handleSave} style={styles.form}>
          <section style={styles.section}>
            <label style={styles.sectionLabel}>display name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={user?.username}
              maxLength={100}
            />
          </section>

          <section style={styles.section}>
            <div style={styles.bioLabelRow}>
              <label style={styles.sectionLabel}>bio</label>
              <span
                style={styles.previewToggle}
                onClick={() => setPreview((p) => !p)}
              >
                {preview ? 'edit' : 'preview'}
              </span>
            </div>
            {preview ? (
              <div style={styles.bioPreview}>
                {bioHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: bioHtml }} />
                ) : (
                  <span style={styles.muted}>nothing to preview</span>
                )}
              </div>
            ) : (
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="tell people a bit about yourself (markdown supported)"
                rows={5}
              />
            )}
          </section>

          {error && <p className="error">{error}</p>}
          {success && <p style={styles.successMsg}>{success}</p>}

          <div style={styles.actions}>
            <button type="submit" disabled={saving}>
              {saving ? 'saving…' : 'save changes'}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/@${user?.username}`)}
              style={styles.secondaryBtn}
            >
              view profile
            </button>
          </div>
        </form>
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
    maxWidth: '540px',
    width: '100%',
    margin: '0 auto',
  },
  title: {
    fontSize: '20px',
    marginBottom: '32px',
    color: 'var(--accent)',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '24px',
  },
  sectionLabel: {
    color: 'var(--text-muted)',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  avatarRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  avatar: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid var(--border)',
  },
  avatarPlaceholder: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'var(--surface)',
    border: '2px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    color: 'var(--text-muted)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  bioLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewToggle: {
    color: 'var(--accent)',
    cursor: 'pointer',
    fontSize: '12px',
  },
  bioPreview: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    padding: '10px 12px',
    minHeight: '100px',
    lineHeight: '1.6',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    marginTop: '8px',
  },
  secondaryBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text)',
  },
  successMsg: {
    color: '#4caf50',
    fontSize: '13px',
    marginBottom: '8px',
  },
  muted: {
    color: 'var(--text-muted)',
  },
}
