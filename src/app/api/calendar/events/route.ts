import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.access_token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const timeMin = searchParams.get('timeMin') || new Date().toISOString()
    const timeMax = searchParams.get('timeMax') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const debug = searchParams.get('debug') === '1'

    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
    url.searchParams.set('timeMin', timeMin)
    url.searchParams.set('timeMax', timeMax)
    url.searchParams.set('singleEvents', 'true')
    url.searchParams.set('orderBy', 'startTime')
    url.searchParams.set('maxResults', '100')

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${(session as any).access_token}`,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Calendar API error:', response.status, errorText)
      return NextResponse.json(
        { error: `Calendar API error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    if (debug) {
      console.log('Calendar events:', JSON.stringify(data, null, 2))
    }

    // Filtrar eventos relacionados con clases (opcional)
    const classEvents = data.items?.filter((event: any) => {
      const summary = event.summary?.toLowerCase() || ''
      const description = event.description?.toLowerCase() || ''
      
      // Buscar palabras clave relacionadas con clases
      const classKeywords = ['clase', 'class', 'curso', 'course', 'semillero', 'digital', 'aulux']
      return classKeywords.some(keyword => 
        summary.includes(keyword) || description.includes(keyword)
      )
    }) || []

    return NextResponse.json({
      events: data.items || [],
      classEvents,
      nextPageToken: data.nextPageToken,
      timeMin,
      timeMax
    })

  } catch (error) {
    console.error('Error fetching calendar events:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.access_token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      summary, 
      description, 
      startDateTime, 
      endDateTime, 
      attendees = [] 
    } = body

    const event = {
      summary,
      description,
      start: {
        dateTime: startDateTime,
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      attendees: attendees.map((email: string) => ({ email })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 día antes
          { method: 'popup', minutes: 30 }, // 30 min antes
        ],
      },
    }

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${(session as any).access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Calendar create event error:', response.status, errorText)
      return NextResponse.json(
        { error: `Error creating event: ${response.status}` },
        { status: response.status }
      )
    }

    const createdEvent = await response.json()
    
    return NextResponse.json({
      success: true,
      event: createdEvent
    })

  } catch (error) {
    console.error('Error creating calendar event:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
