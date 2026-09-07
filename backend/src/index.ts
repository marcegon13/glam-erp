import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { prisma } from './lib/prisma.js'
import authRoutes from './routes/auth.routes.js'
import clientesRoutes from './routes/clientes.routes.js'
import profesionalesRoutes from './routes/profesionales.routes.js'
import serviciosRoutes from './routes/servicios.routes.js'
import ordenesRoutes from './routes/ordenes.routes.js'
import liquidacionesRoutes from './routes/liquidaciones.routes.js'
import turnosRoutes from './routes/turnos.routes.js'
import ausenciasRoutes from './routes/ausencias.routes.js'
import cajaRoutes from './routes/caja.routes.js'
import fichaRoutes from './routes/ficha.routes.js'
import valesRoutes from './routes/vales.routes.js'
import dashboardRoutes from './routes/dashboard.routes.js'
import turnosCajaRoutes from './routes/turnos-caja.routes.js'
import produccionRoutes from './routes/produccion.routes.js'
import gastosAdminRoutes from './routes/gastos-admin.routes.js'
import usuariosRoutes from './routes/usuarios.routes.js'
import stockRoutes from './routes/stock.routes.js' // stock module v1

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      'http://localhost:5173',
      'https://glam-erp.vercel.app'
    ]
    if (!origin || allowed.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}))
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'Glam ERP', version: '1.0.0' })
})

app.use('/api/auth', authRoutes)
app.use('/api/clientes', clientesRoutes)
app.use('/api/profesionales', profesionalesRoutes)
app.use('/api/servicios', serviciosRoutes)
app.use('/api/ordenes', ordenesRoutes)
app.use('/api/liquidaciones', liquidacionesRoutes)
app.use('/api/turnos', turnosRoutes)
app.use('/api/ausencias', ausenciasRoutes)
app.use('/api/caja', cajaRoutes)
app.use('/api/ficha', fichaRoutes)
app.use('/api/vales', valesRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/turnos-caja', turnosCajaRoutes)
app.use('/api/produccion', produccionRoutes)
app.use('/api/gastos-admin', gastosAdminRoutes)
app.use('/api/usuarios', usuariosRoutes)
app.use('/api/stock', stockRoutes)

const archivarTurnosAlIniciar = async () => {
  try {
    const fechaLimite = new Date()
    fechaLimite.setUTCDate(fechaLimite.getUTCDate() - 30)

    const resultado = await prisma.turno.updateMany({
      where: {
        fecha: { lt: fechaLimite },
        estado: { in: ['PENDIENTE', 'CONFIRMADO'] }
      },
      data: { estado: 'ARCHIVADO' }
    })

    console.log(`Turnos archivados al iniciar: ${resultado.count}`)
  } catch (error) {
    console.error('No se pudieron archivar turnos viejos al iniciar', error)
  }
}

archivarTurnosAlIniciar().finally(() => {
  app.listen(PORT, () => {
    console.log(`Glam ERP backend corriendo en puerto ${PORT}`)
  })
})

export default app
