import { Router } from 'express'
import { authMiddleware, requireRol } from '../middleware/auth.js'
import { listarGastos, crearGasto, eliminarGasto, resumenPeriodo } from '../controllers/gastos-admin.controller.js'

const router = Router()

router.use(authMiddleware)
router.use(requireRol('ADMINISTRADOR', 'OFICINA'))

router.get('/', listarGastos)
router.post('/', crearGasto)
router.delete('/:id', eliminarGasto)
router.get('/resumen', resumenPeriodo)

export default router
