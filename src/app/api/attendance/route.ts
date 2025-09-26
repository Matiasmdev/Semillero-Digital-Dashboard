import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// Simulamos una base de datos en memoria para el demo
// En producción, esto sería una base de datos real
let attendanceRecords: any[] = []

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const eventId = searchParams.get('eventId')
    const studentId = searchParams.get('studentId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    let filteredRecords = [...attendanceRecords]

    // Aplicar filtros
    if (courseId) {
      filteredRecords = filteredRecords.filter(r => r.courseId === courseId)
    }
    if (eventId) {
      filteredRecords = filteredRecords.filter(r => r.eventId === eventId)
    }
    if (studentId) {
      filteredRecords = filteredRecords.filter(r => r.studentId === studentId)
    }
    if (dateFrom) {
      filteredRecords = filteredRecords.filter(r => r.date >= dateFrom)
    }
    if (dateTo) {
      filteredRecords = filteredRecords.filter(r => r.date <= dateTo)
    }

    // Calcular estadísticas
    const stats = {
      totalRecords: filteredRecords.length,
      presentCount: filteredRecords.filter(r => r.status === 'present').length,
      lateCount: filteredRecords.filter(r => r.status === 'late').length,
      absentCount: filteredRecords.filter(r => r.status === 'absent').length,
      attendanceRate: filteredRecords.length > 0 
        ? Math.round((filteredRecords.filter(r => r.status === 'present' || r.status === 'late').length / filteredRecords.length) * 100)
        : 0
    }

    return NextResponse.json({
      records: filteredRecords,
      stats,
      filters: {
        courseId,
        eventId,
        studentId,
        dateFrom,
        dateTo
      }
    })

  } catch (error) {
    console.error('Error fetching attendance:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      eventId,
      courseId,
      courseName,
      studentId,
      studentName,
      studentEmail,
      status,
      date,
      time,
      location,
      notes
    } = body

    // Validar datos requeridos
    if (!eventId || !courseId || !studentId || !status) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: eventId, courseId, studentId, status' },
        { status: 400 }
      )
    }

    // Validar status
    if (!['present', 'absent', 'late'].includes(status)) {
      return NextResponse.json(
        { error: 'Status debe ser: present, absent, o late' },
        { status: 400 }
      )
    }

    const attendanceRecord = {
      id: `${eventId}-${studentId}-${Date.now()}`,
      eventId,
      courseId,
      courseName: courseName || 'Curso',
      studentId,
      studentName: studentName || 'Estudiante',
      studentEmail: studentEmail || '',
      status,
      date: date || new Date().toISOString().split('T')[0],
      time: time || new Date().toTimeString().split(' ')[0],
      location: location || 'Virtual',
      notes: notes || '',
      timestamp: new Date().toISOString(),
      recordedBy: session.user?.email || 'Sistema'
    }

    // Verificar si ya existe un registro para este evento y estudiante
    const existingIndex = attendanceRecords.findIndex(
      r => r.eventId === eventId && r.studentId === studentId
    )

    if (existingIndex >= 0) {
      // Actualizar registro existente
      attendanceRecords[existingIndex] = {
        ...attendanceRecords[existingIndex],
        ...attendanceRecord,
        updatedAt: new Date().toISOString()
      }
    } else {
      // Crear nuevo registro
      attendanceRecords.push(attendanceRecord)
    }

    return NextResponse.json({
      success: true,
      record: attendanceRecord,
      message: existingIndex >= 0 ? 'Asistencia actualizada' : 'Asistencia registrada'
    })

  } catch (error) {
    console.error('Error recording attendance:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { recordId, status, notes } = body

    const recordIndex = attendanceRecords.findIndex(r => r.id === recordId)
    
    if (recordIndex === -1) {
      return NextResponse.json(
        { error: 'Registro de asistencia no encontrado' },
        { status: 404 }
      )
    }

    // Actualizar registro
    attendanceRecords[recordIndex] = {
      ...attendanceRecords[recordIndex],
      status: status || attendanceRecords[recordIndex].status,
      notes: notes !== undefined ? notes : attendanceRecords[recordIndex].notes,
      updatedAt: new Date().toISOString(),
      updatedBy: session.user?.email || 'Sistema'
    }

    return NextResponse.json({
      success: true,
      record: attendanceRecords[recordIndex],
      message: 'Asistencia actualizada'
    })

  } catch (error) {
    console.error('Error updating attendance:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const recordId = searchParams.get('recordId')

    if (!recordId) {
      return NextResponse.json(
        { error: 'recordId es requerido' },
        { status: 400 }
      )
    }

    const recordIndex = attendanceRecords.findIndex(r => r.id === recordId)
    
    if (recordIndex === -1) {
      return NextResponse.json(
        { error: 'Registro de asistencia no encontrado' },
        { status: 404 }
      )
    }

    // Eliminar registro
    const deletedRecord = attendanceRecords.splice(recordIndex, 1)[0]

    return NextResponse.json({
      success: true,
      deletedRecord,
      message: 'Registro de asistencia eliminado'
    })

  } catch (error) {
    console.error('Error deleting attendance:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
