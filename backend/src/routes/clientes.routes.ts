import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import {
  listarClientes,
  crearCliente,
  obtenerCliente,
  editarCliente,
  eliminarCliente
} from '../controllers/clientes.controller.js'

const router = Router()

router.use(authMiddleware)

router.get('/', listarClientes)
router.post('/', crearCliente)
router.get('/:id', obtenerCliente)
router.put('/:id', editarCliente)
router.delete('/:id', eliminarCliente)

export default router
