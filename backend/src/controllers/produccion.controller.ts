import { Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from '../middleware/auth.js'

function rangoDelDia(fecha: string) {
  const inicio = new Date(`${fecha}T00:00:00.000Z`)
  const fin = new Date(inicio)
  fin.setUTCDate(fin.getUTCDate() + 1)
  return { inicio, fin }
}

export const obtenerProduccionDiaria = async (req: AuthRequest, res: Response) => {
  const fecha = (req.query.fecha as string) || new Date().toISOString().slice(0, 10)

  try {
    const { inicio, fin } = rangoDelDia(fecha)

    const ordenes = await prisma.orden.findMany({
      where: {
        tenantId: req.tenantId,
        fecha: { gte: inicio, lt: fin }
      },
      include: {
        cliente: true,
        profesional: true,
        items: { include: { servicio: true } },
        pagos: true
      },
      orderBy: { id: 'asc' }
    })

    const gruposPorProfesional = new Map<number, {
      profesional: { id: number; nombre: string; apellido: string; tipo: string }
      ordenes: {
        id: number
        cliente: string
        items: { descripcion: string; cantidad: number }[]
        metodos: string[]
        estado: string
        monto: number
      }[]
      totalOrdenes: number
      totalMonto: number
    }>()

    for (const orden of ordenes) {
      if (!orden.profesional.activo) continue

      const monto = orden.items.reduce(
        (suma, item) => suma + Number(item.precioAplicado) * item.cantidad,
        0
      )

      if (!gruposPorProfesional.has(orden.profesionalId)) {
        gruposPorProfesional.set(orden.profesionalId, {
          profesional: {
            id: orden.profesional.id,
            nombre: orden.profesional.nombre,
            apellido: orden.profesional.apellido,
            tipo: orden.profesional.tipo
          },
          ordenes: [],
          totalOrdenes: 0,
          totalMonto: 0
        })
      }

      const grupo = gruposPorProfesional.get(orden.profesionalId)!
      grupo.ordenes.push({
        id: orden.id,
        cliente: `${orden.cliente.nombre} ${orden.cliente.apellido}`,
        items: orden.items.map((item) => ({ descripcion: item.descripcion, cantidad: item.cantidad })),
        metodos: orden.pagos.map((p) => p.metodo),
        estado: orden.estado,
        monto
      })
      grupo.totalOrdenes += 1
      grupo.totalMonto += monto
    }

    const grupos = Array.from(gruposPorProfesional.values()).sort((a, b) =>
      `${a.profesional.nombre} ${a.profesional.apellido}`.localeCompare(
        `${b.profesional.nombre} ${b.profesional.apellido}`
      )
    )

    const totalDia = grupos.reduce((suma, g) => suma + g.totalMonto, 0)
    const totalOrdenesDia = grupos.reduce((suma, g) => suma + g.totalOrdenes, 0)

    const numerosOrden = ordenes.map((o) => o.id).sort((a, b) => a - b)
    const huecos: number[] = []
    for (let i = 1; i < numerosOrden.length; i++) {
      for (let n = numerosOrden[i - 1] + 1; n < numerosOrden[i]; n++) {
        huecos.push(n)
      }
    }

    res.json({
      fecha,
      grupos,
      totalDia,
      totalOrdenesDia,
      numerosOrden,
      huecos
    })
  } catch {
    res.status(500).json({ error: 'Error al obtener la producción diaria' })
  }
}
