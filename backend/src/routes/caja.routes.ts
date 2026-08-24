import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { listarCaja, registrarMovimiento, eliminarMovimiento } from '../controllers/caja.controller.js'

const router = Router()

router.use(authMiddleware)

router.get('/', listarCaja)
router.post('/', registrarMovimiento)
router.delete('/:id', eliminarMovimiento)

export default router
