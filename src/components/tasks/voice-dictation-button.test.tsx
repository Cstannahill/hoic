import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { VoiceDictationButton, getAudioMimeType } from './voice-dictation-button'
import { toast } from 'sonner'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}))

describe('VoiceDictationButton', () => {
  let mockStream: any
  let mockRecorder: any
  let originalMediaDevices: any
  let originalMediaRecorder: any

  beforeEach(() => {
    vi.clearAllMocks()

    const mockTrack = { stop: vi.fn() }
    mockStream = {
      getTracks: vi.fn().mockReturnValue([mockTrack]),
    }

    mockRecorder = {
      state: 'recording',
      start: vi.fn(),
      stop: vi.fn().mockImplementation(function (this: any) {
        this.state = 'inactive'
        if (this.onstop) this.onstop()
      }),
      ondataavailable: null as any,
      onstop: null as any,
      mimeType: 'audio/webm',
    }

    originalMediaDevices = navigator.mediaDevices
    originalMediaRecorder = (globalThis as any).MediaRecorder

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
      configurable: true,
    })

    function MockMediaRecorder() {
      return mockRecorder
    }
    MockMediaRecorder.isTypeSupported = vi.fn().mockReturnValue(true)
    ;(globalThis as any).MediaRecorder = MockMediaRecorder
    window.MediaRecorder = MockMediaRecorder as any
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalMediaDevices,
      configurable: true,
    })
    ;(globalThis as any).MediaRecorder = originalMediaRecorder
    window.MediaRecorder = originalMediaRecorder
    vi.restoreAllMocks()
  })

  it('renders idle state with Dictate button', () => {
    render(<VoiceDictationButton onTranscript={vi.fn()} />)
    expect(screen.getByRole('button', { name: /dictate/i })).toBeInTheDocument()
  })

  it('starts recording when clicked', async () => {
    render(<VoiceDictationButton onTranscript={vi.fn()} />)

    const dictateBtn = screen.getByRole('button', { name: /dictate/i })
    await act(async () => {
      fireEvent.click(dictateBtn)
    })

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true })
    const stopBtn = await screen.findByRole('button', { name: /stop/i })
    expect(stopBtn).toBeInTheDocument()
  })

  it('stops recording, sends audio to /api/transcribe, and invokes onTranscript', async () => {
    const onTranscriptMock = vi.fn()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ text: 'Replace broken drywall in unit 4' }),
    } as any)

    render(<VoiceDictationButton onTranscript={onTranscriptMock} />)

    // 1. Start recording
    const dictateBtn = screen.getByRole('button', { name: /dictate/i })
    await act(async () => {
      fireEvent.click(dictateBtn)
    })

    const stopBtn = await screen.findByRole('button', { name: /stop/i })

    // Simulate audio data chunk captured
    if (mockRecorder.ondataavailable) {
      mockRecorder.ondataavailable({
        data: new Blob(['audio-bytes'], { type: 'audio/webm' }),
      })
    }

    // 2. Stop recording
    await act(async () => {
      fireEvent.click(stopBtn)
    })

    // Tracks should be stopped to turn off microphone hardware light
    expect(mockStream.getTracks()[0].stop).toHaveBeenCalled()

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/api/transcribe', expect.any(Object))
      expect(onTranscriptMock).toHaveBeenCalledWith('Replace broken drywall in unit 4')
      expect(toast.success).toHaveBeenCalledWith('Dictation transcribed!')
    })
  })

  it('handles microphone permission denied error', async () => {
    const notAllowedError = new Error('Permission denied')
    notAllowedError.name = 'NotAllowedError'
    ;(navigator.mediaDevices.getUserMedia as any).mockRejectedValue(notAllowedError)

    render(<VoiceDictationButton onTranscript={vi.fn()} />)

    const dictateBtn = screen.getByRole('button', { name: /dictate/i })
    await act(async () => {
      fireEvent.click(dictateBtn)
    })

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringMatching(/microphone access denied/i)
    )
  })

  describe('getAudioMimeType', () => {
    it('detects supported mime types correctly', () => {
      ;(window.MediaRecorder as any).isTypeSupported = vi.fn().mockImplementation((type: string) => {
        return type.includes('webm')
      })
      const result = getAudioMimeType()
      expect(result.ext).toBe('webm')
      expect(result.mimeType).toBe('audio/webm;codecs=opus')
    })

    it('falls back to mp4 when webm is not supported (e.g. iOS Safari)', () => {
      ;(window.MediaRecorder as any).isTypeSupported = vi.fn().mockImplementation((type: string) => {
        return type === 'audio/mp4'
      })
      const result = getAudioMimeType()
      expect(result.ext).toBe('mp4')
      expect(result.mimeType).toBe('audio/mp4')
    })
  })
})
