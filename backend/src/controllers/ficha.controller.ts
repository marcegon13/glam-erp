import { Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from '../middleware/auth.js'

export const agregarTrabajo = async (req: AuthRequest, res: Response) => {
  const { clienteId, trabajoRealizado, estilista, fecha } = req.body

  if (!clienteId || !trabajoRealizado || !estilista || !fecha) {
    res.status(400).json({ error: 'Cliente, trabajo realizado, estilista y fecha son requeridos' })
    return
  }

  try {
    const cliente = await prisma.cliente.findFirst({
      where: { id: clienteId, tenantId: req.tenantId }
    })

    if (!cliente) {
      res.status(404).json({ error: 'Cliente no encontrado' })
      return
    }

    const trabajo = await prisma.fichaTrabajo.create({
      data: {
        tenantId: req.tenantId!,
        clienteId,
        trabajoRealizado,
        estilista,
        fecha: new Date(`${fecha}T00:00:00.000Z`)
      }
    })

    res.status(201).json(trabajo)
  } catch {
    res.status(500).json({ error: 'Error al agregar el trabajo' })
  }
}

export const editarUltimoTrabajo = async (req: AuthRequest, res: Response) => {
  const clienteId = Number(req.params.clienteId)
  const { trabajoRealizado, estilista, fecha } = req.body

  try {
    const ultimo = await prisma.fichaTrabajo.findFirst({
      where: { clienteId, tenantId: req.tenantId },
      orderBy: [{ fecha: 'desc' }, { creadoEn: 'desc' }]
    })

    if (!ultimo) {
      res.status(404).json({ error: 'Este cliente no tiene trabajos registrados' })
      return
    }

    const trabajo = await prisma.fichaTrabajo.update({
      where: { id: ultimo.id },
      data: {
        trabajoRealizado: trabajoRealizado ?? ultimo.trabajoRealizado,
        estilista: estilista ?? ultimo.estilista,
        fecha: fecha ? new Date(`${fecha}T00:00:00.000Z`) : ultimo.fecha
      }
    })

    res.json(trabajo)
  } catch {
    res.status(500).json({ error: 'Error al editar el trabajo' })
  }
}

export const importarTrabajos = async (req: AuthRequest, res: Response) => {
  const filas = Array.isArray(req.body) ? req.body : req.body?.trabajos

  if (!Array.isArray(filas) || filas.length === 0) {
    res.status(400).json({ error: 'Se esperaba un array de trabajos' })
    return
  }

  const creados: number[] = []
  const omitidos: { fila: number; motivo: string }[] = []

  try {
    for (let i = 0; i < filas.length; i++) {
      const fila = filas[i] ?? {}
      const nombreCliente = String(fila.nombreCliente ?? fila.nombre_cliente ?? '').trim()
      const apellidoCliente = String(fila.apellidoCliente ?? fila.apellido_cliente ?? '').trim()
      const trabajoRealizado = String(fila.trabajoRealizado ?? fila.trabajo_realizado ?? '').trim()
      const estilista = String(fila.estilista ?? '').trim()
      const fechaStr = String(fila.fecha ?? '').trim()

      if (!nombreCliente || !apellidoCliente || !trabajoRealizado || !estilista || !fechaStr) {
        omitidos.push({ fila: i + 1, motivo: 'Faltan campos requeridos' })
        continue
      }

      const fecha = new Date(`${fechaStr}T00:00:00.000Z`)
      if (isNaN(fecha.getTime())) {
        omitidos.push({ fila: i + 1, motivo: `Fecha inválida: ${fechaStr}` })
        continue
      }

      const cliente = await prisma.cliente.findFirst({
        where: {
          tenantId: req.tenantId,
          nombre: { equals: nombreCliente, mode: 'insensitive' },
          apellido: { equals: apellidoCliente, mode: 'insensitive' }
        }
      })

      if (!cliente) {
        omitidos.push({ fila: i + 1, motivo: `Cliente no encontrado: ${nombreCliente} ${apellidoCliente}` })
        continue
      }

      const trabajo = await prisma.fichaTrabajo.create({
        data: {
          tenantId: req.tenantId!,
          clienteId: cliente.id,
          trabajoRealizado,
          estilista,
          fecha
        }
      })

      creados.push(trabajo.id)
    }

    res.status(201).json({
      total: filas.length,
      creados: creados.length,
      omitidos: omitidos.length,
      detalleOmitidos: omitidos
    })
  } catch {
    res.status(500).json({ error: 'Error al importar trabajos' })
  }
}

export const listarTrabajos = async (req: AuthRequest, res: Response) => {
  const clienteId = Number(req.params.clienteId)

  try {
    const trabajos = await prisma.fichaTrabajo.findMany({
      where: { clienteId, tenantId: req.tenantId },
      orderBy: [{ fecha: 'desc' }, { creadoEn: 'desc' }]
    })

    res.json(trabajos)
  } catch {
    res.status(500).json({ error: 'Error al listar los trabajos' })
  }
}
