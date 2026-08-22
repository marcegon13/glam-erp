import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { listarCaja, registrarMovimiento } from '../controllers/caja.controller.js'

const router = Router()

router.use(authMiddleware)

router.get('/', listarCaja)
router.post('/', registrarMovimiento)

export default router
