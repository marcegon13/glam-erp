import { Router } from 'express'
import { authMiddleware, requireRol } from '../middleware/auth.js'
import { obtenerProduccionDiaria } from '../controllers/produccion.controller.js'

const router = Router()

router.use(authMiddleware)

router.get('/diaria', requireRol('ADMINISTRADOR', 'OFICINA'), obtenerProduccionDiaria)

export default router
