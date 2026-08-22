import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import {
  listarTurnos,
  crearTurno,
  obtenerTurno,
  editarTurno,
  confirmarTurno,
  cancelarTurno,
  archivarViejos
} from '../controllers/turnos.controller.js'

const router = Router()

router.use(authMiddleware)

router.get('/', listarTurnos)
router.post('/', crearTurno)
router.get('/:id', obtenerTurno)
router.put('/:id', editarTurno)
router.post('/:id/confirmar', confirmarTurno)
router.post('/:id/cancelar', cancelarTurno)
router.post('/archivar', archivarViejos)

export default router
