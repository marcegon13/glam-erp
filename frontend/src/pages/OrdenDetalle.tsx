import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api/axios'

interface Servicio {
  id: number
  nombre: string
  precio: string
  tipo: string
}

interface OrdenItem {
  id: number
  descripcion: string
  precioAplicado: string
  servicio: Servicio | null
}

interface Pago {
  id: number
  metodo: string
  monto: string
}

interface Orden {
  id: number
  estado: 'ABIERTA' | 'COBRADA' | 'ANULADA'
  observaciones: string | null
  cliente: { nombre: string; apellido: string }
  profesional: { nombre: string; apellido: string; tipo: string }
  items: OrdenItem[]
  pagos: Pago[]
}

const METODOS = [
  { key: 'EFECTIVO', label: '💵 Efectivo' },
  { key: 'TARJETA', label: '💳 Tarjeta' },
  { key: 'TRANSFERENCIA', label: '📱 Transferencia' },
]

export default function OrdenDetalle() {
  const { id } = useParams()

  const [orden, setOrden] = useState<Orden | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [servicios, setServicios] = useState<Servicio[]>([])
  const [servicioId, setServicioId] = useState('')
  const [precio, setPrecio] = useState('')
  const [agregando, setAgregando] = useState(false)

  const [cobrando, setCobrando] = useState(false)
  const [mensajeExito, setMensajeExito] = useState('')

  const fetchOrden = async () => {
    try {
      const { data } = await api.get(`/ordenes/${id}`)
      setOrden(data)
    } catch {
      setError('No se pudo cargar la orden')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    fetchOrden()
  }, [id])

  useEffect(() => {
    if (!orden) return
    const tipo = orden.profesional.tipo === 'MANICURA' ? 'MANICURIA' : 'PELUQUERIA'
    Promise.all([
      api.get('/servicios', { params: { tipo } }),
      api.get('/servicios', { params: { tipo: 'PRODUCTO' } }),
    ])
      .then(([porTipo, productos]) => setServicios([...porTipo.data, ...productos.data]))
      .catch(() => setServicios([]))
  }, [orden?.profesional.tipo])

  const handleSeleccionarServicio = (id: string) => {
    setServicioId(id)
    const servicio = servicios.find((s) => String(s.id) === id)
    if (servicio) {
      setPrecio(servicio.precio)
    }
  }

  const handleAgregarItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!servicioId || !precio) return

    const servicio = servicios.find((s) => String(s.id) === servicioId)
    if (!servicio) return

    setAgregando(true)
    try {
      await api.post(`/ordenes/${id}/items`, {
        servicioId: servicio.id,
        descripcion: servicio.nombre,
        precioAplicado: Number(precio),
      })
      setServicioId('')
      setPrecio('')
      await fetchOrden()
    } catch {
      setError('Error al agregar el servicio')
    } finally {
      setAgregando(false)
    }
  }

  const handleEliminarItem = async (itemId: number) => {
    try {
      await api.delete(`/ordenes/${id}/items/${itemId}`)
      await fetchOrden()
    } catch {
      setError('Error al eliminar el item')
    }
  }

  const handleCobrar = async (metodo: string) => {
    setCobrando(true)
    try {
      const { data } = await api.post(`/ordenes/${id}/cobrar`, { metodo })
      setOrden(data)
      setMensajeExito('Orden cobrada exitosamente')
    } catch {
      setError('Error al cobrar la orden')
    } finally {
      setCobrando(false)
    }
  }

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <p className="text-text-muted">Cargando orden...</p>
      </div>
    )
  }

  if (!orden) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <p className="text-text-muted">{error || 'Orden no encontrada'}</p>
      </div>
    )
  }

  const total = orden.items.reduce((suma, item) => suma + Number(item.precioAplicado), 0)
  const pago = orden.pagos[0]

  return (
    <div className="min-h-screen bg-surface">
      <header className="px-8 py-6 border-b border-border bg-white">
        <h1 className="text-xl font-bold text-text">Orden #{orden.id}</h1>
        <p className="text-sm text-text-muted mt-1">
          {orden.cliente.nombre} {orden.cliente.apellido} · Atiende {orden.profesional.nombre}{' '}
          {orden.profesional.apellido}
        </p>
      </header>

      <div className="p-8 grid grid-cols-3 gap-6">
        <div className="col-span-2 flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
            <h2 className="font-semibold text-text mb-4">Servicios</h2>

            {orden.items.length === 0 ? (
              <p className="text-sm text-text-muted">Todavía no hay servicios cargados</p>
            ) : (
              <div className="flex flex-col gap-2">
                {orden.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface"
                  >
                    <span className="text-sm text-text">{item.descripcion}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-text">
                        ${Number(item.precioAplicado).toLocaleString('es-AR')}
                      </span>
                      {orden.estado === 'ABIERTA' && (
                        <button
                          onClick={() => handleEliminarItem(item.id)}
                          className="text-text-muted hover:text-red-600 transition-colors"
                          aria-label="Eliminar item"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {orden.estado === 'ABIERTA' && (
              <form onSubmit={handleAgregarItem} className="flex items-end gap-3 mt-6 pt-6 border-t border-border">
                <div className="flex flex-col flex-1">
                  <label className="text-sm font-medium text-text mb-2">Servicio</label>
                  <select
                    value={servicioId}
                    onChange={(e) => handleSeleccionarServicio(e.target.value)}
                    className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors bg-white"
                  >
                    <option value="" disabled>
                      Seleccioná un servicio
                    </option>
                    {servicios.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col w-32">
                  <label className="text-sm font-medium text-text mb-2">Precio</label>
                  <input
                    type="number"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={agregando || !servicioId}
                  className="bg-primary hover:bg-primary-dark text-white font-medium rounded-lg px-4 py-2 transition-colors disabled:opacity-60"
                >
                  {agregando ? 'Agregando...' : 'Agregar'}
                </button>
              </form>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
            <p className="text-sm text-text-muted">Total</p>
            <p className="text-3xl font-bold text-text mt-1">
              ${total.toLocaleString('es-AR')}
            </p>

            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm text-text-muted">Estado</p>
              <p className="font-semibold text-text mt-1">{orden.estado}</p>
            </div>

            {mensajeExito && (
              <p className="mt-4 text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                {mensajeExito}
              </p>
            )}

            {orden.estado === 'ABIERTA' && (
              <div className="flex flex-col gap-2 mt-4">
                {METODOS.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => handleCobrar(m.key)}
                    disabled={cobrando || orden.items.length === 0}
                    className="bg-primary hover:bg-primary-dark text-white font-medium rounded-lg py-2 transition-colors disabled:opacity-60"
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            {orden.estado === 'COBRADA' && pago && (
              <div className="mt-4 bg-green-50 border border-green-100 rounded-lg px-3 py-3">
                <p className="text-sm text-green-700">
                  Cobrada con {METODOS.find((m) => m.key === pago.metodo)?.label ?? pago.metodo}
                </p>
                <p className="text-lg font-bold text-green-700 mt-1">
                  ${Number(pago.monto).toLocaleString('es-AR')}
                </p>
              </div>
            )}

            {orden.estado === 'ANULADA' && (
              <p className="mt-4 text-sm text-text-muted bg-surface rounded-lg px-3 py-2">
                Esta orden fue anulada
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
