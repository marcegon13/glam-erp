import { Router } from 'express'
import { authMiddleware, requireRol } from '../middleware/auth.js'
import {
  listarUsuarios,
  crearUsuario,
  editarUsuario,
  cambiarEstado
} from '../controllers/usuarios.controller.js'

const router = Router()

router.use(authMiddleware)
router.use(requireRol('ADMINISTRADOR'))

router.get('/', listarUsuarios)
router.post('/', crearUsuario)
router.put('/:id', editarUsuario)
router.put('/:id/estado', cambiarEstado)

export default router
