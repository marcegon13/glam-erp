import { Response } from 'express'
import { Prisma } from '../../generated/prisma/index.js'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from '../middleware/auth.js'

const UNIDADES = ['gr', 'ml', 'unidad', 'litro']

function hoyDate(): Date {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

/** Aplica una compra: movimiento COMPRA, suma al depósito y egreso en caja si corresponde. */
async function aplicarCompra(
  tx: Prisma.TransactionClient,
  params: {
    tenantId: number
    productoId: number
    cantidad: number
    precioUnitario: number
    concepto?: string | null
    creadoPor: number
    nombreProducto: string
  }
) {
  const { tenantId, productoId, cantidad, precioUnitario, concepto, creadoPor, nombreProducto } = params

  await tx.movimientoStock.create({
    data: {
      tenantId,
      productoId,
      tipo: 'COMPRA',
      cantidad,
      origen: 'depósito',
      concepto: concepto ?? null,
      creadoPor
    }
  })

  await tx.stockDeposito.upsert({
    where: { tenantId_productoId: { tenantId, productoId } },
    create: { tenantId, productoId, cantidad },
    update: { cantidad: { increment: cantidad } }
  })

  const monto = cantidad * precioUnitario
  if (monto > 0) {
    await tx.caja.create({
      data: {
        tenantId,
        tipo: 'EGRESO',
        metodo: 'EFECTIVO',
        monto,
        concepto: `Compra stock: ${nombreProducto}`
      }
    })
  }

  return monto
}

/* ── Productos (catálogo) ──────────────────────────────────────────────── */

export const listarProductos = async (req: AuthRequest, res: Response) => {
  try {
    const productos = await prisma.producto.findMany({
      where: { tenantId: req.tenantId },
      orderBy: { nombre: 'asc' }
    })
    res.json(productos)
  } catch {
    res.status(500).json({ error: 'Error al listar productos' })
  }
}

export const crearProducto = async (req: AuthRequest, res: Response) => {
  const { nombre, marca, unidad, precioUnitario, stockMinimo } = req.body

  if (!nombre || !marca || !unidad || precioUnitario == null) {
    res.status(400).json({ error: 'Nombre, marca, unidad y precio unitario son requeridos' })
    return
  }
  if (!UNIDADES.includes(unidad)) {
    res.status(400).json({ error: `Unidad inválida. Usar: ${UNIDADES.join(', ')}` })
    return
  }

  try {
    const producto = await prisma.producto.create({
      data: {
        tenantId: req.tenantId!,
        nombre,
        marca,
        unidad,
        precioUnitario,
        stockMinimo: Number(stockMinimo) || 0
      }
    })

    await prisma.stockDeposito.create({
      data: { tenantId: req.tenantId!, productoId: producto.id, cantidad: 0 }
    })

    res.status(201).json(producto)
  } catch {
    res.status(500).json({ error: 'Error al crear el producto' })
  }
}

export const editarProducto = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)
  const { nombre, marca, unidad, precioUnitario, stockMinimo, activo } = req.body

  if (unidad && !UNIDADES.includes(unidad)) {
    res.status(400).json({ error: `Unidad inválida. Usar: ${UNIDADES.join(', ')}` })
    return
  }

  try {
    const resultado = await prisma.producto.updateMany({
      where: { id, tenantId: req.tenantId },
      data: {
        ...(nombre !== undefined ? { nombre } : {}),
        ...(marca !== undefined ? { marca } : {}),
        ...(unidad !== undefined ? { unidad } : {}),
        ...(precioUnitario !== undefined ? { precioUnitario } : {}),
        ...(stockMinimo !== undefined ? { stockMinimo: Number(stockMinimo) || 0 } : {}),
        ...(activo !== undefined ? { activo: Boolean(activo) } : {})
      }
    })

    if (resultado.count === 0) {
      res.status(404).json({ error: 'Producto no encontrado' })
      return
    }

    res.json({ message: 'Producto actualizado' })
  } catch {
    res.status(500).json({ error: 'Error al editar el producto' })
  }
}

/* ── Depósito ──────────────────────────────────────────────────────────── */

export const obtenerStockDeposito = async (req: AuthRequest, res: Response) => {
  try {
    const productos = await prisma.producto.findMany({
      where: { tenantId: req.tenantId, activo: true },
      orderBy: { nombre: 'asc' },
      include: { stockDeposito: true }
    })

    const filas = productos.map((p) => {
      const cantidad = Number(p.stockDeposito[0]?.cantidad ?? 0)
      return {
        id: p.id,
        nombre: p.nombre,
        marca: p.marca,
        unidad: p.unidad,
        precioUnitario: Number(p.precioUnitario),
        stockMinimo: p.stockMinimo,
        cantidad,
        bajoMinimo: cantidad < p.stockMinimo
      }
    })

    res.json(filas)
  } catch {
    res.status(500).json({ error: 'Error al obtener el stock de depósito' })
  }
}

export const registrarCompra = async (req: AuthRequest, res: Response) => {
  const { productoId, cantidad, precioUnitario, concepto } = req.body

  if (!productoId || !cantidad || Number(cantidad) <= 0) {
    res.status(400).json({ error: 'Producto y cantidad (mayor a 0) son requeridos' })
    return
  }

  try {
    const producto = await prisma.producto.findFirst({
      where: { id: Number(productoId), tenantId: req.tenantId }
    })
    if (!producto) {
      res.status(404).json({ error: 'Producto no encontrado' })
      return
    }

    const precio = precioUnitario != null ? Number(precioUnitario) : Number(producto.precioUnitario)

    const monto = await prisma.$transaction((tx) =>
      aplicarCompra(tx, {
        tenantId: req.tenantId!,
        productoId: producto.id,
        cantidad: Number(cantidad),
        precioUnitario: precio,
        concepto,
        creadoPor: req.userId!,
        nombreProducto: producto.nombre
      })
    )

    res.status(201).json({ message: 'Compra registrada', monto })
  } catch {
    res.status(500).json({ error: 'Error al registrar la compra' })
  }
}

export const bajarAlLaboratorio = async (req: AuthRequest, res: Response) => {
  const { productoId, cantidad, concepto } = req.body

  if (!productoId || !cantidad || Number(cantidad) <= 0) {
    res.status(400).json({ error: 'Producto y cantidad (mayor a 0) son requeridos' })
    return
  }

  try {
    const producto = await prisma.producto.findFirst({
      where: { id: Number(productoId), tenantId: req.tenantId }
    })
    if (!producto) {
      res.status(404).json({ error: 'Producto no encontrado' })
      return
    }

    const cant = Number(cantidad)
    const enDeposito = await prisma.stockDeposito.findUnique({
      where: { tenantId_productoId: { tenantId: req.tenantId!, productoId: producto.id } }
    })

    if (Number(enDeposito?.cantidad ?? 0) < cant) {
      res.status(400).json({ error: 'No hay stock suficiente en depósito' })
      return
    }

    const fecha = hoyDate()

    await prisma.$transaction(async (tx) => {
      await tx.movimientoStock.create({
        data: {
          tenantId: req.tenantId!,
          productoId: producto.id,
          tipo: 'SALIDA_LABORATORIO',
          cantidad: cant,
          origen: 'depósito',
          concepto: concepto ?? null,
          creadoPor: req.userId!
        }
      })

      await tx.stockDeposito.update({
        where: { tenantId_productoId: { tenantId: req.tenantId!, productoId: producto.id } },
        data: { cantidad: { decrement: cant } }
      })

      await tx.stockLaboratorio.upsert({
        where: {
          tenantId_productoId_fecha: { tenantId: req.tenantId!, productoId: producto.id, fecha }
        },
        create: { tenantId: req.tenantId!, productoId: producto.id, cantidad: cant, fecha },
        update: { cantidad: { increment: cant } }
      })
    })

    res.status(201).json({ message: 'Producto enviado al laboratorio' })
  } catch {
    res.status(500).json({ error: 'Error al bajar el producto al laboratorio' })
  }
}

export const obtenerStockLaboratorio = async (req: AuthRequest, res: Response) => {
  const fechaQuery = String(req.query.fecha ?? '')
  const fecha = fechaQuery ? new Date(`${fechaQuery}T00:00:00.000Z`) : hoyDate()

  try {
    const filas = await prisma.stockLaboratorio.findMany({
      where: { tenantId: req.tenantId, fecha },
      include: { producto: true },
      orderBy: { producto: { nombre: 'asc' } }
    })

    res.json(
      filas.map((f) => ({
        id: f.id,
        productoId: f.productoId,
        nombre: f.producto.nombre,
        marca: f.producto.marca,
        unidad: f.producto.unidad,
        cantidad: Number(f.cantidad),
        fecha: f.fecha
      }))
    )
  } catch {
    res.status(500).json({ error: 'Error al obtener el stock del laboratorio' })
  }
}

/* ── Pedidos ───────────────────────────────────────────────────────────── */

export const crearPedido = async (req: AuthRequest, res: Response) => {
  const { productoId, cantidad, motivo } = req.body

  if (!productoId || !cantidad || Number(cantidad) <= 0) {
    res.status(400).json({ error: 'Producto y cantidad (mayor a 0) son requeridos' })
    return
  }

  try {
    const producto = await prisma.producto.findFirst({
      where: { id: Number(productoId), tenantId: req.tenantId }
    })
    if (!producto) {
      res.status(404).json({ error: 'Producto no encontrado' })
      return
    }

    const pedido = await prisma.pedidoStock.create({
      data: {
        tenantId: req.tenantId!,
        productoId: producto.id,
        cantidad: Number(cantidad),
        motivo: motivo ?? null,
        estado: 'PENDIENTE',
        creadoPor: req.userId!
      }
    })

    res.status(201).json(pedido)
  } catch {
    res.status(500).json({ error: 'Error al crear el pedido' })
  }
}

export const listarPedidos = async (req: AuthRequest, res: Response) => {
  const { estado } = req.query

  try {
    const pedidos = await prisma.pedidoStock.findMany({
      where: {
        tenantId: req.tenantId,
        ...(estado ? { estado: estado as any } : {})
      },
      include: { producto: true },
      orderBy: { creadoEn: 'desc' }
    })

    const userIds = [
      ...new Set(pedidos.flatMap((p) => [p.creadoPor, p.autorizadoPor].filter((x): x is number => x != null)))
    ]
    const usuarios = userIds.length
      ? await prisma.usuario.findMany({ where: { id: { in: userIds } }, select: { id: true, nombre: true } })
      : []
    const nombrePorId = new Map(usuarios.map((u) => [u.id, u.nombre]))

    res.json(
      pedidos.map((p) => ({
        id: p.id,
        productoId: p.productoId,
        producto: p.producto.nombre,
        marca: p.producto.marca,
        unidad: p.producto.unidad,
        cantidad: Number(p.cantidad),
        motivo: p.motivo,
        estado: p.estado,
        creadoPor: nombrePorId.get(p.creadoPor) ?? null,
        autorizadoPor: p.autorizadoPor ? nombrePorId.get(p.autorizadoPor) ?? null : null,
        creadoEn: p.creadoEn,
        actualizadoEn: p.actualizadoEn
      }))
    )
  } catch {
    res.status(500).json({ error: 'Error al listar los pedidos' })
  }
}

export const aprobarPedido = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)

  try {
    const pedido = await prisma.pedidoStock.findFirst({
      where: { id, tenantId: req.tenantId },
      include: { producto: true }
    })

    if (!pedido) {
      res.status(404).json({ error: 'Pedido no encontrado' })
      return
    }
    if (pedido.estado !== 'PENDIENTE') {
      res.status(400).json({ error: 'El pedido ya fue resuelto' })
      return
    }

    await prisma.$transaction(async (tx) => {
      await aplicarCompra(tx, {
        tenantId: req.tenantId!,
        productoId: pedido.productoId,
        cantidad: Number(pedido.cantidad),
        precioUnitario: Number(pedido.producto.precioUnitario),
        concepto: `Pedido #${pedido.id} aprobado`,
        creadoPor: req.userId!,
        nombreProducto: pedido.producto.nombre
      })

      await tx.pedidoStock.update({
        where: { id },
        data: { estado: 'APROBADO', autorizadoPor: req.userId! }
      })
    })

    res.json({ message: 'Pedido aprobado y compra registrada' })
  } catch {
    res.status(500).json({ error: 'Error al aprobar el pedido' })
  }
}

export const rechazarPedido = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)

  try {
    const pedido = await prisma.pedidoStock.findFirst({ where: { id, tenantId: req.tenantId } })

    if (!pedido) {
      res.status(404).json({ error: 'Pedido no encontrado' })
      return
    }
    if (pedido.estado !== 'PENDIENTE') {
      res.status(400).json({ error: 'El pedido ya fue resuelto' })
      return
    }

    await prisma.pedidoStock.update({
      where: { id },
      data: { estado: 'RECHAZADO', autorizadoPor: req.userId! }
    })

    res.json({ message: 'Pedido rechazado' })
  } catch {
    res.status(500).json({ error: 'Error al rechazar el pedido' })
  }
}

/* ── Inventario físico ─────────────────────────────────────────────────── */

export const inventarioFisico = async (req: AuthRequest, res: Response) => {
  const { productoId, cantidadReal } = req.body

  if (!productoId || cantidadReal == null || Number(cantidadReal) < 0) {
    res.status(400).json({ error: 'Producto y cantidad real (no negativa) son requeridos' })
    return
  }

  try {
    const producto = await prisma.producto.findFirst({
      where: { id: Number(productoId), tenantId: req.tenantId }
    })
    if (!producto) {
      res.status(404).json({ error: 'Producto no encontrado' })
      return
    }

    const real = Number(cantidadReal)
    const actualRow = await prisma.stockDeposito.findUnique({
      where: { tenantId_productoId: { tenantId: req.tenantId!, productoId: producto.id } }
    })
    const actual = Number(actualRow?.cantidad ?? 0)
    const diferencia = real - actual

    await prisma.$transaction(async (tx) => {
      await tx.movimientoStock.create({
        data: {
          tenantId: req.tenantId!,
          productoId: producto.id,
          tipo: 'AJUSTE',
          cantidad: diferencia,
          origen: 'depósito',
          concepto: `Inventario físico (contado ${real}, sistema ${actual})`,
          creadoPor: req.userId!
        }
      })

      await tx.stockDeposito.upsert({
        where: { tenantId_productoId: { tenantId: req.tenantId!, productoId: producto.id } },
        create: { tenantId: req.tenantId!, productoId: producto.id, cantidad: real },
        update: { cantidad: real }
      })
    })

    res.json({ message: 'Inventario ajustado', diferencia })
  } catch {
    res.status(500).json({ error: 'Error al registrar el inventario físico' })
  }
}
