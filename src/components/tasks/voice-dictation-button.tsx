'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, Square, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function getAudioMimeType(): { mimeType?: string; ext: string } {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return { ext: 'webm' }
  }

  const candidates = [
    { type: 'audio/webm;codecs=opus', ext: 'webm' },
    { type: 'audio/webm', ext: 'webm' },
    { type: 'audio/mp4', ext: 'mp4' },
    { type: 'audio/m4a', ext: 'm4a' },
    { type: 'audio/aac', ext: 'aac' },
    { type: 'audio/ogg;codecs=opus', ext: 'ogg' },
    { type: 'audio/wav', ext: 'wav' },
  ]

  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.type)) {
      return { mimeType: c.type, ext: c.ext }
    }
  }

  return { ext: 'webm' }
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

interface VoiceDictationButtonProps {
  onTranscript: (text: string) => void
  disabled?: boolean
  className?: string
}

export function VoiceDictationButton({
  onTranscript,
  disabled = false,
  className = '',
}: VoiceDictationButtonProps) {
  const [status, setStatus] = useState<'idle' | 'recording' | 'transcribing'>('idle')
  const [duration, setDuration] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const startRecording = async () => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      toast.error('Voice recording is not supported in this browser.')
      return
    }

    try {
      chunksRef.current = []
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      const { mimeType, ext } = getAudioMimeType()
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })

        if (audioBlob.size === 0) {
          toast.warning('No speech detected.')
          setStatus('idle')
          return
        }

        setStatus('transcribing')

        try {
          const formData = new FormData()
          const fileName = `voice-dictation.${ext}`
          formData.append('file', audioBlob, fileName)

          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          })

          const data = await response.json().catch(() => null)

          if (!response.ok) {
            throw new Error(data?.error || `Transcription failed (${response.status})`)
          }

          if (data?.text && data.text.trim()) {
            onTranscript(data.text.trim())
            toast.success('Dictation transcribed!')
          } else {
            toast.info('No speech detected in audio.')
          }
        } catch (err: any) {
          console.error('Transcription error:', err)
          toast.error(err.message || 'Failed to transcribe audio.')
        } finally {
          setStatus('idle')
          setDuration(0)
        }
      }

      recorder.start(250) // Collect chunks every 250ms
      setStatus('recording')
      setDuration(0)

      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          // Auto-stop at 5 minutes
          if (prev >= 300) {
            stopRecording()
            return prev
          }
          return prev + 1
        })
      }, 1000)
    } catch (err: any) {
      console.error('Microphone error:', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error('Microphone access denied. Please grant permission in browser settings.')
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        toast.error('No microphone found on this device.')
      } else {
        toast.error('Could not access microphone.')
      }
      setStatus('idle')
    }
  }

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    // Stop microphone stream tracks so recording indicator on phone turns off immediately
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }

  if (status === 'recording') {
    return (
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={stopRecording}
        className={`h-7 px-2.5 text-xs gap-1.5 animate-pulse font-medium shadow-sm ${className}`}
        title="Tap to stop recording and transcribe"
      >
        <Square className="size-3 fill-current" />
        <span>Stop ({formatDuration(duration)})</span>
      </Button>
    )
  }

  if (status === 'transcribing') {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled
        className={`h-7 px-2.5 text-xs gap-1.5 ${className}`}
      >
        <Loader2 className="size-3 animate-spin text-primary" />
        <span>Transcribing…</span>
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={startRecording}
      className={`h-7 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors ${className}`}
      title="Speak to dictate notes using Groq Whisper"
    >
      <Mic className="size-3.5 text-primary" />
      <span>Dictate</span>
    </Button>
  )
}
