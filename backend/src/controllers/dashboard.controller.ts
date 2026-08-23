import { Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from '../middleware/auth.js'

export const obtenerKpis = async (req: AuthRequest, res: Response) => {
  try {
    const hoy = new Date()
    const inicioHoy = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()))
    const finHoy = new Date(inicioHoy)
    finHoy.setUTCDate(finHoy.getUTCDate() + 1)

    const inicioMes = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1))
    const finMes = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() + 1, 1))

    const [turnosHoy, ordenesAbiertas, movimientosHoy, ordenesDelMes] = await Promise.all([
      prisma.turno.count({
        where: {
          tenantId: req.tenantId,
          fecha: { gte: inicioHoy, lt: finHoy },
          estado: { in: ['PENDIENTE', 'CONFIRMADO'] }
        }
      }),
      prisma.orden.count({
        where: { tenantId: req.tenantId, estado: 'ABIERTA' }
      }),
      prisma.caja.findMany({
        where: {
          tenantId: req.tenantId,
          tipo: 'INGRESO',
          fecha: { gte: inicioHoy, lt: finHoy }
        }
      }),
      prisma.orden.findMany({
        where: {
          tenantId: req.tenantId,
          estado: 'COBRADA',
          fecha: { gte: inicioMes, lt: finMes }
        },
        include: { items: true }
      })
    ])

    const ordenIds = movimientosHoy
      .filter((m) => m.referenciaId != null)
      .map((m) => m.referenciaId as number)

    const pagos = ordenIds.length > 0
      ? await prisma.pago.findMany({ where: { ordenId: { in: ordenIds } } })
      : []
    const acreditadoPorOrden = new Map(pagos.map((p) => [p.ordenId, p.acreditado]))

    const ingresosHoy = movimientosHoy
      .filter((m) => acreditadoPorOrden.get(m.referenciaId ?? -1) ?? true)
      .reduce((suma, m) => suma + Number(m.monto), 0)

    const produccionMes = ordenesDelMes.reduce(
      (total, orden) =>
        total + orden.items.reduce((suma, item) => suma + Number(item.precioAplicado) * item.cantidad, 0),
      0
    )

    res.json({ turnosHoy, ingresosHoy, ordenesAbiertas, produccionMes })
  } catch {
    res.status(500).json({ error: 'Error al obtener los KPIs' })
  }
}
