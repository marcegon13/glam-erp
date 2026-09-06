import { Response } from 'express'
import bcrypt from 'bcryptjs'
import { Rol } from '../../generated/prisma/index.js'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from '../middleware/auth.js'

const ROLES_PERMITIDOS: Rol[] = ['CAJERA', 'OFICINA', 'ESTILISTA', 'MANICURA']

export const listarUsuarios = async (req: AuthRequest, res: Response) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { tenantId: req.tenantId },
      select: { id: true, nombre: true, email: true, rol: true, activo: true, creadoEn: true },
      orderBy: { creadoEn: 'asc' }
    })

    res.json(usuarios)
  } catch {
    res.status(500).json({ error: 'Error al listar usuarios' })
  }
}

export const crearUsuario = async (req: AuthRequest, res: Response) => {
  const { nombre, email, password, rol } = req.body

  if (!nombre || !email || !password || !rol) {
    res.status(400).json({ error: 'Nombre, email, contraseña y rol son requeridos' })
    return
  }

  if (!ROLES_PERMITIDOS.includes(rol)) {
    res.status(400).json({ error: 'Rol inválido' })
    return
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12)

    const usuario = await prisma.usuario.create({
      data: {
        tenantId: req.tenantId!,
        nombre,
        email,
        password: hashedPassword,
        rol
      },
      select: { id: true, nombre: true, email: true, rol: true, activo: true, creadoEn: true }
    })

    res.status(201).json(usuario)
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'El email ya está registrado en esta peluquería' })
      return
    }
    res.status(500).json({ error: 'Error al crear el usuario' })
  }
}

export const editarUsuario = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)
  const { nombre, email, rol, password } = req.body

  if (rol && !ROLES_PERMITIDOS.includes(rol)) {
    res.status(400).json({ error: 'Rol inválido' })
    return
  }

  try {
    const actual = await prisma.usuario.findFirst({
      where: { id, tenantId: req.tenantId }
    })

    if (!actual) {
      res.status(404).json({ error: 'Usuario no encontrado' })
      return
    }

    if (actual.rol === 'ADMINISTRADOR') {
      res.status(403).json({ error: 'No se puede editar un administrador desde acá' })
      return
    }

    const data: { nombre?: string; email?: string; rol?: Rol; password?: string } = {}
    if (nombre) data.nombre = nombre
    if (email) data.email = email
    if (rol) data.rol = rol
    if (password) data.password = await bcrypt.hash(password, 12)

    const usuario = await prisma.usuario.update({
      where: { id },
      data,
      select: { id: true, nombre: true, email: true, rol: true, activo: true, creadoEn: true }
    })

    res.json(usuario)
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'El email ya está registrado en esta peluquería' })
      return
    }
    res.status(500).json({ error: 'Error al editar el usuario' })
  }
}

export const cambiarEstado = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id)
  const { activo } = req.body

  if (typeof activo !== 'boolean') {
    res.status(400).json({ error: 'El campo activo es requerido' })
    return
  }

  if (id === req.userId) {
    res.status(400).json({ error: 'No podés cambiar tu propio estado' })
    return
  }

  try {
    const actual = await prisma.usuario.findFirst({
      where: { id, tenantId: req.tenantId }
    })

    if (!actual) {
      res.status(404).json({ error: 'Usuario no encontrado' })
      return
    }

    if (actual.rol === 'ADMINISTRADOR') {
      res.status(403).json({ error: 'No se puede desactivar un administrador' })
      return
    }

    const usuario = await prisma.usuario.update({
      where: { id },
      data: { activo },
      select: { id: true, nombre: true, email: true, rol: true, activo: true, creadoEn: true }
    })

    res.json(usuario)
  } catch {
    res.status(500).json({ error: 'Error al cambiar el estado del usuario' })
  }
}
