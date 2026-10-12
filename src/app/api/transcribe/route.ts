import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: Request) {
  try {
    // 1. Verify user authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: member } = await supabase
      .from('members')
      .select('active')
      .eq('id', user.id)
      .single()

    if (!member || !member.active) {
      return NextResponse.json({ error: 'Active member account required' }, { status: 403 })
    }

    // 2. Verify Groq API Key
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'GROQ_API_KEY is not configured on the server. Please add GROQ_API_KEY to your environment variables to enable voice transcription.',
        },
        { status: 503 }
      )
    }

    // 3. Extract audio file from request
    const formData = await req.formData()
    const file = (formData.get('file') || formData.get('audio')) as File | Blob | null

    if (!file || (file instanceof Blob && file.size === 0)) {
      return NextResponse.json({ error: 'No audio recording received.' }, { status: 400 })
    }

    // 4. Build payload for Groq Whisper
    const groqPayload = new FormData()
    const fileName = (file as File).name || 'recording.webm'
    groqPayload.append('file', file, fileName)
    groqPayload.append('model', 'whisper-large-v3-turbo')
    groqPayload.append('response_format', 'json')

    // 5. Send to Groq API
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: groqPayload,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      const message = errorData?.error?.message || `Groq API error (${response.status})`
      return NextResponse.json({ error: message }, { status: response.status })
    }

    const result = await response.json()
    return NextResponse.json({ text: result.text || '' })
  } catch (error: any) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to process voice transcription.' },
      { status: 500 }
    )
  }
}
