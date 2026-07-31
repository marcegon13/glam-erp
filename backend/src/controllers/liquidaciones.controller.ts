import { Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from '../middleware/auth.js'

function rangoPeriodo(periodo: string) {
  const [anio, mes] = periodo.split('-').map(Number)
  const inicio = new Date(Date.UTC(anio, mes - 1, 1))
  const fin = new Date(Date.UTC(anio, mes, 1))
  return { inicio, fin }
}

async function calcularProduccion(tenantId: number, profesionalId: number, periodo: string) {
  const { inicio, fin } = rangoPeriodo(periodo)

  const ordenes = await prisma.orden.findMany({
    where: {
      tenantId,
      profesionalId,
      estado: 'COBRADA',
      fecha: { gte: inicio, lt: fin }
    },
    include: { items: true }
  })

  return ordenes.reduce(
    (total, orden) =>
      total + orden.items.reduce((suma, item) => suma + Number(item.precioAplicado), 0),
    0
  )
}

export const calcularLiquidacion = async (req: AuthRequest, res: Response) => {
  const { profesionalId, periodo } = req.body

  if (!profesionalId || !periodo) {
    res.status(400).json({ error: 'Profesional y período son requeridos' })
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

    const produccion = await calcularProduccion(req.tenantId!, profesionalId, periodo)
    const porcentaje = Number(profesional.porcentaje ?? 0)
    const sueldoBase = Number(profesional.sueldoBase ?? 0)
    const comision = (produccion * porcentaje) / 100
    const sueldoNeto = sueldoBase + comision

    res.json({
      profesionalId,
      periodo,
      produccion,
      comision,
      sueldoBase,
      adelantos: 0,
      descuentos: 0,
      sueldoNeto
    })
  } catch {
    res.status(500).json({ error: 'Error al calcular liquidación' })
  }
}

export const aprobarLiquidacion = async (req: AuthRequest, res: Response) => {
  const { profesionalId, periodo, adelantos, descuentos } = req.body

  if (!profesionalId || !periodo) {
    res.status(400).json({ error: 'Profesional y período son requeridos' })
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

    const produccion = await calcularProduccion(req.tenantId!, profesionalId, periodo)
    const porcentaje = Number(profesional.porcentaje ?? 0)
    const sueldoBase = Number(profesional.sueldoBase ?? 0)
    const comision = (produccion * porcentaje) / 100
    const adelantosNum = Number(adelantos ?? 0)
    const descuentosNum = Number(descuentos ?? 0)
    const sueldoNeto = sueldoBase + comision - adelantosNum - descuentosNum

    const liquidacion = await prisma.liquidacion.upsert({
      where: { profesionalId_periodo: { profesionalId, periodo } },
      create: {
        tenantId: req.tenantId!,
        profesionalId,
        periodo,
        produccion,
        comision,
        sueldoBase,
        adelantos: adelantosNum,
        descuentos: descuentosNum,
        sueldoNeto,
        aprobada: false
      },
      update: {
        produccion,
        comision,
        sueldoBase,
        adelantos: adelantosNum,
        descuentos: descuentosNum,
        sueldoNeto
      }
    })

    res.json(liquidacion)
  } catch {
    res.status(500).json({ error: 'Error al aprobar liquidación' })
  }
}

export const aprobarCierre = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const liquidacion = await tx.liquidacion.findFirst({
        where: { id, tenantId: req.tenantId },
        include: { profesional: true }
      })

      if (!liquidacion) {
        throw new Error('LIQUIDACION_NO_ENCONTRADA')
      }

      const actualizada = await tx.liquidacion.update({
        where: { id },
        data: { aprobada: true }
      })

      await tx.caja.create({
        data: {
          tenantId: req.tenantId!,
          tipo: 'EGRESO',
          metodo: 'TRANSFERENCIA',
          monto: liquidacion.sueldoNeto,
          concepto: `Liquidación ${liquidacion.profesional.nombre} ${liquidacion.profesional.apellido} ${liquidacion.periodo}`,
          referenciaId: id
        }
      })

      return actualizada
    })

    res.json(resultado)
  } catch (error: any) {
    if (error.message === 'LIQUIDACION_NO_ENCONTRADA') {
      res.status(404).json({ error: 'Liquidación no encontrada' })
      return
    }
    res.status(500).json({ error: 'Error al cerrar liquidación' })
  }
}

export const listarLiquidaciones = async (req: AuthRequest, res: Response) => {
  const { periodo } = req.query

  try {
    const liquidaciones = await prisma.liquidacion.findMany({
      where: {
        tenantId: req.tenantId,
        ...(periodo ? { periodo: periodo as string } : {})
      },
      orderBy: { creadoEn: 'desc' },
      include: { profesional: true }
    })

    res.json(liquidaciones)
  } catch {
    res.status(500).json({ error: 'Error al listar liquidaciones' })
  }
}

export const obtenerLiquidacion = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)

  try {
    const liquidacion = await prisma.liquidacion.findFirst({
      where: { id, tenantId: req.tenantId },
      include: { profesional: true }
    })

    if (!liquidacion) {
      res.status(404).json({ error: 'Liquidación no encontrada' })
      return
    }

    res.json(liquidacion)
  } catch {
    res.status(500).json({ error: 'Error al obtener liquidación' })
  }
}
