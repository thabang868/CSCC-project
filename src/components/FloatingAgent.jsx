import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bot } from 'lucide-react'

const STORAGE_KEY = 'dm_agent_pos'
const SIZE = 60         // button diameter (px)
const EDGE = 16         // min distance from any viewport edge
const LABEL_OFFSET = 28 // height reserved above the button for the label

function loadPos() {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (v && typeof v.x === 'number' && typeof v.y === 'number') return v
  } catch {}
  return null
}

const clamp = (p) => ({
  x: Math.min(Math.max(p.x, EDGE), window.innerWidth  - SIZE - EDGE),
  y: Math.min(Math.max(p.y, EDGE + LABEL_OFFSET), window.innerHeight - SIZE - EDGE),
})

export default function FloatingAgent() {
  const nav = useNavigate()
  const loc = useLocation()
  const [pos, setPos] = useState(loadPos)
  const [dragging, setDragging] = useState(false)
  const drag = useRef({ startX: 0, startY: 0, origX: 0, origY: 0, moved: false })

  // Hide on the chatbot page itself, and on any non-app route.
  const hidden = loc.pathname.startsWith('/app/chatbot') || !loc.pathname.startsWith('/app')

  // First-mount default position: bottom-right.
  useEffect(() => {
    if (pos === null) {
      setPos(clamp({
        x: window.innerWidth  - SIZE - EDGE,
        y: window.innerHeight - SIZE - EDGE,
      }))
    }
  }, [pos])

  // Re-clamp when the window resizes (so the button never slips off-screen).
  useEffect(() => {
    const onResize = () => setPos((p) => (p ? clamp(p) : p))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Persist position so it stays put across navigation/refresh.
  useEffect(() => {
    if (pos) localStorage.setItem(STORAGE_KEY, JSON.stringify(pos))
  }, [pos])

  // Global pointer handlers while dragging.
  useEffect(() => {
    if (!dragging) return
    const onMove = (e) => {
      const dx = e.clientX - drag.current.startX
      const dy = e.clientY - drag.current.startY
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.current.moved = true
      setPos(clamp({ x: drag.current.origX + dx, y: drag.current.origY + dy }))
    }
    const onUp = () => {
      const wasDrag = drag.current.moved
      setDragging(false)
      // Treat as click if the pointer barely moved.
      if (!wasDrag) nav('/app/chatbot')
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup',   onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup',   onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [dragging, nav])

  if (hidden || !pos) return null

  const onPointerDown = (e) => {
    e.preventDefault()
    drag.current = {
      startX: e.clientX, startY: e.clientY,
      origX: pos.x,      origY: pos.y,
      moved: false,
    }
    setDragging(true)
  }

  return (
    <div
      role="button"
      aria-label="Open AI assistant"
      onPointerDown={onPointerDown}
      className="fixed z-[55] select-none flex flex-col items-center"
      style={{
        left: pos.x,
        top:  pos.y - LABEL_OFFSET,
        width: SIZE,
        cursor: dragging ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
    >
      {/* Label - moves with the button */}
      <div className="mb-1.5 pointer-events-none">
        <span className="inline-block text-[10px] uppercase tracking-[0.18em] font-extrabold bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-2 py-0.5 rounded-full shadow-lift whitespace-nowrap">
          Ask&nbsp;Me
        </span>
      </div>

      {/* Round agent button */}
      <div
        className={`relative grid place-items-center rounded-full text-white shadow-glow ring-4 ring-white/40 dark:ring-white/10 transition-transform ${
          dragging ? 'scale-105' : 'animate-float hover:scale-105'
        }`}
        style={{
          width: SIZE, height: SIZE,
          backgroundImage: 'linear-gradient(135deg, #3a64f5 0%, #7c3aed 100%)',
        }}
      >
        {/* Pulsing halo */}
        <span className="absolute inset-0 rounded-full ring-2 ring-brand-400/70 animate-ping pointer-events-none" />
        <Bot size={26} />
      </div>
    </div>
  )
}
