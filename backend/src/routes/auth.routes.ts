import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { registrarTenant, login, verificarPassword } from '../controllers/auth.controller.js'

const router = Router()

router.post('/registro', registrarTenant)
router.post('/login', login)
router.post('/verificar-password', authMiddleware, verificarPassword)

export default router
