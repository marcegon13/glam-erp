import { Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from '../middleware/auth.js'

export const listarClientes = async (req: AuthRequest, res: Response) => {
  const { busqueda, page, limit } = req.query

  const paginado = page !== undefined
  const take = paginado ? Number(limit) || 10 : 20
  const skip = paginado ? Math.max(Number(page) - 1, 0) * take : 0

  try {
    const where = {
      tenantId: req.tenantId,
      activo: true,
      ...(busqueda
        ? {
            OR: [
              { nombre: { contains: busqueda as string, mode: 'insensitive' as const } },
              { apellido: { contains: busqueda as string, mode: 'insensitive' as const } },
              { telefono: { contains: busqueda as string, mode: 'insensitive' as const } }
            ]
          }
        : {})
    }

    const [clientes, total] = await Promise.all([
      prisma.cliente.findMany({
        where,
        orderBy: { apellido: 'asc' },
        take,
        skip,
        include: {
          ordenes: {
            where: { estado: 'COBRADA' },
            orderBy: { fecha: 'desc' },
            take: 1,
            select: { fecha: true }
          },
          fichaTrabajos: {
            orderBy: [{ fecha: 'desc' }, { creadoEn: 'desc' }],
            take: 1
          }
        }
      }),
      paginado ? prisma.cliente.count({ where }) : Promise.resolve(undefined)
    ])

    const resultado = clientes.map(({ ordenes, fichaTrabajos, ...resto }) => ({
      ...resto,
      ultimaVisita: ordenes[0]?.fecha ?? null,
      ultimoTrabajo: fichaTrabajos[0] ?? null
    }))

    if (paginado) {
      res.json({ data: resultado, total, page: Number(page), limit: take })
    } else {
      res.json(resultado)
    }
  } catch {
    res.status(500).json({ error: 'Error al listar clientes' })
  }
}

export const buscarAvanzado = async (req: AuthRequest, res: Response) => {
  const { q } = req.query
  const tokens = String(q ?? '').trim().split(/\s+/).filter(Boolean)

  if (tokens.length === 0) {
    res.json([])
    return
  }

  try {
    const clientes = await prisma.cliente.findMany({
      where: {
        tenantId: req.tenantId,
        activo: true,
        AND: tokens.map((token) => ({
          OR: [
            { nombre: { contains: token, mode: 'insensitive' as const } },
            { apellido: { contains: token, mode: 'insensitive' as const } },
            { telefono: { contains: token, mode: 'insensitive' as const } }
          ]
        }))
      },
      orderBy: { apellido: 'asc' },
      take: 20,
      include: {
        ordenes: {
          where: { estado: 'COBRADA' },
          orderBy: { fecha: 'desc' },
          take: 1,
          select: { fecha: true }
        },
        fichaTrabajos: {
          orderBy: [{ fecha: 'desc' }, { creadoEn: 'desc' }],
          take: 1
        }
      }
    })

    const resultado = clientes.map(({ ordenes, fichaTrabajos, ...resto }) => ({
      ...resto,
      ultimaVisita: ordenes[0]?.fecha ?? null,
      ultimoTrabajo: fichaTrabajos[0] ?? null
    }))

    res.json(resultado)
  } catch {
    res.status(500).json({ error: 'Error al buscar clientes' })
  }
}

export const obtenerFicha = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)

  try {
    const cliente = await prisma.cliente.findFirst({
      where: { id, tenantId: req.tenantId },
      include: {
        ordenes: {
          where: { estado: 'COBRADA' },
          orderBy: { fecha: 'desc' },
          include: {
            profesional: true,
            items: { include: { servicio: true } }
          }
        },
        fichaTrabajos: {
          orderBy: [{ fecha: 'desc' }, { creadoEn: 'desc' }]
        }
      }
    })

    if (!cliente) {
      res.status(404).json({ error: 'Cliente no encontrado' })
      return
    }

    res.json(cliente)
  } catch {
    res.status(500).json({ error: 'Error al obtener la ficha del cliente' })
  }
}

const TIPOS_CLIENTE = ['EXISTENTE', 'NUEVO', 'RECOMENDADO'] as const

export const crearCliente = async (req: AuthRequest, res: Response) => {
  const { nombre, apellido, telefono, email, tipoCliente, recomendadoPor } = req.body

  if (!nombre || !apellido) {
    res.status(400).json({ error: 'Nombre y apellido son requeridos' })
    return
  }

  const tipo = TIPOS_CLIENTE.includes(tipoCliente) ? tipoCliente : 'EXISTENTE'

  try {
    const cliente = await prisma.cliente.create({
      data: {
        tenantId: req.tenantId!,
        nombre,
        apellido,
        telefono,
        email,
        tipoCliente: tipo,
        recomendadoPor: tipo === 'RECOMENDADO' ? recomendadoPor || null : null
      }
    })

    res.status(201).json(cliente)
  } catch {
    res.status(500).json({ error: 'Error al crear cliente' })
  }
}

export const obtenerCliente = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)

  try {
    const cliente = await prisma.cliente.findFirst({
      where: { id, tenantId: req.tenantId },
      include: {
        ordenes: {
          where: { estado: 'COBRADA' },
          orderBy: { fecha: 'desc' },
          take: 5,
          include: {
            profesional: true,
            items: true
          }
        }
      }
    })

    if (!cliente) {
      res.status(404).json({ error: 'Cliente no encontrado' })
      return
    }

    res.json(cliente)
  } catch {
    res.status(500).json({ error: 'Error al obtener cliente' })
  }
}

export const editarCliente = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)
  const { nombre, apellido, telefono, email } = req.body

  try {
    const resultado = await prisma.cliente.updateMany({
      where: { id, tenantId: req.tenantId },
      data: { nombre, apellido, telefono, email }
    })

    if (resultado.count === 0) {
      res.status(404).json({ error: 'Cliente no encontrado' })
      return
    }

    res.json({ message: 'Cliente actualizado' })
  } catch {
    res.status(500).json({ error: 'Error al editar cliente' })
  }
}

export const eliminarCliente = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)

  try {
    const resultado = await prisma.cliente.updateMany({
      where: { id, tenantId: req.tenantId },
      data: { activo: false }
    })

    if (resultado.count === 0) {
      res.status(404).json({ error: 'Cliente no encontrado' })
      return
    }

    res.json({ message: 'Cliente eliminado' })
  } catch {
    res.status(500).json({ error: 'Error al eliminar cliente' })
  }
}
