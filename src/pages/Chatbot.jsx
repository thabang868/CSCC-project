import { useEffect, useRef, useState } from 'react'
import { Send, Bot, User as UserIcon, Sparkles, RotateCcw, Mic, Square, Volume2 } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import { chatApi } from '../services/api.js'

// Platform-knowledge starters that match the agents' QA knowledge base.
const FAQS = [
  'What can you help me with?',
  'How do I raise a support ticket?',
  'How does the ticket approval process work?',
  'Which dashboards can I access?',
  'How do I start a live support call?',
  'How is my data kept secure?',
]

export default function Chatbot() {
  const [messages, setMessages] = useState([])   // always starts empty — clean on open
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [showFaq, setShowFaq] = useState(true)
  const [faqIdx, setFaqIdx] = useState(0)
  const [agentInfo, setAgentInfo] = useState(null)
  const [recording, setRecording] = useState(false)
  const [speakOn, setSpeakOn] = useState(true)    // read voice answers aloud
  const [speakingId, setSpeakingId] = useState(null)  // id of the message being spoken
  const audioRef = useRef(null)                   // current TTS <audio>
  const idRef = useRef(0)                          // message id counter
  const endRef = useRef(null)
  const recRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const recognitionRef = useRef(null)   // browser SpeechRecognition (live STT)
  const silenceRef = useRef(null)       // 5s-silence auto-submit timer
  const finalRef = useRef('')           // accumulated final transcript
  const speechSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  // On open: only fetch the role-aware agent label for the header. The chat
  // itself stays empty (no restored history, no welcome bubble).
  useEffect(() => {
    let cancelled = false
    chatApi.welcome()
      .then((w) => { if (!cancelled && w) setAgentInfo({ label: w.label, welcome: w.welcome }) })
      .catch(() => {})
    return () => {
      cancelled = true
      stopStream()
      if (silenceRef.current) clearTimeout(silenceRef.current)
      try { recognitionRef.current?.stop() } catch { /* ignore */ }
      try { audioRef.current?.pause() } catch { /* ignore */ }
      try { window.speechSynthesis?.cancel() } catch { /* ignore */ }
    }
  }, [])

  useEffect(() => {
    if (!showFaq) return
    const t = setInterval(() => setFaqIdx((i) => (i + 1) % FAQS.length), 5000)
    return () => clearInterval(t)
  }, [showFaq])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, busy])

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }

  const uid = () => { idRef.current += 1; return idRef.current }

  // Stop any answer that is currently being read aloud.
  const stopSpeaking = () => {
    try { audioRef.current?.pause() } catch { /* ignore */ }
    audioRef.current = null
    try { window.speechSynthesis?.cancel() } catch { /* ignore */ }
    setSpeakingId(null)
  }

  const browserSpeak = (text, id) => {
    try {
      const synth = window.speechSynthesis
      if (!synth) return
      synth.cancel()
      const u = new SpeechSynthesisUtterance(String(text || '').slice(0, 700))
      u.rate = 1.03
      u.onend = () => setSpeakingId((cur) => (cur === id ? null : cur))
      setSpeakingId(id)
      synth.speak(u)
    } catch { /* best-effort */ }
  }

  // Strip markdown so the voice never reads "star star" etc. — the on-screen
  // text keeps its bold formatting; only the spoken version is cleaned.
  const speechText = (t) => String(t || '')
    .replace(/\*\*(.*?)\*\*/g, '$1')          // **bold**
    .replace(/\*(.*?)\*/g, '$1')              // *italic*
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')    // `code`
    .replace(/^#{1,6}\s*/gm, '')              // # headings
    .replace(/^\s*[-•]\s+/gm, '')             // bullet markers
    .replace(/[*_#`>]/g, '')                  // any stray markdown chars
    .replace(/[ \t]{2,}/g, ' ')
    .trim()

  // Prefer Deepgram Aura TTS; fall back to the browser voice. Tracks which
  // message is playing so the answer can show a Stop-voice button.
  const speak = async (text, id) => {
    if (!speakOn || !text) return
    const clean = speechText(text)
    if (!clean) return
    stopSpeaking()
    try {
      const blob = await chatApi.speak(clean)
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      setSpeakingId(id)
      const clear = () => {
        URL.revokeObjectURL(url)
        if (audioRef.current === audio) audioRef.current = null
        setSpeakingId((cur) => (cur === id ? null : cur))
      }
      audio.onended = clear
      audio.onerror = clear
      await audio.play()
    } catch {
      browserSpeak(clean, id)
    }
  }

  const send = async (textArg, viaVoice = false) => {
    const q = (textArg ?? input).trim()
    if (!q || busy) return
    setInput(''); setShowFaq(false)
    // Send the recent turns so the agent can handle follow-ups in context.
    const history = messages.slice(-8).map((m) => ({ role: m.role, text: m.text }))
    setMessages((m) => [...m, { id: uid(), role: 'user', text: q }])
    setBusy(true)
    try {
      const r = await chatApi.ask(q, history)
      const botId = uid()
      setMessages((m) => [...m, { id: botId, role: 'bot', text: r.answer, intent: r.intent, data: r.data }])
      if (viaVoice) speak(r.answer, botId)
    } catch (e) {
      setMessages((m) => [...m, { id: uid(), role: 'bot', text: errorToText(e) }])
    } finally {
      setBusy(false)
    }
  }

  // ---- Voice ----
  const clearSilence = () => {
    if (silenceRef.current) { clearTimeout(silenceRef.current); silenceRef.current = null }
  }
  const armSilence = () => {
    clearSilence()
    // Auto-submit ~5s after the user stops talking.
    silenceRef.current = setTimeout(() => finishAndSend(), 5000)
  }

  // Web Speech path: stop listening and send the transcript.
  const finishAndSend = () => {
    clearSilence()
    const q = (finalRef.current || input || '').trim()
    try { recognitionRef.current?.stop() } catch { /* ignore */ }
    recognitionRef.current = null
    setRecording(false)
    if (q) { setInput(''); send(q, true) }
  }

  const stopListening = () => {
    clearSilence()
    try { recognitionRef.current?.stop() } catch { /* ignore */ }
    recognitionRef.current = null
    if (recRef.current && recRef.current.state !== 'inactive') { try { recRef.current.stop() } catch { /* ignore */ } }
    stopStream()
    setRecording(false)
  }

  // Primary: browser live speech-to-text. Interim words appear in the field
  // in real time; ~5s of silence auto-submits.
  const startVoiceLive = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'
    finalRef.current = ''
    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalRef.current = `${finalRef.current} ${t}`.trim()
        else interim += t
      }
      setInput(`${finalRef.current} ${interim}`.trim())   // live in the input
      armSilence()
    }
    rec.onerror = (e) => {
      stopListening()
      if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') {
        setMessages((m) => [...m, { role: 'bot', text: 'I need microphone access for voice. Please allow it in your browser, or type your question.' }])
      }
    }
    recognitionRef.current = rec
    try { rec.start(); setRecording(true); armSilence() }
    catch { stopListening() }
  }

  // Fallback (no Web Speech, e.g. some Firefox): record then Deepgram STT.
  const startVoiceRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []
      rec.ondataavailable = (ev) => { if (ev.data.size) chunksRef.current.push(ev.data) }
      rec.onstop = async () => {
        stopStream()
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        if (!blob.size) { setRecording(false); return }
        setBusy(true)
        try {
          const r = await chatApi.transcribe(blob)
          const q = (r.transcript || '').trim()
          setBusy(false); setRecording(false)
          if (q) send(q, true)
        } catch {
          setBusy(false); setRecording(false)
          setMessages((m) => [...m, { role: 'bot', text: 'Voice is unavailable in this browser. Please type your question.' }])
        }
      }
      recRef.current = rec; rec.start(); setRecording(true)
    } catch {
      setMessages((m) => [...m, { role: 'bot', text: 'I need microphone access for voice. Please allow it, or type your question.' }])
    }
  }

  const startVoice = () => (speechSupported ? startVoiceLive() : startVoiceRecord())

  const stopVoice = () => {
    if (recognitionRef.current) return finishAndSend()
    if (recRef.current && recRef.current.state !== 'inactive') { try { recRef.current.stop() } catch { /* ignore */ } }
    else setRecording(false)
  }

  const toggleVoice = () => (recording ? stopVoice() : startVoice())

  const onNewChat = () => {
    stopSpeaking()
    setMessages([]); setShowFaq(true); setFaqIdx(0); setInput('')
  }

  const onKeyDown = (e) => {
    if (recording) { if (e.key === 'Enter') e.preventDefault(); return }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const hasText = input.trim().length > 0

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={agentInfo?.label ? `AI Assistant · ${agentInfo.label}` : 'AI Assistant'}
        title="Ask anything"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => { stopSpeaking(); setSpeakOn((v) => !v) }}
              className={`btn-ghost text-xs ${speakOn ? '' : 'opacity-60'}`}
              title={speakOn ? 'Voice replies on' : 'Voice replies off'}
            >
              <Volume2 size={14} /> {speakOn ? 'Voice on' : 'Voice off'}
            </button>
            <button onClick={onNewChat} className="btn-ghost text-xs" title="Clear conversation">
              <RotateCcw size={14} /> New chat
            </button>
          </div>
        }
      />

      {/* One frequently-asked suggestion at a time — rotates every 5s.
          Compact single line so it never crowds the screen. */}
      {showFaq && messages.length === 0 && (
        <button
          type="button"
          onClick={() => send(FAQS[faqIdx])}
          className="w-full text-left rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3.5 py-2.5 flex items-center gap-3 hover:border-brand-400 hover:bg-brand-50/50 transition"
        >
          <span className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 text-white grid place-items-center shadow-glow">
            <Sparkles size={15} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400">Try asking</span>
            <span key={faqIdx} className="block text-sm font-semibold text-slate-800 dark:text-slate-100 truncate animate-pop-in">
              {FAQS[faqIdx]}
            </span>
          </span>
          <span className="hidden sm:flex items-center gap-1 shrink-0">
            {FAQS.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === faqIdx ? 'w-5 bg-brand-600' : 'w-1.5 bg-slate-300 dark:bg-white/20'}`} />
            ))}
          </span>
        </button>
      )}

      {/* Chat surface */}
      <div className="card flex flex-col h-[68vh] overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.length === 0 && !busy && (
            <div className="h-full grid place-items-center text-center px-6">
              <div className="max-w-sm">
                <Avatar size="lg" />
                <div className="mt-4 font-display text-lg font-extrabold text-slate-900 dark:text-white">
                  {agentInfo?.label || 'AI Assistant'}
                </div>
                <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {agentInfo?.welcome || 'Ask a question below, or tap the microphone to talk. I can answer from the platform knowledge base and your data.'}
                </p>
              </div>
            </div>
          )}
          {messages.map((m) => (
            <Message
              key={m.id}
              {...m}
              speaking={m.role === 'bot' && m.id === speakingId}
              onStopSpeak={stopSpeaking}
            />
          ))}
          {busy && (
            <div className="flex items-center gap-3 text-slate-500">
              <Avatar />
              <div className="rounded-2xl rounded-tl-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 px-4 py-2.5 shadow-soft inline-flex gap-1">
                <Dot /><Dot d=".15s" /><Dot d=".30s" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Composer — Send button lives inside the field, right-aligned. When
            the field is empty it becomes a Voice (mic) button. */}
        <div className="border-t border-slate-200/70 dark:border-white/10 p-3 sm:p-4 bg-white/80 dark:bg-slate-900/40 backdrop-blur">
          <div className="flex items-end gap-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 pl-4 pr-2 py-2 transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100 dark:focus-within:ring-brand-900/40">
            <textarea
              rows={1}
              className="flex-1 resize-none bg-transparent outline-none text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 py-1.5 max-h-32"
              placeholder={recording ? 'Listening… speak now (auto-sends after a short pause)' : 'Ask a question, or tap the mic to talk…'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={busy}
              readOnly={recording}
              autoFocus
            />
            {recording ? (
              <button
                type="button"
                onClick={stopVoice}
                className="shrink-0 w-10 h-10 rounded-xl grid place-items-center text-white bg-gradient-to-br from-rose-500 to-rose-700 shadow-soft animate-pulse transition"
                title="Stop & send"
              >
                <Square size={16} />
              </button>
            ) : hasText ? (
              <button
                type="button"
                onClick={() => send()}
                disabled={busy}
                className="shrink-0 w-10 h-10 rounded-xl grid place-items-center text-white bg-gradient-to-br from-brand-600 to-brand-800 hover:from-brand-700 hover:to-brand-900 shadow-glow disabled:opacity-60 transition"
                title="Send"
              >
                <Send size={17} />
              </button>
            ) : (
              <button
                type="button"
                onClick={startVoice}
                disabled={busy}
                className="shrink-0 w-10 h-10 rounded-xl grid place-items-center text-white bg-gradient-to-br from-brand-600 to-brand-800 hover:from-brand-700 hover:to-brand-900 shadow-soft disabled:opacity-60 transition"
                title="Ask with your voice"
              >
                <Mic size={17} />
              </button>
            )}
          </div>
          {recording && (
            <div className="mt-1.5 px-1 text-[11px] text-slate-400">
              Listening live… I’ll send automatically after you pause, or tap stop.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Turn any axios error into something safe to drop into JSX (FastAPI `detail`
 * can be a string, an object, or a Pydantic validation array).
 */
function errorToText(e) {
  const d = e?.response?.data?.detail
  if (!d) return 'Something went wrong reaching the assistant. Please try again.'
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map((x) => x?.msg || JSON.stringify(x)).join(' · ')
  if (typeof d === 'object') return d.msg || JSON.stringify(d)
  return String(d)
}

function Avatar({ size = 'md' }) {
  const cls = size === 'lg' ? 'w-12 h-12 mx-auto' : 'w-9 h-9'
  return (
    <span className={`${cls} shrink-0 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 text-white grid place-items-center shadow-glow`}>
      <Bot size={size === 'lg' ? 22 : 16} />
    </span>
  )
}

function Dot({ d = '0s' }) {
  return <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse-soft" style={{ animationDelay: d }} />
}

// Render **bold** markdown as real bold text (line breaks are preserved by
// the bubble's whitespace-pre-wrap). Everything else stays plain.
function formatRich(text) {
  const parts = String(text || '').split(/(\*\*[\s\S]+?\*\*)/g)
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') && p.length > 4
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  )
}

function Message({ role, text, speaking, onStopSpeak }) {
  const isUser = role === 'user'
  return (
    <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : ''} animate-pop-in`}>
      {!isUser && <Avatar />}
      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
        isUser
          ? 'bg-gradient-to-br from-brand-600 to-brand-800 text-white rounded-tr-sm shadow-glow'
          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 rounded-tl-sm shadow-soft'
      }`}>
        {isUser ? text : formatRich(text)}
        {!isUser && speaking && (
          <button
            type="button"
            onClick={onStopSpeak}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 ring-1 ring-rose-200 dark:ring-rose-900/50 px-2.5 py-1 text-[11px] font-semibold hover:bg-rose-100 transition"
            title="Stop the voice"
          >
            <Square size={11} /> Stop voice
          </button>
        )}
      </div>
      {isUser && (
        <span className="w-9 h-9 shrink-0 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-200 grid place-items-center"><UserIcon size={16} /></span>
      )}
    </div>
  )
}
