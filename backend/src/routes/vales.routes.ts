import { Router } from 'express'
import { authMiddleware, requireRol } from '../middleware/auth.js'
import { listarVales, crearVale, eliminarVale } from '../controllers/vales.controller.js'

const router = Router()

router.use(authMiddleware)
router.use(requireRol('ADMINISTRADOR', 'OFICINA'))

router.get('/', listarVales)
router.post('/', crearVale)
router.delete('/:id', eliminarVale)

export default router
