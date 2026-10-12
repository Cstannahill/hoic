import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from './route'

const mockGetUser = vi.fn()
const mockMemberSelect = vi.fn()

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn((table: string) => {
      if (table === 'members') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: mockMemberSelect,
            }),
          }),
        }
      }
      return {}
    }),
  })),
}))

describe('/api/transcribe route', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('returns 401 if user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const req = new Request('http://localhost/api/transcribe', {
      method: 'POST',
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 403 if member is inactive', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockMemberSelect.mockResolvedValue({ data: { active: false } })

    const req = new Request('http://localhost/api/transcribe', {
      method: 'POST',
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toMatch(/active member account required/i)
  })

  it('returns 503 if GROQ_API_KEY is missing', async () => {
    delete process.env.GROQ_API_KEY
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockMemberSelect.mockResolvedValue({ data: { active: true } })

    const req = new Request('http://localhost/api/transcribe', {
      method: 'POST',
    })
    const res = await POST(req)
    expect(res.status).toBe(503)
    const json = await res.json()
    expect(json.error).toMatch(/GROQ_API_KEY is not configured/i)
  })

  it('returns 400 if no audio file is provided', async () => {
    process.env.GROQ_API_KEY = 'gsk_test_key'
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockMemberSelect.mockResolvedValue({ data: { active: true } })

    const formData = new FormData()
    const req = new Request('http://localhost/api/transcribe', {
      method: 'POST',
      body: formData,
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/no audio recording received/i)
  })

  it('forwards audio to Groq Whisper and returns transcribed text', async () => {
    process.env.GROQ_API_KEY = 'gsk_test_key'
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockMemberSelect.mockResolvedValue({ data: { active: true } })

    const fakeAudioBlob = new Blob(['dummy audio bytes'], { type: 'audio/webm' })
    const testFormData = new FormData()
    testFormData.append('file', fakeAudioBlob, 'voice.webm')

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ text: 'Please paint the trim white and clean the gutters.' }),
    } as any)

    const req = {
      formData: async () => testFormData,
    } as unknown as Request

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.text).toBe('Please paint the trim white and clean the gutters.')

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer gsk_test_key',
        }),
      })
    )
  })

  it('handles Groq API error response gracefully', async () => {
    process.env.GROQ_API_KEY = 'gsk_test_key'
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockMemberSelect.mockResolvedValue({ data: { active: true } })

    const fakeAudioBlob = new Blob(['dummy audio bytes'], { type: 'audio/webm' })
    const testFormData = new FormData()
    testFormData.append('file', fakeAudioBlob, 'voice.webm')

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: 'Corrupt audio file' } }),
    } as any)

    const req = {
      formData: async () => testFormData,
    } as unknown as Request

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Corrupt audio file')
  })
})
