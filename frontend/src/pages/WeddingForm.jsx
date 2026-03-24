import { useState } from 'react'
import { submitWeddingMessage } from '../api'

export default function WeddingForm() {
  const [message, setMessage] = useState('')
  const [fromName, setFromName] = useState('')
  const [toName, setToName] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  function handleFile(e) {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    if (f.type.startsWith('image/')) {
      setPreview({ type: 'image', url: URL.createObjectURL(f) })
    } else if (f.type.startsWith('video/')) {
      setPreview({ type: 'video', url: URL.createObjectURL(f) })
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('message', message.trim())
      fd.append('from_name', fromName.trim())
      if (toName.trim()) fd.append('to_name', toName.trim())
      if (file) fd.append('file', file)
      await submitWeddingMessage(fd)
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.hearts}>♥</div>
          <h2 style={styles.successTitle}>Message sent!</h2>
          <p style={styles.successSub}>Thank you — it'll show up on the screen shortly.</p>
          <button style={styles.btn} onClick={() => { setSubmitted(false); setMessage(''); setFromName(''); setToName(''); setFile(null); setPreview(null) }}>
            Send another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.hearts}>♥</div>
        <h1 style={styles.title}>Jacky & Richard</h1>
        <p style={styles.sub}>Leave them a message — it'll appear on the big screen!</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Your message *</label>
          <textarea
            style={styles.textarea}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Write something wonderful..."
            rows={4}
            required
            maxLength={500}
          />
          <div style={styles.charCount}>{message.length}/500</div>

          <label style={styles.label}>From *</label>
          <input
            style={styles.input}
            value={fromName}
            onChange={e => setFromName(e.target.value)}
            placeholder="Your name"
            required
            maxLength={100}
          />

          <label style={styles.label}>To <span style={styles.optional}>(optional)</span></label>
          <input
            style={styles.input}
            value={toName}
            onChange={e => setToName(e.target.value)}
            placeholder="e.g. The happy couple, Jacky, Richard..."
            maxLength={100}
          />

          <label style={styles.label}>Photo or video <span style={styles.optional}>(optional)</span></label>
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleFile}
            style={styles.fileInput}
          />

          {preview && (
            <div style={styles.previewWrap}>
              {preview.type === 'image'
                ? <img src={preview.url} style={styles.previewImg} alt="preview" />
                : <video src={preview.url} style={styles.previewImg} muted playsInline />
              }
              <button type="button" style={styles.removeFile} onClick={() => { setFile(null); setPreview(null) }}>
                Remove
              </button>
            </div>
          )}

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? 'Sending...' : 'Send message ♥'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a0a0a 0%, #2d1515 50%, #1a0a0a 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: 'Georgia, serif',
  },
  card: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,200,150,0.2)',
    borderRadius: '16px',
    padding: '40px 32px',
    maxWidth: '480px',
    width: '100%',
    color: '#f5e6d0',
  },
  hearts: {
    textAlign: 'center',
    fontSize: '32px',
    marginBottom: '8px',
    color: '#e8956d',
  },
  title: {
    textAlign: 'center',
    fontSize: '28px',
    fontWeight: 'normal',
    margin: '0 0 8px',
    color: '#f5e6d0',
  },
  sub: {
    textAlign: 'center',
    fontSize: '14px',
    color: '#c4a882',
    margin: '0 0 28px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '13px',
    color: '#c4a882',
    marginTop: '8px',
  },
  optional: {
    opacity: 0.6,
    fontStyle: 'italic',
  },
  input: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,200,150,0.25)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#f5e6d0',
    fontSize: '16px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  textarea: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,200,150,0.25)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#f5e6d0',
    fontSize: '16px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    resize: 'vertical',
    fontFamily: 'Georgia, serif',
  },
  charCount: {
    textAlign: 'right',
    fontSize: '11px',
    color: '#8a6a4a',
    marginTop: '2px',
  },
  fileInput: {
    color: '#c4a882',
    fontSize: '14px',
  },
  previewWrap: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginTop: '4px',
  },
  previewImg: {
    maxWidth: '120px',
    maxHeight: '90px',
    borderRadius: '6px',
    objectFit: 'cover',
  },
  removeFile: {
    background: 'none',
    border: 'none',
    color: '#c4a882',
    cursor: 'pointer',
    fontSize: '12px',
    textDecoration: 'underline',
    padding: '0',
  },
  error: {
    color: '#e87070',
    fontSize: '13px',
    margin: '4px 0',
  },
  btn: {
    marginTop: '16px',
    background: '#c8703a',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    color: '#fff',
    fontSize: '16px',
    cursor: 'pointer',
    fontFamily: 'Georgia, serif',
    letterSpacing: '0.5px',
  },
  successTitle: {
    textAlign: 'center',
    fontSize: '26px',
    fontWeight: 'normal',
    color: '#f5e6d0',
    margin: '0 0 8px',
  },
  successSub: {
    textAlign: 'center',
    color: '#c4a882',
    margin: '0 0 24px',
  },
}
