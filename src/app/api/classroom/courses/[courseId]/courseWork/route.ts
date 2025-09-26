import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function GET(req: NextRequest, { params }: { params: { courseId: string } }) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token || !(token as any).access_token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { courseId } = params
  const url = new URL(req.url)
  const pageSize = url.searchParams.get('pageSize') || '50'
  const debug = url.searchParams.get('debug') === '1'

  try {
    const res = await fetch(`https://classroom.googleapis.com/v1/courses/${courseId}/courseWork?pageSize=${pageSize}`, {
      headers: {
        Authorization: `Bearer ${(token as any).access_token}`,
      },
    })
    const text = await res.text()
    if (debug) return NextResponse.json({ debug: true, status: res.status, raw: text })
    if (!res.ok) return NextResponse.json({ error: 'Error al obtener tareas', status: res.status, details: text }, { status: res.status })
    const data = text ? JSON.parse(text) : {}
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: 'Error inesperado', details: e?.message }, { status: 500 })
  }
}
