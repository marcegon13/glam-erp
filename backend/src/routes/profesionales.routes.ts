import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import {
  listarProfesionales,
  crearProfesional,
  editarProfesional,
  eliminarProfesional
} from '../controllers/profesionales.controller.js'

const router = Router()

router.use(authMiddleware)

router.get('/', listarProfesionales)
router.post('/', crearProfesional)
router.put('/:id', editarProfesional)
router.delete('/:id', eliminarProfesional)

export default router
