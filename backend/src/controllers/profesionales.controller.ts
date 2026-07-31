import { Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from '../middleware/auth.js'

export const listarProfesionales = async (req: AuthRequest, res: Response) => {
  const { tipo } = req.query

  try {
    const profesionales = await prisma.profesional.findMany({
      where: {
        tenantId: req.tenantId,
        activo: true,
        ...(tipo ? { tipo: tipo as any } : {})
      },
      orderBy: { apellido: 'asc' }
    })

    res.json(profesionales)
  } catch {
    res.status(500).json({ error: 'Error al listar profesionales' })
  }
}

export const crearProfesional = async (req: AuthRequest, res: Response) => {
  const { nombre, apellido, tipo, porcentaje, sueldoBase } = req.body

  if (!nombre || !apellido || !tipo) {
    res.status(400).json({ error: 'Nombre, apellido y tipo son requeridos' })
    return
  }

  try {
    const profesional = await prisma.profesional.create({
      data: {
        tenantId: req.tenantId!,
        nombre,
        apellido,
        tipo,
        porcentaje,
        sueldoBase
      }
    })

    res.status(201).json(profesional)
  } catch {
    res.status(500).json({ error: 'Error al crear profesional' })
  }
}

export const editarProfesional = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)
  const { nombre, apellido, tipo, porcentaje, sueldoBase } = req.body

  try {
    const resultado = await prisma.profesional.updateMany({
      where: { id, tenantId: req.tenantId },
      data: { nombre, apellido, tipo, porcentaje, sueldoBase }
    })

    if (resultado.count === 0) {
      res.status(404).json({ error: 'Profesional no encontrado' })
      return
    }

    res.json({ message: 'Profesional actualizado' })
  } catch {
    res.status(500).json({ error: 'Error al editar profesional' })
  }
}

export const eliminarProfesional = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)

  try {
    const resultado = await prisma.profesional.updateMany({
      where: { id, tenantId: req.tenantId },
      data: { activo: false }
    })

    if (resultado.count === 0) {
      res.status(404).json({ error: 'Profesional no encontrado' })
      return
    }

    res.json({ message: 'Profesional eliminado' })
  } catch {
    res.status(500).json({ error: 'Error al eliminar profesional' })
  }
}
