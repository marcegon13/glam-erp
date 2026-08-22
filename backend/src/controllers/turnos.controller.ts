import { Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from '../middleware/auth.js'

const ESTADOS_ACTIVOS = ['PENDIENTE', 'CONFIRMADO'] as const

export const listarTurnos = async (req: AuthRequest, res: Response) => {
  const { fecha, profesionalId, cliente, telefono } = req.query

  try {
    const filtroFecha = fecha ? new Date(`${fecha}T00:00:00.000Z`) : undefined

    const turnos = await prisma.turno.findMany({
      where: {
        tenantId: req.tenantId,
        estado: { in: [...ESTADOS_ACTIVOS] },
        ...(filtroFecha ? { fecha: filtroFecha } : {}),
        ...(profesionalId ? { profesionalId: Number(profesionalId) } : {}),
        ...(cliente || telefono
          ? {
              cliente: {
                OR: [
                  ...(cliente
                    ? [
                        { nombre: { contains: cliente as string, mode: 'insensitive' as const } },
                        { apellido: { contains: cliente as string, mode: 'insensitive' as const } }
                      ]
                    : []),
                  ...(telefono
                    ? [{ telefono: { contains: telefono as string, mode: 'insensitive' as const } }]
                    : [])
                ]
              }
            }
          : {})
      },
      orderBy: [{ fecha: 'asc' }, { hora: 'asc' }],
      include: {
        cliente: true,
        profesional: true
      }
    })

    res.json(turnos)
  } catch {
    res.status(500).json({ error: 'Error al listar turnos' })
  }
}

export const listarArchivados = async (req: AuthRequest, res: Response) => {
  const { fecha, profesionalId } = req.query

  try {
    const filtroFecha = fecha ? new Date(`${fecha}T00:00:00.000Z`) : undefined

    const turnos = await prisma.turno.findMany({
      where: {
        tenantId: req.tenantId,
        estado: 'ARCHIVADO',
        ...(filtroFecha ? { fecha: filtroFecha } : {}),
        ...(profesionalId ? { profesionalId: Number(profesionalId) } : {})
      },
      orderBy: [{ fecha: 'desc' }, { hora: 'asc' }],
      include: {
        cliente: true,
        profesional: true
      }
    })

    res.json(turnos)
  } catch {
    res.status(500).json({ error: 'Error al listar turnos archivados' })
  }
}

function armarServicios(serviciosEstilista?: string, serviciosManicura?: string): string {
  return serviciosManicura
    ? `Estilista: ${serviciosEstilista} | Manicura: ${serviciosManicura}`
    : `Estilista: ${serviciosEstilista}`
}

export const crearTurno = async (req: AuthRequest, res: Response) => {
  const { clienteId, profesionalId, fecha, hora, serviciosEstilista, serviciosManicura, observaciones } = req.body

  if (!clienteId || !profesionalId || !fecha || !hora || !serviciosEstilista) {
    res.status(400).json({ error: 'Cliente, profesional, fecha, hora y servicios de estilista son requeridos' })
    return
  }

  const servicios = armarServicios(serviciosEstilista, serviciosManicura)

  try {
    const fechaTurno = new Date(`${fecha}T00:00:00.000Z`)

    const ausencia = await prisma.ausencia.findFirst({
      where: { tenantId: req.tenantId, profesionalId, fecha: fechaTurno }
    })

    if (ausencia) {
      res.status(400).json({ error: 'El profesional no atiende ese día' })
      return
    }

    const duplicado = await prisma.turno.findFirst({
      where: {
        tenantId: req.tenantId,
        clienteId,
        profesionalId,
        fecha: fechaTurno,
        hora,
        estado: { in: [...ESTADOS_ACTIVOS] }
      }
    })

    if (duplicado) {
      res.status(400).json({ error: 'Ya existe un turno para este cliente con este profesional en esa fecha y hora' })
      return
    }

    const superpuesto = await prisma.turno.findFirst({
      where: {
        tenantId: req.tenantId,
        profesionalId,
        fecha: fechaTurno,
        hora,
        estado: { in: [...ESTADOS_ACTIVOS] }
      }
    })

    const turno = await prisma.turno.create({
      data: {
        tenantId: req.tenantId!,
        clienteId,
        profesionalId,
        fecha: fechaTurno,
        hora,
        servicios,
        observaciones,
        estado: 'PENDIENTE',
        creadoPor: req.userId!
      },
      include: {
        cliente: true,
        profesional: true
      }
    })

    res.status(201).json({
      ...turno,
      ...(superpuesto ? { advertencia: 'El profesional ya tiene otro turno en ese horario' } : {})
    })
  } catch {
    res.status(500).json({ error: 'Error al crear turno' })
  }
}

export const obtenerTurno = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)

  try {
    const turno = await prisma.turno.findFirst({
      where: { id, tenantId: req.tenantId },
      include: {
        cliente: true,
        profesional: true
      }
    })

    if (!turno) {
      res.status(404).json({ error: 'Turno no encontrado' })
      return
    }

    res.json(turno)
  } catch {
    res.status(500).json({ error: 'Error al obtener turno' })
  }
}

export const editarTurno = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)
  const { clienteId, profesionalId, fecha, hora, serviciosEstilista, serviciosManicura, observaciones } = req.body

  try {
    const turnoExistente = await prisma.turno.findFirst({
      where: { id, tenantId: req.tenantId }
    })

    if (!turnoExistente) {
      res.status(404).json({ error: 'Turno no encontrado' })
      return
    }

    const clienteFinal = clienteId ?? turnoExistente.clienteId
    const profesionalFinal = profesionalId ?? turnoExistente.profesionalId
    const fechaFinal = fecha ? new Date(`${fecha}T00:00:00.000Z`) : turnoExistente.fecha
    const horaFinal = hora ?? turnoExistente.hora
    const serviciosFinal = serviciosEstilista
      ? armarServicios(serviciosEstilista, serviciosManicura)
      : turnoExistente.servicios
    const observacionesFinal = observaciones !== undefined ? observaciones : turnoExistente.observaciones

    const ausencia = await prisma.ausencia.findFirst({
      where: { tenantId: req.tenantId, profesionalId: profesionalFinal, fecha: fechaFinal }
    })

    if (ausencia) {
      res.status(400).json({ error: 'El profesional no atiende ese día' })
      return
    }

    const duplicado = await prisma.turno.findFirst({
      where: {
        tenantId: req.tenantId,
        id: { not: id },
        clienteId: clienteFinal,
        profesionalId: profesionalFinal,
        fecha: fechaFinal,
        hora: horaFinal,
        estado: { in: [...ESTADOS_ACTIVOS] }
      }
    })

    if (duplicado) {
      res.status(400).json({ error: 'Ya existe un turno para este cliente con este profesional en esa fecha y hora' })
      return
    }

    const superpuesto = await prisma.turno.findFirst({
      where: {
        tenantId: req.tenantId,
        id: { not: id },
        profesionalId: profesionalFinal,
        fecha: fechaFinal,
        hora: horaFinal,
        estado: { in: [...ESTADOS_ACTIVOS] }
      }
    })

    const turno = await prisma.turno.update({
      where: { id },
      data: {
        clienteId: clienteFinal,
        profesionalId: profesionalFinal,
        fecha: fechaFinal,
        hora: horaFinal,
        servicios: serviciosFinal,
        observaciones: observacionesFinal
      },
      include: {
        cliente: true,
        profesional: true
      }
    })

    res.json({
      ...turno,
      ...(superpuesto ? { advertencia: 'El profesional ya tiene otro turno en ese horario' } : {})
    })
  } catch {
    res.status(500).json({ error: 'Error al editar turno' })
  }
}

export const confirmarTurno = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)

  try {
    const resultado = await prisma.turno.updateMany({
      where: { id, tenantId: req.tenantId },
      data: { estado: 'CONFIRMADO' }
    })

    if (resultado.count === 0) {
      res.status(404).json({ error: 'Turno no encontrado' })
      return
    }

    res.json({ message: 'Turno confirmado' })
  } catch {
    res.status(500).json({ error: 'Error al confirmar turno' })
  }
}

export const cancelarTurno = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)

  try {
    const resultado = await prisma.turno.updateMany({
      where: { id, tenantId: req.tenantId },
      data: { estado: 'CANCELADO' }
    })

    if (resultado.count === 0) {
      res.status(404).json({ error: 'Turno no encontrado' })
      return
    }

    res.json({ message: 'Turno cancelado' })
  } catch {
    res.status(500).json({ error: 'Error al cancelar turno' })
  }
}

export const archivarViejos = async (req: AuthRequest, res: Response) => {
  try {
    const fechaLimite = new Date()
    fechaLimite.setUTCDate(fechaLimite.getUTCDate() - 30)

    const resultado = await prisma.turno.updateMany({
      where: {
        tenantId: req.tenantId,
        fecha: { lt: fechaLimite },
        estado: { in: [...ESTADOS_ACTIVOS] }
      },
      data: { estado: 'ARCHIVADO' }
    })

    res.json({ message: 'Turnos archivados', archivados: resultado.count })
  } catch {
    res.status(500).json({ error: 'Error al archivar turnos' })
  }
}
