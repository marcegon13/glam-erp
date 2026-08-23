import { Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from '../middleware/auth.js'

export const listarVales = async (req: AuthRequest, res: Response) => {
  const { profesionalId, periodo } = req.query

  try {
    const vales = await prisma.vale.findMany({
      where: {
        tenantId: req.tenantId,
        ...(profesionalId ? { profesionalId: Number(profesionalId) } : {}),
        ...(periodo ? { periodo: periodo as string } : {})
      },
      orderBy: { fecha: 'desc' },
      include: { profesional: true }
    })

    res.json(vales)
  } catch {
    res.status(500).json({ error: 'Error al listar vales' })
  }
}

export const crearVale = async (req: AuthRequest, res: Response) => {
  const { profesionalId, monto, concepto, periodo, fecha } = req.body

  if (!profesionalId || !monto || !periodo) {
    res.status(400).json({ error: 'Profesional, monto y período son requeridos' })
    return
  }

  try {
    const profesional = await prisma.profesional.findFirst({
      where: { id: profesionalId, tenantId: req.tenantId }
    })

    if (!profesional) {
      res.status(404).json({ error: 'Profesional no encontrado' })
      return
    }

    const vale = await prisma.$transaction(async (tx) => {
      const nuevoVale = await tx.vale.create({
        data: {
          tenantId: req.tenantId!,
          profesionalId,
          monto,
          concepto,
          periodo,
          ...(fecha ? { fecha: new Date(`${fecha}T00:00:00.000Z`) } : {})
        },
        include: { profesional: true }
      })

      await tx.caja.create({
        data: {
          tenantId: req.tenantId!,
          tipo: 'EGRESO',
          metodo: 'EFECTIVO',
          monto,
          concepto: `Vale ${profesional.nombre} ${profesional.apellido}`,
          referenciaId: nuevoVale.id
        }
      })

      return nuevoVale
    })

    res.status(201).json(vale)
  } catch {
    res.status(500).json({ error: 'Error al crear vale' })
  }
}

export const eliminarVale = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)

  try {
    const vale = await prisma.vale.findFirst({
      where: { id, tenantId: req.tenantId }
    })

    if (!vale) {
      res.status(404).json({ error: 'Vale no encontrado' })
      return
    }

    if (vale.descontado) {
      res.status(400).json({ error: 'No se puede eliminar un vale ya descontado' })
      return
    }

    await prisma.vale.delete({ where: { id } })

    res.json({ message: 'Vale eliminado' })
  } catch {
    res.status(500).json({ error: 'Error al eliminar vale' })
  }
}
