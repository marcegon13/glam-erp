import { Router } from 'express'
import { registrarTenant, login } from '../controllers/auth.controller.js'

const router = Router()

router.post('/registro', registrarTenant)
router.post('/login', login)

export default router
