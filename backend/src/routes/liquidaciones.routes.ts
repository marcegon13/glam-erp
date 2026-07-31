import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import {
  calcularLiquidacion,
  aprobarLiquidacion,
  aprobarCierre,
  listarLiquidaciones,
  obtenerLiquidacion
} from '../controllers/liquidaciones.controller.js'

const router = Router()

router.use(authMiddleware)

router.get('/', listarLiquidaciones)
router.get('/:id', obtenerLiquidacion)
router.post('/calcular', calcularLiquidacion)
router.post('/aprobar', aprobarLiquidacion)
router.post('/:id/cerrar', aprobarCierre)

export default router
