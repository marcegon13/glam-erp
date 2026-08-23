import { Router } from 'express'
import { authMiddleware, requireRol } from '../middleware/auth.js'
import {
  listarProfesionales,
  crearProfesional,
  editarProfesional,
  eliminarProfesional
} from '../controllers/profesionales.controller.js'

const router = Router()

router.use(authMiddleware)

router.get('/', listarProfesionales)
router.post('/', requireRol('ADMINISTRADOR'), crearProfesional)
router.put('/:id', requireRol('ADMINISTRADOR'), editarProfesional)
router.delete('/:id', requireRol('ADMINISTRADOR'), eliminarProfesional)

export default router
