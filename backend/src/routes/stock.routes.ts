import { Router } from 'express'
import { authMiddleware, requireRol } from '../middleware/auth.js'
import {
  listarProductos,
  crearProducto,
  editarProducto,
  obtenerStockDeposito,
  registrarCompra,
  bajarAlLaboratorio,
  obtenerStockLaboratorio,
  crearPedido,
  listarPedidos,
  aprobarPedido,
  rechazarPedido,
  inventarioFisico
} from '../controllers/stock.controller.js'

const router = Router()

router.use(authMiddleware)

router.get('/productos', listarProductos)
router.post('/productos', crearProducto)
router.put('/productos/:id', editarProducto)

router.get('/deposito', obtenerStockDeposito)
router.post('/compra', registrarCompra)
router.post('/bajar-laboratorio', bajarAlLaboratorio)
router.post('/inventario', inventarioFisico)

router.get('/laboratorio', obtenerStockLaboratorio)

router.get('/pedidos', listarPedidos)
router.post('/pedidos', crearPedido)
router.post('/pedidos/:id/aprobar', requireRol('ADMINISTRADOR'), aprobarPedido)
router.post('/pedidos/:id/rechazar', rechazarPedido)

export default router
