import { Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from '../middleware/auth.js'

export const listarAusencias = async (req: AuthRequest, res: Response) => {
  const { profesionalId, mes } = req.query

  try {
    let filtroFecha
    if (mes) {
      const [anioStr, mesStr] = (mes as string).split('-')
      const anio = Number(anioStr)
      const mesNum = Number(mesStr)
      const inicio = new Date(Date.UTC(anio, mesNum - 1, 1))
      const fin = new Date(Date.UTC(anio, mesNum, 1))
      filtroFecha = { gte: inicio, lt: fin }
    }

    const ausencias = await prisma.ausencia.findMany({
      where: {
        tenantId: req.tenantId,
        ...(profesionalId ? { profesionalId: Number(profesionalId) } : {}),
        ...(filtroFecha ? { fecha: filtroFecha } : {})
      },
      orderBy: { fecha: 'asc' },
      include: {
        profesional: true
      }
    })

    res.json(ausencias)
  } catch {
    res.status(500).json({ error: 'Error al listar ausencias' })
  }
}

export const toggleAusencia = async (req: AuthRequest, res: Response) => {
  const { profesionalId, fecha, motivo } = req.body

  if (!profesionalId || !fecha) {
    res.status(400).json({ error: 'Profesional y fecha son requeridos' })
    return
  }

  try {
    const fechaAusencia = new Date(`${fecha}T00:00:00.000Z`)

    const existente = await prisma.ausencia.findFirst({
      where: { tenantId: req.tenantId, profesionalId, fecha: fechaAusencia }
    })

    if (existente) {
      await prisma.ausencia.delete({ where: { id: existente.id } })
      res.json({ message: 'Ausencia eliminada', ausente: false })
      return
    }

    const ausencia = await prisma.ausencia.create({
      data: {
        tenantId: req.tenantId!,
        profesionalId,
        fecha: fechaAusencia,
        motivo
      }
    })

    res.status(201).json({ message: 'Ausencia creada', ausente: true, ausencia })
  } catch {
    res.status(500).json({ error: 'Error al actualizar ausencia' })
  }
}

export const eliminarAusencia = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)

  try {
    const resultado = await prisma.ausencia.deleteMany({
      where: { id, tenantId: req.tenantId }
    })

    if (resultado.count === 0) {
      res.status(404).json({ error: 'Ausencia no encontrada' })
      return
    }

    res.json({ message: 'Ausencia eliminada' })
  } catch {
    res.status(500).json({ error: 'Error al eliminar ausencia' })
  }
}
