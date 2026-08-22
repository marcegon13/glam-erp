import { Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from '../middleware/auth.js'

function hoyISO(): string {
  const hoy = new Date()
  const anio = hoy.getUTCFullYear()
  const mes = String(hoy.getUTCMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getUTCDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

export const listarCaja = async (req: AuthRequest, res: Response) => {
  const { fecha, tipo } = req.query
  const fechaFiltro = (fecha as string) || hoyISO()

  try {
    const inicio = new Date(`${fechaFiltro}T00:00:00.000Z`)
    const fin = new Date(inicio)
    fin.setUTCDate(fin.getUTCDate() + 1)

    const movimientosDelDia = await prisma.caja.findMany({
      where: {
        tenantId: req.tenantId,
        fecha: { gte: inicio, lt: fin }
      },
      orderBy: { fecha: 'desc' }
    })

    const ingresos = movimientosDelDia
      .filter((m) => m.tipo === 'INGRESO')
      .reduce((suma, m) => suma + Number(m.monto), 0)
    const egresos = movimientosDelDia
      .filter((m) => m.tipo === 'EGRESO')
      .reduce((suma, m) => suma + Number(m.monto), 0)

    const movimientos = tipo
      ? movimientosDelDia.filter((m) => m.tipo === tipo)
      : movimientosDelDia

    res.json({
      movimientos,
      totales: {
        ingresos,
        egresos,
        balance: ingresos - egresos
      }
    })
  } catch {
    res.status(500).json({ error: 'Error al listar movimientos de caja' })
  }
}

export const registrarMovimiento = async (req: AuthRequest, res: Response) => {
  const { tipo, metodo, monto, concepto } = req.body

  if (!tipo || !metodo || !monto || !concepto) {
    res.status(400).json({ error: 'Tipo, método, monto y concepto son requeridos' })
    return
  }

  try {
    const movimiento = await prisma.caja.create({
      data: {
        tenantId: req.tenantId!,
        tipo,
        metodo,
        monto,
        concepto
      }
    })

    res.status(201).json(movimiento)
  } catch {
    res.status(500).json({ error: 'Error al registrar movimiento' })
  }
}
