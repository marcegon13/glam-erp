import { Router } from 'express'
import { authMiddleware, requireRol } from '../middleware/auth.js'
import {
  agregarTrabajo,
  editarUltimoTrabajo,
  importarTrabajos,
  listarTrabajos
} from '../controllers/ficha.controller.js'

const router = Router()

router.use(authMiddleware)

router.post('/', agregarTrabajo)
router.post('/importar', requireRol('ADMINISTRADOR'), importarTrabajos)
router.put('/:clienteId/ultimo', editarUltimoTrabajo)
router.get('/:clienteId', listarTrabajos)

export default router
