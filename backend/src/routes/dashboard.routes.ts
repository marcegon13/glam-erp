import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { obtenerKpis } from '../controllers/dashboard.controller.js'

const router = Router()

router.use(authMiddleware)

router.get('/kpis', obtenerKpis)

export default router
