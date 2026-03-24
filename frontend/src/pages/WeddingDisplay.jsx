import { useEffect, useRef, useState } from 'react'
import { getWeddingMessages } from '../api'

const DISPLAY_URL = 'toast.wicky.tv'
const POLL_INTERVAL = 5000
const SLIDE_DURATION = 9000  // ms per message
const FADE_DURATION = 800     // ms for fade transition

const HIGHLIGHT_WORDS = [
  'Jacky', 'Richard', 'Dobie', 'married', 'wedding',
  'love', 'forever', 'congratulations', 'congrats', 'bride', 'groom',
]

function highlightText(text) {
  const pattern = new RegExp(`(${HIGHLIGHT_WORDS.join('|')})`, 'gi')
  const parts = text.split(pattern)
  return parts.map((part, i) => {
    const isHighlight = HIGHLIGHT_WORDS.some(w => w.toLowerCase() === part.toLowerCase())
    return isHighlight
      ? <span key={i} style={styles.highlight}>{part}</span>
      : part
  })
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function WeddingDisplay() {
  const [allMessages, setAllMessages] = useState([])
  const [queue, setQueue] = useState([])           // unseen IDs, newest-first
  const [seenIds, setSeenIds] = useState(new Set())
  const [current, setCurrent] = useState(null)
  const [visible, setVisible] = useState(true)
  const randomPoolRef = useRef([])                  // shuffled pool for when queue is empty
  const timerRef = useRef(null)
  const messagesMapRef = useRef({})

  // Poll for new messages
  useEffect(() => {
    function poll() {
      getWeddingMessages().then(msgs => {
        // Keep a live map of id -> message
        const map = {}
        msgs.forEach(m => { map[m.id] = m })
        messagesMapRef.current = map
        setAllMessages(msgs)

        // Find unseen ids (newest-first order, API already returns desc)
        setSeenIds(prev => {
          const newIds = msgs.filter(m => !prev.has(m.id)).map(m => m.id)
          if (newIds.length > 0) {
            setQueue(q => [...newIds, ...q])
          }
          const updated = new Set(prev)
          newIds.forEach(id => updated.add(id))
          return updated
        })
      }).catch(() => {})
    }

    poll()
    const interval = setInterval(poll, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  // Advance to next message
  function advance() {
    setVisible(false)
    setTimeout(() => {
      setQueue(q => {
        let nextId = null
        let remaining = q

        if (q.length > 0) {
          nextId = q[0]
          remaining = q.slice(1)
        } else {
          // Pull from random pool
          if (randomPoolRef.current.length === 0) {
            const ids = Object.keys(messagesMapRef.current).map(Number)
            if (ids.length === 0) return q
            randomPoolRef.current = shuffle(ids)
          }
          nextId = randomPoolRef.current.shift()
        }

        const msg = messagesMapRef.current[nextId]
        if (msg) {
          setCurrent(msg)
          setVisible(true)
        }
        return remaining
      })
    }, FADE_DURATION)
  }

  // Start cycling once we have messages
  useEffect(() => {
    if (allMessages.length > 0 && !current) {
      advance()
    }
  }, [allMessages.length])

  // Auto-advance timer
  useEffect(() => {
    if (!current) return
    clearTimeout(timerRef.current)
    const duration = current.media_type ? SLIDE_DURATION + 3000 : SLIDE_DURATION
    timerRef.current = setTimeout(advance, duration)
    return () => clearTimeout(timerRef.current)
  }, [current])

  return (
    <div style={styles.page}>
      {/* Main content */}
      <div style={{ ...styles.slide, opacity: visible ? 1 : 0 }}>
        {current ? (
          <>
            {current.media_type === 'image' && current.media_url && (
              <img src={current.media_url} style={styles.media} alt="" />
            )}
            {current.media_type === 'video' && current.media_url && (
              <video src={current.media_url} style={styles.media} muted playsInline poster="" />
            )}

            {current.to_name && (
              <p style={styles.toLine}>To {highlightText(current.to_name)}</p>
            )}

            <blockquote style={styles.messageText}>
              {highlightText(current.message)}
            </blockquote>

            <p style={styles.fromLine}>— {highlightText(current.from_name)}</p>
          </>
        ) : (
          <div style={styles.waiting}>
            <p style={styles.waitingText}>Be the first to send a message!</p>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div style={styles.bottomBar}>
        <div style={styles.bottomLeft}>
          <span style={styles.bottomHeart}>♥</span>
          <span style={styles.bottomNames}>Jacky & Richard</span>
        </div>
        <div style={styles.bottomRight}>
          <span style={styles.sendPrompt}>Send a message →</span>
          <span style={styles.urlText}>{DISPLAY_URL}</span>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=64x64&color=f5e6d0&bgcolor=00000000&data=https://${DISPLAY_URL}`}
            style={styles.qr}
            alt="QR"
          />
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    width: '100vw',
    height: '100vh',
    background: 'linear-gradient(160deg, #0e0505 0%, #1e0d0d 50%, #0e0505 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Georgia, serif',
    color: '#f5e6d0',
    overflow: 'hidden',
    position: 'relative',
  },
  slide: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 80px',
    maxWidth: '900px',
    width: '100%',
    transition: `opacity ${FADE_DURATION}ms ease`,
    textAlign: 'center',
  },
  media: {
    maxHeight: '280px',
    maxWidth: '500px',
    borderRadius: '12px',
    marginBottom: '28px',
    objectFit: 'contain',
  },
  toLine: {
    fontSize: '22px',
    color: '#c4a882',
    margin: '0 0 12px',
    fontStyle: 'italic',
  },
  messageText: {
    fontSize: '36px',
    lineHeight: '1.5',
    margin: '0 0 24px',
    fontWeight: 'normal',
    color: '#f5e6d0',
    maxWidth: '800px',
  },
  fromLine: {
    fontSize: '24px',
    color: '#c4a882',
    margin: '0',
  },
  highlight: {
    color: '#e8956d',
    fontStyle: 'italic',
  },
  waiting: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingText: {
    fontSize: '28px',
    color: '#6a4a3a',
    fontStyle: 'italic',
  },
  bottomBar: {
    width: '100%',
    padding: '12px 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTop: '1px solid rgba(255,200,150,0.1)',
    background: 'rgba(0,0,0,0.3)',
    boxSizing: 'border-box',
  },
  bottomLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  bottomHeart: {
    color: '#e8956d',
    fontSize: '20px',
  },
  bottomNames: {
    fontSize: '18px',
    color: '#c4a882',
  },
  bottomRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  sendPrompt: {
    fontSize: '14px',
    color: '#8a6a4a',
  },
  urlText: {
    fontSize: '16px',
    color: '#f5e6d0',
    fontFamily: 'monospace',
    letterSpacing: '0.5px',
  },
  qr: {
    width: '48px',
    height: '48px',
    opacity: 0.7,
    borderRadius: '4px',
  },
}
