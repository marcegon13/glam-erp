import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import api from '../api/axios'

interface Servicio {
  id: number
  nombre: string
}

interface OrdenItem {
  id: number
  descripcion: string
  precioAplicado: string
  servicio: Servicio | null
}

interface Visita {
  id: number
  fecha: string
  profesional: { nombre: string; apellido: string }
  items: OrdenItem[]
}

interface ClienteFichaData {
  id: number
  nombre: string
  apellido: string
  telefono: string | null
  email: string | null
  ordenes: Visita[]
}

const formatoFecha = (fecha: string) =>
  new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })

const formatoMoneda = (valor: number) => `$${valor.toLocaleString('es-AR')}`

export default function ClienteFicha() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [cliente, setCliente] = useState<ClienteFichaData | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get(`/clientes/${id}/ficha`)
      .then(({ data }) => setCliente(data))
      .catch(() => setError('No se pudo cargar la ficha del cliente'))
      .finally(() => setCargando(false))
  }, [id])

  return (
    <Layout titulo="Ficha del cliente">
      <button
        onClick={() => navigate('/clientes')}
        className="text-sm text-text-muted hover:text-primary transition-colors mb-4"
      >
        ← Volver a Clientes
      </button>

      {cargando ? (
        <p className="text-text-muted">Cargando...</p>
      ) : !cliente ? (
        <p className="text-text-muted">{error || 'Cliente no encontrado'}</p>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-border p-6 mb-6">
            <h2 className="text-xl font-bold text-text">
              {cliente.nombre} {cliente.apellido}
            </h2>
            <div className="flex gap-6 mt-2 text-sm text-text-muted">
              <span>{cliente.telefono ?? 'Sin teléfono'}</span>
              <span>{cliente.email ?? 'Sin email'}</span>
            </div>
          </div>

          <h3 className="font-semibold text-text mb-3">Historial de visitas</h3>

          {cliente.ordenes.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-border p-8 text-center text-text-muted">
              Todavía no hay visitas cobradas registradas
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {cliente.ordenes.map((visita) => {
                const total = visita.items.reduce(
                  (suma, item) => suma + Number(item.precioAplicado),
                  0
                )

                return (
                  <div
                    key={visita.id}
                    className="bg-white rounded-2xl shadow-sm border border-border p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-text">{formatoFecha(visita.fecha)}</p>
                        <p className="text-sm text-text-muted mt-1">
                          Atendió {visita.profesional.nombre} {visita.profesional.apellido}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-primary">{formatoMoneda(total)}</p>
                    </div>

                    <div className="flex flex-col gap-1 mt-4 pt-4 border-t border-border">
                      {visita.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm text-text">
                          <span>{item.descripcion}</span>
                          <span>{formatoMoneda(Number(item.precioAplicado))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </Layout>
  )
}
