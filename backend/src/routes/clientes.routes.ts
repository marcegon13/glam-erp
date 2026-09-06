import { Router } from 'express'
import { authMiddleware, requireRol } from '../middleware/auth.js'
import {
  listarClientes,
  buscarAvanzado,
  crearCliente,
  importarClientes,
  obtenerCliente,
  obtenerFicha,
  editarCliente,
  eliminarCliente
} from '../controllers/clientes.controller.js'

const router = Router()

router.use(authMiddleware)

router.get('/', listarClientes)
router.post('/', crearCliente)
router.post('/importar', requireRol('ADMINISTRADOR'), importarClientes)
router.get('/buscar', buscarAvanzado)
router.get('/:id/ficha', obtenerFicha)
router.get('/:id', obtenerCliente)
router.put('/:id', editarCliente)
router.delete('/:id', eliminarCliente)

export default router
