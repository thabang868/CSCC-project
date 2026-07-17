import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Trash2, Loader2 } from 'lucide-react'

const MAX_SECONDS = 180

/**
 * Records a voice note via the browser's MediaRecorder and produces a
 * draft transcript through the Web Speech API. The parent owns the final
 * state we surface { blob, mime, durationSeconds, transcript } through
 * onChange whenever any of those change. Azure Speech-to-Text re-runs
 * the canonical transcription on the server when the ticket is submitted.
 */
export default function VoiceRecorder({ value, onChange, disabled = false }) {
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [permError, setPermError] = useState('')
  const [liveTranscript, setLiveTranscript] = useState('')

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const recognitionRef = useRef(null)

  const objectUrl = useRef(null)
  useEffect(() => {
    if (value?.blob) {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
      objectUrl.current = URL.createObjectURL(value.blob)
    } else if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current); objectUrl.current = null
    }
    return () => { if (objectUrl.current) URL.revokeObjectURL(objectUrl.current) }
  }, [value?.blob])

  // Cleanup any open streams / timers on unmount.
  useEffect(() => () => stopEverything(true), [])

  const stopEverything = (silent = false) => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop() } catch (_) {}
    }
    mediaRecorderRef.current = null
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch (_) {}
      recognitionRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (!silent) setRecording(false)
  }

  const pickMime = () => {
    if (typeof window === 'undefined' || !window.MediaRecorder) return ''
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ]
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c)) return c
    }
    return ''
  }

  const startLiveTranscription = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    try {
      const rec = new SR()
      rec.continuous = true
      rec.interimResults = true
      rec.lang = navigator.language || 'en-US'
      let finalText = ''
      rec.onresult = (e) => {
        let interim = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i]
          if (r.isFinal) finalText += (finalText ? ' ' : '') + r[0].transcript.trim()
          else interim += r[0].transcript
        }
        const merged = (finalText + ' ' + interim).trim()
        setLiveTranscript(merged)
      }
      rec.onerror = () => { /* swallow Azure will retranscribe server-side */ }
      rec.start()
      recognitionRef.current = rec
    } catch (_) { /* no-op */ }
  }

  const start = async () => {
    setPermError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermError('This browser does not support audio recording.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = pickMime()
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime || 'audio/webm' })
        const seconds = Math.max(1, Math.round(elapsedRef.current))
        onChange?.({
          blob,
          mime: blob.type || 'audio/webm',
          durationSeconds: seconds,
          transcript: liveTranscriptRef.current.trim(),
        })
        chunksRef.current = []
      }
      mr.start()
      mediaRecorderRef.current = mr
      setLiveTranscript('')
      startLiveTranscription()
      setElapsed(0); elapsedRef.current = 0
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1; setElapsed(elapsedRef.current)
        if (elapsedRef.current >= MAX_SECONDS) stop()
      }, 1000)
      setRecording(true)
    } catch (e) {
      setPermError(e?.message || 'Microphone permission was blocked.')
    }
  }

  const elapsedRef = useRef(0)
  const liveTranscriptRef = useRef('')
  useEffect(() => { liveTranscriptRef.current = liveTranscript }, [liveTranscript])

  const stop = () => { stopEverything() }

  const reset = () => {
    onChange?.(null)
    setLiveTranscript('')
    setElapsed(0); elapsedRef.current = 0
  }

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(1, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="rounded-xl border border-slate-200 bg-white/80 p-3.5 space-y-3">
      {permError && (
        <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {permError}
        </div>
      )}

      {!value?.blob ? (
        <div className="flex items-center gap-3">
          {!recording ? (
            <button type="button" onClick={start} disabled={disabled}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold
                               text-white bg-gradient-to-br from-rose-500 to-rose-700 hover:from-rose-600 hover:to-rose-800
                               shadow-soft disabled:opacity-60">
              <Mic size={16} /> Record voice note
            </button>
          ) : (
            <button type="button" onClick={stop}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold
                               text-white bg-slate-800 hover:bg-slate-900 shadow-soft">
              <Square size={14} /> Stop ({fmt(elapsed)})
            </button>
          )}
          {recording && (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="relative inline-flex w-2.5 h-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
              </span>
              Recording… speak naturally - we'll transcribe with Azure on submit.
            </div>
          )}
          {!recording && (
            <div className="text-xs text-slate-500">
              Up to {MAX_SECONDS / 60} min · MP4 / WebM Opus · saved encrypted.
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          <audio
            src={objectUrl.current || undefined}
            controls
            className="h-9 flex-1 min-w-[220px]"
          />
          <span className="text-xs text-slate-500">
            {fmt(value.durationSeconds || 0)} · ready to submit
          </span>
          <button type="button" onClick={reset}
                  className="inline-flex items-center gap-1 text-xs text-rose-700 hover:text-rose-900">
            <Trash2 size={12} /> Discard & re-record
          </button>
        </div>
      )}

      {(liveTranscript || value?.transcript) && (
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-slate-500 mb-1">
            Live transcript (preview)
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 whitespace-pre-wrap">
            {value?.transcript || liveTranscript}
          </div>
          <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-500">
            <Loader2 size={11} className={recording ? 'animate-spin' : 'opacity-40'} />
            Azure Speech-to-Text re-runs the canonical transcription on submit.
          </div>
        </div>
      )}
    </div>
  )
}
