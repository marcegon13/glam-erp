import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  userId?: number
  tenantId?: number
  rol?: string
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) {
    res.status(401).json({ error: 'Token requerido' })
    return
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: number
      tenantId: number
      rol: string
    }
    req.userId = decoded.userId
    req.tenantId = decoded.tenantId
    req.rol = decoded.rol
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido' })
  }
}
