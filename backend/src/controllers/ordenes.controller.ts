import { Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from '../middleware/auth.js'

export const crearOrden = async (req: AuthRequest, res: Response) => {
  const { clienteId, profesionalId, observaciones } = req.body

  if (!clienteId || !profesionalId) {
    res.status(400).json({ error: 'Cliente y profesional son requeridos' })
    return
  }

  try {
    const orden = await prisma.orden.create({
      data: {
        tenantId: req.tenantId!,
        clienteId,
        profesionalId,
        usuarioId: req.userId!,
        observaciones
      },
      include: {
        cliente: true,
        profesional: true
      }
    })

    res.status(201).json(orden)
  } catch {
    res.status(500).json({ error: 'Error al crear orden' })
  }
}

export const agregarItem = async (req: AuthRequest, res: Response) => {
  const ordenId = Number(req.params.id)
  const { servicioId, descripcion, precioAplicado } = req.body

  if (!descripcion || precioAplicado == null) {
    res.status(400).json({ error: 'Descripción y precio aplicado son requeridos' })
    return
  }

  try {
    const orden = await prisma.orden.findFirst({
      where: { id: ordenId, tenantId: req.tenantId }
    })

    if (!orden) {
      res.status(404).json({ error: 'Orden no encontrada' })
      return
    }

    if (orden.estado !== 'ABIERTA') {
      res.status(400).json({ error: 'La orden no está abierta' })
      return
    }

    const item = await prisma.ordenItem.create({
      data: {
        ordenId,
        servicioId,
        descripcion,
        precioAplicado
      }
    })

    res.status(201).json(item)
  } catch {
    res.status(500).json({ error: 'Error al agregar item' })
  }
}

export const eliminarItem = async (req: AuthRequest, res: Response) => {
  const ordenId = Number(req.params.id)
  const itemId = Number(req.params.itemId)

  try {
    const orden = await prisma.orden.findFirst({
      where: { id: ordenId, tenantId: req.tenantId }
    })

    if (!orden) {
      res.status(404).json({ error: 'Orden no encontrada' })
      return
    }

    if (orden.estado !== 'ABIERTA') {
      res.status(400).json({ error: 'La orden no está abierta' })
      return
    }

    const resultado = await prisma.ordenItem.deleteMany({
      where: { id: itemId, ordenId }
    })

    if (resultado.count === 0) {
      res.status(404).json({ error: 'Item no encontrado' })
      return
    }

    res.json({ message: 'Item eliminado' })
  } catch {
    res.status(500).json({ error: 'Error al eliminar item' })
  }
}

export const obtenerOrden = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)

  try {
    const orden = await prisma.orden.findFirst({
      where: { id, tenantId: req.tenantId },
      include: {
        cliente: true,
        profesional: true,
        items: { include: { servicio: true } },
        pagos: true
      }
    })

    if (!orden) {
      res.status(404).json({ error: 'Orden no encontrada' })
      return
    }

    res.json(orden)
  } catch {
    res.status(500).json({ error: 'Error al obtener orden' })
  }
}

export const listarOrdenes = async (req: AuthRequest, res: Response) => {
  const { estado, fecha } = req.query

  try {
    let filtroFecha
    if (fecha) {
      const inicio = new Date(`${fecha}T00:00:00.000Z`)
      const fin = new Date(inicio)
      fin.setUTCDate(fin.getUTCDate() + 1)
      filtroFecha = { gte: inicio, lt: fin }
    }

    const ordenes = await prisma.orden.findMany({
      where: {
        tenantId: req.tenantId,
        ...(estado ? { estado: estado as any } : {}),
        ...(filtroFecha ? { fecha: filtroFecha } : {})
      },
      orderBy: { fecha: 'desc' },
      take: 50,
      include: {
        cliente: true,
        profesional: true
      }
    })

    res.json(ordenes)
  } catch {
    res.status(500).json({ error: 'Error al listar órdenes' })
  }
}

export const cobrarOrden = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)
  const { metodo } = req.body

  if (!metodo) {
    res.status(400).json({ error: 'Método de pago es requerido' })
    return
  }

  try {
    const ordenActualizada = await prisma.$transaction(async (tx) => {
      const orden = await tx.orden.findFirst({
        where: { id, tenantId: req.tenantId },
        include: { items: true }
      })

      if (!orden) {
        throw new Error('ORDEN_NO_ENCONTRADA')
      }

      if (orden.estado !== 'ABIERTA') {
        throw new Error('ORDEN_NO_ABIERTA')
      }

      const total = orden.items.reduce(
        (suma, item) => suma + Number(item.precioAplicado),
        0
      )

      await tx.pago.create({
        data: {
          ordenId: id,
          metodo,
          monto: total
        }
      })

      await tx.orden.update({
        where: { id },
        data: { estado: 'COBRADA' }
      })

      await tx.caja.create({
        data: {
          tenantId: req.tenantId!,
          tipo: 'INGRESO',
          metodo,
          monto: total,
          concepto: `Cobro Orden #${id}`,
          referenciaId: id
        }
      })

      return tx.orden.findFirst({
        where: { id },
        include: {
          cliente: true,
          profesional: true,
          items: { include: { servicio: true } },
          pagos: true
        }
      })
    })

    res.json(ordenActualizada)
  } catch (error: any) {
    if (error.message === 'ORDEN_NO_ENCONTRADA') {
      res.status(404).json({ error: 'Orden no encontrada' })
      return
    }
    if (error.message === 'ORDEN_NO_ABIERTA') {
      res.status(400).json({ error: 'La orden no está abierta' })
      return
    }
    res.status(500).json({ error: 'Error al cobrar orden' })
  }
}

export const anularOrden = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)

  try {
    const resultado = await prisma.orden.updateMany({
      where: { id, tenantId: req.tenantId, estado: 'ABIERTA' },
      data: { estado: 'ANULADA' }
    })

    if (resultado.count === 0) {
      res.status(404).json({ error: 'Orden no encontrada o no está abierta' })
      return
    }

    res.json({ message: 'Orden anulada' })
  } catch {
    res.status(500).json({ error: 'Error al anular orden' })
  }
}
