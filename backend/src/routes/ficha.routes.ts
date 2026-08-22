import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { agregarTrabajo, editarUltimoTrabajo, listarTrabajos } from '../controllers/ficha.controller.js'

const router = Router()

router.use(authMiddleware)

router.post('/', agregarTrabajo)
router.put('/:clienteId/ultimo', editarUltimoTrabajo)
router.get('/:clienteId', listarTrabajos)

export default router
