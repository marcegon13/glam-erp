import { Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from '../middleware/auth.js'

function hoyUTC(): Date {
  const hoy = new Date()
  return new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()))
}

async function calcularResumen(tenantId: number, turno: {
  id: number
  fondoCambio: unknown
  abiertaEn: Date
  cerradaEn: Date | null
}) {
  const hasta = turno.cerradaEn ?? new Date()

  const movimientos = await prisma.caja.findMany({
    where: {
      tenantId,
      fecha: { gte: turno.abiertaEn, lte: hasta }
    }
  })

  const ingresos = movimientos.filter((m) => m.tipo === 'INGRESO')
  const egresos = movimientos.filter((m) => m.tipo === 'EGRESO')

  const sumaPorMetodo = (lista: typeof movimientos, metodo: string) =>
    lista.filter((m) => m.metodo === metodo).reduce((suma, m) => suma + Number(m.monto), 0)

  const porMetodo = {
    EFECTIVO: sumaPorMetodo(ingresos, 'EFECTIVO'),
    TARJETA: sumaPorMetodo(ingresos, 'TARJETA'),
    TRANSFERENCIA: sumaPorMetodo(ingresos, 'TRANSFERENCIA'),
    MERCADO_PAGO: sumaPorMetodo(ingresos, 'MERCADO_PAGO')
  }

  const totalIngresos = ingresos.reduce((suma, m) => suma + Number(m.monto), 0)
  const totalEgresos = egresos.reduce((suma, m) => suma + Number(m.monto), 0)
  const egresosEfectivo = sumaPorMetodo(egresos, 'EFECTIVO')

  const fondoCambio = Number(turno.fondoCambio)
  const efectivoEsperado = fondoCambio + porMetodo.EFECTIVO - egresosEfectivo

  return {
    porMetodo,
    totalIngresos,
    totalEgresos,
    egresosEfectivo,
    fondoCambio,
    efectivoEsperado
  }
}

export const abrirTurno = async (req: AuthRequest, res: Response) => {
  const { tipo, cajera, fondoCambio } = req.body

  if (!tipo || !cajera || fondoCambio == null) {
    res.status(400).json({ error: 'Tipo, cajera y fondo de cambio son requeridos' })
    return
  }

  try {
    const fecha = hoyUTC()

    const existente = await prisma.turnoCaja.findFirst({
      where: { tenantId: req.tenantId, tipo, fecha, estado: 'ABIERTO' }
    })

    if (existente) {
      res.status(400).json({ error: 'Ya hay un turno de este tipo abierto hoy' })
      return
    }

    const turno = await prisma.turnoCaja.create({
      data: {
        tenantId: req.tenantId!,
        tipo,
        fecha,
        cajera,
        fondoCambio,
        estado: 'ABIERTO',
        abiertoPor: req.userId!
      }
    })

    res.status(201).json(turno)
  } catch {
    res.status(500).json({ error: 'Error al abrir el turno' })
  }
}

export const cerrarTurno = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)
  const { efectivoContado, observaciones } = req.body

  if (efectivoContado == null) {
    res.status(400).json({ error: 'El efectivo contado es requerido' })
    return
  }

  try {
    const turno = await prisma.turnoCaja.findFirst({
      where: { id, tenantId: req.tenantId }
    })

    if (!turno) {
      res.status(404).json({ error: 'Turno no encontrado' })
      return
    }

    if (turno.estado !== 'ABIERTO') {
      res.status(400).json({ error: 'El turno ya está cerrado' })
      return
    }

    const cerradaEn = new Date()
    const resumen = await calcularResumen(req.tenantId!, { ...turno, cerradaEn })

    const diferencia = Number(efectivoContado) - resumen.efectivoEsperado

    const turnoActualizado = await prisma.turnoCaja.update({
      where: { id },
      data: {
        estado: 'CERRADO',
        efectivoContado,
        diferencia,
        observaciones,
        cerradoPor: req.userId!,
        cerradaEn
      }
    })

    res.json({ turno: turnoActualizado, resumen })
  } catch {
    res.status(500).json({ error: 'Error al cerrar el turno' })
  }
}

export const obtenerTurnoActivo = async (req: AuthRequest, res: Response) => {
  try {
    const turno = await prisma.turnoCaja.findFirst({
      where: { tenantId: req.tenantId, fecha: hoyUTC(), estado: 'ABIERTO' }
    })

    if (!turno) {
      res.json({ turno: null, resumen: null })
      return
    }

    const resumen = await calcularResumen(req.tenantId!, turno)

    res.json({ turno, resumen })
  } catch {
    res.status(500).json({ error: 'Error al obtener el turno activo' })
  }
}

export const obtenerResumenTurno = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)

  try {
    const turno = await prisma.turnoCaja.findFirst({
      where: { id, tenantId: req.tenantId }
    })

    if (!turno) {
      res.status(404).json({ error: 'Turno no encontrado' })
      return
    }

    const resumen = await calcularResumen(req.tenantId!, turno)

    res.json({ turno, resumen })
  } catch {
    res.status(500).json({ error: 'Error al obtener el resumen del turno' })
  }
}

export const listarTurnos = async (req: AuthRequest, res: Response) => {
  const { fecha } = req.query

  try {
    const filtroFecha = fecha ? new Date(`${fecha}T00:00:00.000Z`) : undefined

    const turnos = await prisma.turnoCaja.findMany({
      where: {
        tenantId: req.tenantId,
        ...(filtroFecha ? { fecha: filtroFecha } : {})
      },
      orderBy: { abiertaEn: 'desc' },
      take: 30
    })

    res.json(turnos)
  } catch {
    res.status(500).json({ error: 'Error al listar turnos' })
  }
}
