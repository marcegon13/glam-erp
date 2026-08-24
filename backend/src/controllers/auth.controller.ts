import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from '../middleware/auth.js'

export const registrarTenant = async (req: Request, res: Response) => {
  const { nombreNegocio, nombre, email, password } = req.body

  if (!nombreNegocio || !nombre || !email || !password) {
    res.status(400).json({ error: 'Todos los campos son requeridos' })
    return
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12)

    const tenant = await prisma.tenant.create({
      data: {
        nombre: nombreNegocio,
        usuarios: {
          create: {
            nombre,
            email,
            password: hashedPassword,
            rol: 'ADMINISTRADOR'
          }
        }
      },
      include: { usuarios: true }
    })

    const usuario = tenant.usuarios[0]
    const token = jwt.sign(
      { userId: usuario.id, tenantId: tenant.id, rol: usuario.rol },
      process.env.JWT_SECRET!,
      { expiresIn: '8h' }
    )

    res.status(201).json({
      message: 'Peluquería registrada exitosamente',
      token,
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
      tenant: { id: tenant.id, nombre: tenant.nombre, plan: tenant.plan }
    })
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'El email ya está registrado' })
      return
    }
    res.status(500).json({ error: 'Error al registrar' })
  }
}

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body

  if (!email || !password) {
    res.status(400).json({ error: 'Email y contraseña requeridos' })
    return
  }

  try {
    const usuario = await prisma.usuario.findFirst({
      where: { email, activo: true },
      include: { tenant: true }
    })

    if (!usuario || !await bcrypt.compare(password, usuario.password)) {
      res.status(401).json({ error: 'Credenciales inválidas' })
      return
    }

    const token = jwt.sign(
      { userId: usuario.id, tenantId: usuario.tenantId, rol: usuario.rol },
      process.env.JWT_SECRET!,
      { expiresIn: '8h' }
    )

    res.json({
      token,
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
      tenant: { id: usuario.tenant.id, nombre: usuario.tenant.nombre, plan: usuario.tenant.plan }
    })
  } catch {
    res.status(500).json({ error: 'Error al iniciar sesión' })
  }
}

export const verificarPassword = async (req: AuthRequest, res: Response) => {
  const { password } = req.body

  if (!password) {
    res.status(400).json({ error: 'Contraseña requerida' })
    return
  }

  try {
    const usuario = await prisma.usuario.findFirst({
      where: { id: req.userId, tenantId: req.tenantId }
    })

    if (!usuario) {
      res.status(404).json({ error: 'Usuario no encontrado' })
      return
    }

    const valido = await bcrypt.compare(password, usuario.password)
    res.json({ valido })
  } catch {
    res.status(500).json({ error: 'Error al verificar la contraseña' })
  }
}
