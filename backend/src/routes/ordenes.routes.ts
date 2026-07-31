import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import {
  crearOrden,
  agregarItem,
  obtenerOrden,
  listarOrdenes,
  cobrarOrden,
  anularOrden
} from '../controllers/ordenes.controller.js'

const router = Router()

router.use(authMiddleware)

router.post('/', crearOrden)
router.post('/:id/items', agregarItem)
router.get('/:id', obtenerOrden)
router.get('/', listarOrdenes)
router.post('/:id/cobrar', cobrarOrden)
router.post('/:id/anular', anularOrden)

export default router
