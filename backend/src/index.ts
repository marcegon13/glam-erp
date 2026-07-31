import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.routes.js'
import clientesRoutes from './routes/clientes.routes.js'
import profesionalesRoutes from './routes/profesionales.routes.js'
import serviciosRoutes from './routes/servicios.routes.js'
import ordenesRoutes from './routes/ordenes.routes.js'
import liquidacionesRoutes from './routes/liquidaciones.routes.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
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

app.listen(PORT, () => {
  console.log(`Glam ERP backend corriendo en puerto ${PORT}`)
})

export default app
