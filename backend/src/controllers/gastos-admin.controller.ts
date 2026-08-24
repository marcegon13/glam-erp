import { Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from '../middleware/auth.js'

function rangoDelPeriodo(periodo: string) {
  const [anio, mes] = periodo.split('-').map(Number)
  const inicio = new Date(Date.UTC(anio, mes - 1, 1))
  const fin = new Date(Date.UTC(anio, mes, 1))
  return { inicio, fin }
}

export const listarGastos = async (req: AuthRequest, res: Response) => {
  const { periodo } = req.query

  try {
    const gastos = await prisma.gastoAdmin.findMany({
      where: {
        tenantId: req.tenantId,
        ...(periodo ? { periodo: periodo as string } : {})
      },
      orderBy: { fecha: 'desc' }
    })

    res.json(gastos)
  } catch {
    res.status(500).json({ error: 'Error al listar gastos administrativos' })
  }
}

export const crearGasto = async (req: AuthRequest, res: Response) => {
  const { descripcion, monto, periodo } = req.body

  if (!descripcion || monto == null || !periodo) {
    res.status(400).json({ error: 'Descripción, monto y período son requeridos' })
    return
  }

  try {
    const gasto = await prisma.gastoAdmin.create({
      data: {
        tenantId: req.tenantId!,
        descripcion,
        monto,
        periodo,
        creadoPor: req.userId!
      }
    })

    res.status(201).json(gasto)
  } catch {
    res.status(500).json({ error: 'Error al crear el gasto' })
  }
}

export const eliminarGasto = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)

  try {
    const gasto = await prisma.gastoAdmin.findFirst({
      where: { id, tenantId: req.tenantId }
    })

    if (!gasto) {
      res.status(404).json({ error: 'Gasto no encontrado' })
      return
    }

    await prisma.gastoAdmin.delete({ where: { id } })

    res.json({ message: 'Gasto eliminado' })
  } catch {
    res.status(500).json({ error: 'Error al eliminar el gasto' })
  }
}

export const resumenPeriodo = async (req: AuthRequest, res: Response) => {
  const periodo = req.query.periodo as string

  if (!periodo) {
    res.status(400).json({ error: 'Período es requerido' })
    return
  }

  try {
    const { inicio, fin } = rangoDelPeriodo(periodo)

    const [movimientosCaja, vales, gastos] = await Promise.all([
      prisma.caja.findMany({
        where: { tenantId: req.tenantId, fecha: { gte: inicio, lt: fin } }
      }),
      prisma.vale.findMany({ where: { tenantId: req.tenantId, periodo } }),
      prisma.gastoAdmin.findMany({ where: { tenantId: req.tenantId, periodo } })
    ])

    const totalEfectivoEntregado = movimientosCaja
      .filter((m) => m.tipo === 'EGRESO' && m.metodo === 'EFECTIVO')
      .reduce((suma, m) => suma + Number(m.monto), 0)

    const totalTarjetas = movimientosCaja
      .filter((m) => m.tipo === 'INGRESO' && m.metodo === 'TARJETA')
      .reduce((suma, m) => suma + Number(m.monto), 0)

    const totalVales = vales.reduce((suma, v) => suma + Number(v.monto), 0)
    const totalGastos = gastos.reduce((suma, g) => suma + Number(g.monto), 0)

    const neto = totalEfectivoEntregado - (totalVales + totalGastos)

    res.json({
      totalEfectivoEntregado,
      totalTarjetas,
      totalVales,
      totalGastos,
      neto
    })
  } catch {
    res.status(500).json({ error: 'Error al calcular el resumen del período' })
  }
}
