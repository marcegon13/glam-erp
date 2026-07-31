import { Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from '../middleware/auth.js'

export const listarServicios = async (req: AuthRequest, res: Response) => {
  const { tipo } = req.query

  try {
    const servicios = await prisma.servicio.findMany({
      where: {
        tenantId: req.tenantId,
        activo: true,
        ...(tipo ? { tipo: tipo as any } : {})
      },
      orderBy: { nombre: 'asc' }
    })

    res.json(servicios)
  } catch {
    res.status(500).json({ error: 'Error al listar servicios' })
  }
}

export const crearServicio = async (req: AuthRequest, res: Response) => {
  const { nombre, precio, tipo } = req.body

  if (!nombre || !precio || !tipo) {
    res.status(400).json({ error: 'Nombre, precio y tipo son requeridos' })
    return
  }

  try {
    const servicio = await prisma.servicio.create({
      data: {
        tenantId: req.tenantId!,
        nombre,
        precio,
        tipo
      }
    })

    res.status(201).json(servicio)
  } catch {
    res.status(500).json({ error: 'Error al crear servicio' })
  }
}

export const editarServicio = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)
  const { nombre, precio, tipo } = req.body

  try {
    const resultado = await prisma.servicio.updateMany({
      where: { id, tenantId: req.tenantId },
      data: { nombre, precio, tipo }
    })

    if (resultado.count === 0) {
      res.status(404).json({ error: 'Servicio no encontrado' })
      return
    }

    res.json({ message: 'Servicio actualizado' })
  } catch {
    res.status(500).json({ error: 'Error al editar servicio' })
  }
}

export const eliminarServicio = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)

  try {
    const resultado = await prisma.servicio.updateMany({
      where: { id, tenantId: req.tenantId },
      data: { activo: false }
    })

    if (resultado.count === 0) {
      res.status(404).json({ error: 'Servicio no encontrado' })
      return
    }

    res.json({ message: 'Servicio eliminado' })
  } catch {
    res.status(500).json({ error: 'Error al eliminar servicio' })
  }
}
