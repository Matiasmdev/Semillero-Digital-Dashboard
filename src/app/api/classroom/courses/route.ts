import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token || !(token as any).access_token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const url = new URL(req.url)
  const pageSize = url.searchParams.get('pageSize') || '50'
  const debug = url.searchParams.get('debug') === '1'

  try {
    const res = await fetch(`https://classroom.googleapis.com/v1/courses?pageSize=${pageSize}`, {
      headers: {
        Authorization: `Bearer ${(token as any).access_token}`,
      },
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: 'Error al obtener cursos', status: res.status, details: err }, { status: res.status })
    }

    const text = await res.text()
    if (debug) {
      return NextResponse.json({ debug: true, status: res.status, raw: text })
    }
    try {
      const data = text ? JSON.parse(text) : {}
      return NextResponse.json(data)
    } catch (e) {
      return NextResponse.json({ error: 'Respuesta no válida de Classroom', raw: text }, { status: 502 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: 'Error inesperado', details: e?.message }, { status: 500 })
  }
}
