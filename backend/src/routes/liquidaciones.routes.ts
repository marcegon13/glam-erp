import { Router } from 'express'
import { authMiddleware, requireRol } from '../middleware/auth.js'
import {
  resumenPeriodo,
  obtenerLegajo,
  guardarBorrador,
  aprobarLiquidacion
} from '../controllers/liquidaciones.controller.js'

const router = Router()

router.use(authMiddleware)
router.use(requireRol('ADMINISTRADOR', 'OFICINA'))

router.get('/periodo/:periodo', resumenPeriodo)
router.get('/legajo/:profesionalId/:periodo', obtenerLegajo)
router.post('/borrador', guardarBorrador)
router.post('/:id/aprobar', aprobarLiquidacion)

export default router
