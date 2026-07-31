import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import {
  listarServicios,
  crearServicio,
  editarServicio,
  eliminarServicio
} from '../controllers/servicios.controller.js'

const router = Router()

router.use(authMiddleware)

router.get('/', listarServicios)
router.post('/', crearServicio)
router.put('/:id', editarServicio)
router.delete('/:id', eliminarServicio)

export default router
