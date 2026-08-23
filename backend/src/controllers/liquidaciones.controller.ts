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
      total + orden.items.reduce((suma, item) => suma + Number(item.precioAplicado) * item.cantidad, 0),
    0
  )
}

async function produccionPorDia(tenantId: number, profesionalId: number, periodo: string) {
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

  const mapa = new Map<string, number>()
  for (const orden of ordenes) {
    const fechaStr = orden.fecha.toISOString().slice(0, 10)
    const totalOrden = orden.items.reduce((suma, item) => suma + Number(item.precioAplicado) * item.cantidad, 0)
    mapa.set(fechaStr, (mapa.get(fechaStr) ?? 0) + totalOrden)
  }

  return Array.from(mapa.entries())
    .map(([fecha, total]) => ({ fecha, total }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
}

async function valesPendientesDelPeriodo(tenantId: number, profesionalId: number, periodo: string) {
  const vales = await prisma.vale.findMany({
    where: { tenantId, profesionalId, periodo, descontado: false }
  })
  return vales.reduce((suma, v) => suma + Number(v.monto), 0)
}

export const resumenPeriodo = async (req: AuthRequest, res: Response) => {
  const { periodo } = req.params

  try {
    const profesionales = await prisma.profesional.findMany({
      where: { tenantId: req.tenantId, activo: true },
      orderBy: { apellido: 'asc' }
    })

    const resumen = await Promise.all(
      profesionales.map(async (profesional) => {
        const produccion = await calcularProduccion(req.tenantId!, profesional.id, periodo)
        const valesPendientes = await valesPendientesDelPeriodo(req.tenantId!, profesional.id, periodo)
        const porcentaje = Number(profesional.porcentaje ?? 0)
        const comision = (produccion * porcentaje) / 100

        const liquidacion = await prisma.liquidacion.findUnique({
          where: { profesionalId_periodo: { profesionalId: profesional.id, periodo } }
        })

        const estado = !liquidacion ? 'SIN_LIQUIDAR' : liquidacion.aprobada ? 'APROBADA' : 'BORRADOR'

        return {
          profesional: {
            id: profesional.id,
            nombre: profesional.nombre,
            apellido: profesional.apellido,
            tipo: profesional.tipo
          },
          produccion,
          valesPendientes,
          porcentaje,
          comision,
          estado,
          liquidacionId: liquidacion?.id ?? null,
          sueldoNeto: liquidacion ? Number(liquidacion.sueldoNeto) : null
        }
      })
    )

    res.json(resumen)
  } catch {
    res.status(500).json({ error: 'Error al obtener el resumen del período' })
  }
}

export const obtenerLegajo = async (req: AuthRequest, res: Response) => {
  const profesionalId = Number(req.params.profesionalId)
  const { periodo } = req.params

  try {
    const profesional = await prisma.profesional.findFirst({
      where: { id: profesionalId, tenantId: req.tenantId }
    })

    if (!profesional) {
      res.status(404).json({ error: 'Profesional no encontrado' })
      return
    }

    const [produccionDiaria, vales, liquidacion] = await Promise.all([
      produccionPorDia(req.tenantId!, profesionalId, periodo),
      prisma.vale.findMany({
        where: { tenantId: req.tenantId, profesionalId, periodo },
        orderBy: { fecha: 'asc' }
      }),
      prisma.liquidacion.findUnique({
        where: { profesionalId_periodo: { profesionalId, periodo } }
      })
    ])

    res.json({
      profesional,
      periodo,
      produccionDiaria,
      vales,
      liquidacion
    })
  } catch {
    res.status(500).json({ error: 'Error al obtener el legajo' })
  }
}

export const guardarBorrador = async (req: AuthRequest, res: Response) => {
  const { profesionalId, periodo, cargasSociales, descuentos, otros, notas } = req.body

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

    const existente = await prisma.liquidacion.findUnique({
      where: { profesionalId_periodo: { profesionalId, periodo } }
    })

    if (existente?.aprobada) {
      res.status(400).json({ error: 'La liquidación de este período ya está aprobada' })
      return
    }

    const produccion = await calcularProduccion(req.tenantId!, profesionalId, periodo)
    const vales = await valesPendientesDelPeriodo(req.tenantId!, profesionalId, periodo)
    const porcentaje = Number(profesional.porcentaje ?? 0)
    const comision = (produccion * porcentaje) / 100

    const cargasSocialesNum = Number(cargasSociales ?? 0)
    const descuentosNum = Number(descuentos ?? 0)
    const otrosNum = Number(otros ?? 0)

    const sueldoNeto = comision - vales - cargasSocialesNum - descuentosNum - otrosNum

    const liquidacion = await prisma.liquidacion.upsert({
      where: { profesionalId_periodo: { profesionalId, periodo } },
      create: {
        tenantId: req.tenantId!,
        profesionalId,
        periodo,
        produccion,
        comision,
        vales,
        cargasSociales: cargasSocialesNum,
        descuentos: descuentosNum,
        otros: otrosNum,
        notas,
        sueldoNeto,
        aprobada: false
      },
      update: {
        produccion,
        comision,
        vales,
        cargasSociales: cargasSocialesNum,
        descuentos: descuentosNum,
        otros: otrosNum,
        notas,
        sueldoNeto
      },
      include: { profesional: true }
    })

    res.json(liquidacion)
  } catch {
    res.status(500).json({ error: 'Error al guardar el borrador' })
  }
}

export const aprobarLiquidacion = async (req: AuthRequest, res: Response) => {
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

      if (liquidacion.aprobada) {
        throw new Error('LIQUIDACION_YA_APROBADA')
      }

      const actualizada = await tx.liquidacion.update({
        where: { id },
        data: { aprobada: true },
        include: { profesional: true }
      })

      await tx.vale.updateMany({
        where: {
          tenantId: req.tenantId,
          profesionalId: liquidacion.profesionalId,
          periodo: liquidacion.periodo,
          descontado: false
        },
        data: { descontado: true }
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
    if (error.message === 'LIQUIDACION_YA_APROBADA') {
      res.status(400).json({ error: 'La liquidación ya está aprobada' })
      return
    }
    res.status(500).json({ error: 'Error al aprobar liquidación' })
  }
}
