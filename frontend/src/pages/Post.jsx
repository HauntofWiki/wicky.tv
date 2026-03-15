import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  createComment, deleteComment, deletePost, editComment,
  getPost, listComments,
} from '../api'
import { useAuth } from '../App'

export default function Post() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [comments, setComments] = useState([])
  const [replyBody, setReplyBody] = useState('')
  const [replyFile, setReplyFile] = useState(null)
  const [quotedId, setQuotedId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [replyError, setReplyError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editBody, setEditBody] = useState('')
  const replyRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    getPost(id)
      .then(setPost)
      .catch(() => setError('Post not found'))
    listComments(id)
      .then(setComments)
      .catch(() => {})
  }, [id])

  async function handleDelete() {
    try {
      await deletePost(id)
      navigate(`/@${post.user.username}`)
    } catch (err) {
      setError(err.message)
    }
  }

  function quoteComment(comment) {
    setQuotedId(comment.id)
    replyRef.current?.focus()
  }

  async function handleSubmitReply(e) {
    e.preventDefault()
    if (!replyBody.trim() && !replyFile) return
    setSubmitting(true)
    setReplyError('')
    try {
      const c = await createComment(id, {
        body: replyBody.trim() || undefined,
        quotedCommentId: quotedId,
        file: replyFile,
      })
      setComments((prev) => [...prev, c])
      setReplyBody('')
      setReplyFile(null)
      setQuotedId(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      setReplyError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteComment(commentId) {
    try {
      await deleteComment(commentId)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleEditComment(e) {
    e.preventDefault()
    if (!editBody.trim()) return
    try {
      const updated = await editComment(editingId, editBody.trim())
      setComments((prev) => prev.map((c) => c.id === updated.id ? updated : c))
      setEditingId(null)
      setEditBody('')
    } catch (err) {
      setError(err.message)
    }
  }

  if (error) return (
    <div style={styles.page}>
      <Header navigate={navigate} user={user} />
      <div style={styles.body}><p style={styles.muted}>{error}</p></div>
    </div>
  )

  if (!post) return null

  const isOwn = user?.username === post.user.username
  const descHtml = post.description
    ? DOMPurify.sanitize(marked.parse(post.description))
    : null
  const hasMusic = post.music_song || post.music_artist || post.music_album

  const commentById = Object.fromEntries(comments.map((c) => [c.id, c]))

  return (
    <div style={styles.page}>
      <Header navigate={navigate} user={user} />
      <div style={styles.body}>

        {/* Media */}
        <div style={styles.mediaWrap}>
          {post.media_type === 'video' ? (
            <video src={`/uploads/${post.media_path}`} controls style={styles.media} />
          ) : (
            <img src={`/uploads/${post.media_path}`} alt={post.title} style={styles.media} />
          )}
        </div>

        {/* Title + meta */}
        <div style={styles.meta}>
          <div style={styles.titleRow}>
            <h1 style={styles.title}>{post.title}</h1>
            {isOwn && (
              <div style={styles.actions}>
                <span style={styles.actionLink} onClick={() => navigate(`/post/${id}/edit`)}>edit</span>
                {confirmDelete ? (
                  <>
                    <span style={styles.actionDanger} onClick={handleDelete}>confirm delete</span>
                    <span style={styles.actionLink} onClick={() => setConfirmDelete(false)}>cancel</span>
                  </>
                ) : (
                  <span style={styles.actionDanger} onClick={() => setConfirmDelete(true)}>delete</span>
                )}
              </div>
            )}
          </div>

          <div style={styles.byline}>
            <span
              style={styles.username}
              onClick={() => navigate(`/@${post.user.username}`)}
            >
              @{post.user.username}
            </span>
            <span style={styles.muted}>
              {new Date(post.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              {post.is_edited && ' · edited'}
            </span>
          </div>

          {post.tags && (
            <div style={styles.tags}>
              {post.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                <span key={tag} style={styles.tag}>{tag}</span>
              ))}
            </div>
          )}

          {hasMusic && (
            <div style={styles.music}>
              <span style={styles.musicIcon}>♪</span>
              <span>
                {[post.music_song, post.music_artist, post.music_album].filter(Boolean).join(' — ')}
              </span>
            </div>
          )}

          {descHtml && (
            <div
              style={styles.description}
              dangerouslySetInnerHTML={{ __html: descHtml }}
            />
          )}
        </div>

        {/* Comment thread */}
        <div style={styles.thread}>
          <div style={styles.threadDivider} />

          {comments.map((c) => {
            const isOwnComment = user?.username === c.user.username
            const bodyHtml = c.body
              ? DOMPurify.sanitize(marked.parse(c.body))
              : null
            const quoted = c.quoted_comment_id ? commentById[c.quoted_comment_id] : null

            return (
              <div key={c.id} style={styles.comment}>
                {/* Quoted preview */}
                {quoted && (
                  <div style={styles.quotedBlock}>
                    <span style={styles.quotedAuthor}>@{quoted.user.username}</span>
                    {quoted.body && (
                      <span style={styles.quotedBody}>
                        {quoted.body.length > 120 ? quoted.body.slice(0, 120) + '…' : quoted.body}
                      </span>
                    )}
                    {quoted.media_path && !quoted.body && (
                      <span style={styles.muted}>[media]</span>
                    )}
                  </div>
                )}

                {/* Comment media */}
                {c.media_path && (
                  <div style={styles.commentMediaWrap}>
                    {c.media_type === 'video' ? (
                      <video src={`/uploads/${c.media_path}`} controls style={styles.commentMedia} />
                    ) : (
                      <img src={`/uploads/${c.media_path}`} alt="" style={styles.commentMedia} />
                    )}
                  </div>
                )}

                {/* Comment body */}
                {editingId === c.id ? (
                  <form onSubmit={handleEditComment} style={styles.editForm}>
                    <textarea
                      style={styles.textarea}
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={3}
                      autoFocus
                    />
                    <div style={styles.editActions}>
                      <button type="submit" style={styles.btn}>save</button>
                      <span style={styles.actionLink} onClick={() => { setEditingId(null); setEditBody('') }}>cancel</span>
                    </div>
                  </form>
                ) : bodyHtml ? (
                  <div
                    style={styles.commentBody}
                    dangerouslySetInnerHTML={{ __html: bodyHtml }}
                  />
                ) : null}

                {/* Comment meta */}
                <div style={styles.commentMeta}>
                  <span
                    style={styles.commentAuthor}
                    onClick={() => navigate(`/@${c.user.username}`)}
                  >
                    @{c.user.username}
                  </span>
                  <span style={styles.muted}>
                    {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {c.is_edited && ' · edited'}
                  </span>
                  {user && (
                    <span style={styles.actionLink} onClick={() => quoteComment(c)}>quote</span>
                  )}
                  {isOwnComment && editingId !== c.id && (
                    <span style={styles.actionLink} onClick={() => { setEditingId(c.id); setEditBody(c.body || '') }}>edit</span>
                  )}
                  {(isOwnComment || user?.is_admin) && (
                    <span style={styles.actionDanger} onClick={() => handleDeleteComment(c.id)}>delete</span>
                  )}
                </div>
              </div>
            )
          })}

          {/* Reply box */}
          {user ? (
            <form onSubmit={handleSubmitReply} style={styles.replyForm}>
              {quotedId && commentById[quotedId] && (
                <div style={styles.quotedBlock}>
                  <span style={styles.quotedAuthor}>quoting @{commentById[quotedId].user.username}</span>
                  {commentById[quotedId].body && (
                    <span style={styles.quotedBody}>
                      {commentById[quotedId].body.length > 120
                        ? commentById[quotedId].body.slice(0, 120) + '…'
                        : commentById[quotedId].body}
                    </span>
                  )}
                  <span style={styles.actionLink} onClick={() => setQuotedId(null)}>✕</span>
                </div>
              )}
              <textarea
                ref={replyRef}
                style={styles.textarea}
                placeholder="add a comment…"
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                rows={3}
              />
              <div style={styles.replyActions}>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,video/mp4,video/quicktime"
                  style={styles.fileInput}
                  onChange={(e) => setReplyFile(e.target.files[0] || null)}
                />
                {replyError && <span style={styles.errorText}>{replyError}</span>}
                <button
                  type="submit"
                  style={styles.btn}
                  disabled={submitting || (!replyBody.trim() && !replyFile)}
                >
                  {submitting ? 'posting…' : 'post'}
                </button>
              </div>
            </form>
          ) : (
            <p style={styles.muted}>
              <span style={styles.actionLink} onClick={() => navigate('/login')}>log in</span>
              {' '}to comment
            </p>
          )}
        </div>

      </div>
    </div>
  )
}

function Header({ navigate, user }) {
  return (
    <div style={styles.header}>
      <span style={styles.logo} onClick={() => navigate('/home')}>wicky.tv</span>
      <div style={styles.nav}>
        <span style={styles.navLink} onClick={() => navigate('/home')}>home</span>
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
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 24px', borderBottom: '1px solid var(--border)',
  },
  logo: { color: 'var(--accent)', fontSize: '18px', cursor: 'pointer' },
  nav: { display: 'flex', gap: '20px' },
  navLink: { color: 'var(--text-muted)', cursor: 'pointer' },
  body: {
    maxWidth: '800px', width: '100%', margin: '0 auto',
    padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: '24px',
  },
  mediaWrap: {
    background: 'var(--surface)', borderRadius: '4px', overflow: 'hidden',
    display: 'flex', justifyContent: 'center',
  },
  media: { width: '100%', maxHeight: '600px', objectFit: 'contain', display: 'block' },
  meta: { display: 'flex', flexDirection: 'column', gap: '10px' },
  titleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' },
  title: { fontSize: '22px', fontWeight: 'bold', margin: 0 },
  actions: { display: 'flex', gap: '14px', flexShrink: 0, paddingTop: '4px' },
  actionLink: { color: 'var(--accent)', cursor: 'pointer', fontSize: '13px' },
  actionDanger: { color: 'var(--error)', cursor: 'pointer', fontSize: '13px' },
  byline: { display: 'flex', gap: '12px', alignItems: 'center' },
  username: { color: 'var(--accent)', cursor: 'pointer', fontSize: '14px' },
  muted: { color: 'var(--text-muted)', fontSize: '13px' },
  tags: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  tag: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: '3px', padding: '2px 8px', fontSize: '12px', color: 'var(--text-muted)',
  },
  music: {
    display: 'flex', gap: '8px', alignItems: 'center',
    color: 'var(--text-muted)', fontSize: '13px',
    borderLeft: '2px solid var(--accent)', paddingLeft: '10px',
  },
  musicIcon: { color: 'var(--accent)' },
  description: { lineHeight: '1.7', marginTop: '4px' },

  // Thread
  thread: { display: 'flex', flexDirection: 'column', gap: '20px' },
  threadDivider: { borderTop: '1px solid var(--border)' },
  comment: {
    display: 'flex', flexDirection: 'column', gap: '8px',
    paddingBottom: '20px', borderBottom: '1px solid var(--border)',
  },
  commentMeta: { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' },
  commentAuthor: { color: 'var(--accent)', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' },
  commentBody: { lineHeight: '1.6', fontSize: '14px' },
  commentMediaWrap: { borderRadius: '4px', overflow: 'hidden', maxWidth: '500px' },
  commentMedia: { width: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block' },
  quotedBlock: {
    background: 'var(--surface)', borderLeft: '3px solid var(--border)',
    padding: '8px 12px', borderRadius: '3px', fontSize: '13px',
    display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'baseline',
  },
  quotedAuthor: { color: 'var(--accent)', fontWeight: 'bold', flexShrink: 0 },
  quotedBody: { color: 'var(--text-muted)', fontStyle: 'italic' },

  // Reply form
  replyForm: { display: 'flex', flexDirection: 'column', gap: '8px' },
  textarea: {
    width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: '4px', color: 'inherit', fontFamily: 'inherit', fontSize: '14px',
    padding: '10px 12px', resize: 'vertical', boxSizing: 'border-box',
  },
  replyActions: { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' },
  fileInput: { fontSize: '13px', color: 'var(--text-muted)' },
  btn: {
    background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '4px',
    padding: '6px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold',
  },
  errorText: { color: 'var(--error)', fontSize: '13px' },
  editForm: { display: 'flex', flexDirection: 'column', gap: '8px' },
  editActions: { display: 'flex', gap: '12px', alignItems: 'center' },
}
