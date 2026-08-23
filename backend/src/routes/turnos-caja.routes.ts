import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import {
  abrirTurno,
  cerrarTurno,
  obtenerTurnoActivo,
  obtenerResumenTurno,
  listarTurnos
} from '../controllers/turnos-caja.controller.js'

const router = Router()

router.use(authMiddleware)

router.get('/activo', obtenerTurnoActivo)
router.post('/abrir', abrirTurno)
router.post('/:id/cerrar', cerrarTurno)
router.get('/:id/resumen', obtenerResumenTurno)
router.get('/', listarTurnos)

export default router
