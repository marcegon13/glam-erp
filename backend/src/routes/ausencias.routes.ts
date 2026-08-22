import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { listarAusencias, toggleAusencia, eliminarAusencia } from '../controllers/ausencias.controller.js'

const router = Router()

router.use(authMiddleware)

router.get('/', listarAusencias)
router.post('/toggle', toggleAusencia)
router.delete('/:id', eliminarAusencia)

export default router
