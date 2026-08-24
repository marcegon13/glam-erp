import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api/axios'

interface Servicio {
  id: number
  nombre: string
  precioEfectivo: string
  precioTarjeta: string
  tipo: string
}

interface OrdenItem {
  id: number
  descripcion: string
  precioAplicado: string
  cantidad: number
  servicio: Servicio | null
}

interface Pago {
  id: number
  metodo: string
  monto: string
  acreditado: boolean
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

type MetodoUI = 'EF' | 'TD' | 'TC' | 'MP'

const METODOS_UI: { key: MetodoUI; label: string; backend: string }[] = [
  { key: 'EF', label: 'EF', backend: 'EFECTIVO' },
  { key: 'TD', label: 'TD', backend: 'TARJETA' },
  { key: 'TC', label: 'TC', backend: 'TARJETA' },
  { key: 'MP', label: 'MP', backend: 'MERCADO_PAGO' },
]

const METODO_LABEL_LARGO: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
  MERCADO_PAGO: 'Mercado Pago',
}

const precioParaMetodo = (servicio: Servicio, metodo: MetodoUI) =>
  metodo === 'EF' ? Number(servicio.precioEfectivo) : Number(servicio.precioTarjeta)

const formatoMoneda = (valor: number) => `$${valor.toLocaleString('es-AR')}`

export default function OrdenDetalle() {
  const { id } = useParams()

  const [orden, setOrden] = useState<Orden | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [metodoUI, setMetodoUI] = useState<MetodoUI>('EF')

  const [busquedaServicio, setBusquedaServicio] = useState('')
  const [resultadosServicio, setResultadosServicio] = useState<Servicio[]>([])
  const [buscandoServicio, setBuscandoServicio] = useState(false)
  const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio | null>(null)
  const [cantidad, setCantidad] = useState('1')
  const [precioUnitario, setPrecioUnitario] = useState('')
  const [agregando, setAgregando] = useState(false)

  const [cobrando, setCobrando] = useState(false)
  const [mensajeExito, setMensajeExito] = useState('')
  const [acreditando, setAcreditando] = useState(false)

  const [modalCobro, setModalCobro] = useState(false)
  const [password, setPassword] = useState('')
  const [errorModal, setErrorModal] = useState('')

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
    if (!busquedaServicio.trim() || servicioSeleccionado) {
      setResultadosServicio([])
      return
    }

    const tipo = orden.profesional.tipo === 'MANICURA' ? 'MANICURIA' : 'PELUQUERIA'
    setBuscandoServicio(true)
    const timeout = setTimeout(async () => {
      try {
        const [porTipo, productos] = await Promise.all([
          api.get('/servicios', { params: { busqueda: busquedaServicio, tipo } }),
          api.get('/servicios', { params: { busqueda: busquedaServicio, tipo: 'PRODUCTO' } }),
        ])
        setResultadosServicio([...porTipo.data, ...productos.data])
      } catch {
        setResultadosServicio([])
      } finally {
        setBuscandoServicio(false)
      }
    }, 300)

    return () => clearTimeout(timeout)
  }, [busquedaServicio, orden?.profesional.tipo, servicioSeleccionado])

  // Si cambia el método de pago mientras hay un servicio elegido (todavía no agregado), recalcular su precio
  useEffect(() => {
    if (servicioSeleccionado) {
      setPrecioUnitario(String(precioParaMetodo(servicioSeleccionado, metodoUI)))
    }
  }, [metodoUI])

  const handleSeleccionarServicio = (servicio: Servicio) => {
    setServicioSeleccionado(servicio)
    setBusquedaServicio(servicio.nombre)
    setResultadosServicio([])
    setCantidad('1')
    setPrecioUnitario(String(precioParaMetodo(servicio, metodoUI)))
  }

  const handleCambiarBusqueda = (valor: string) => {
    setBusquedaServicio(valor)
    if (servicioSeleccionado && valor !== servicioSeleccionado.nombre) {
      setServicioSeleccionado(null)
      setPrecioUnitario('')
    }
  }

  const handleAgregarItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!servicioSeleccionado || !precioUnitario || !cantidad) return

    setAgregando(true)
    try {
      await api.post(`/ordenes/${id}/items`, {
        servicioId: servicioSeleccionado.id,
        descripcion: servicioSeleccionado.nombre,
        precioAplicado: Number(precioUnitario),
        cantidad: Number(cantidad),
      })
      setBusquedaServicio('')
      setServicioSeleccionado(null)
      setCantidad('1')
      setPrecioUnitario('')
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

  const handleEditarCantidad = async (item: OrdenItem, nuevaCantidad: number) => {
    if (!nuevaCantidad || nuevaCantidad === item.cantidad) return
    try {
      await api.put(`/ordenes/${id}/items/${item.id}`, { cantidad: nuevaCantidad })
      await fetchOrden()
    } catch {
      setError('Error al actualizar la cantidad')
    }
  }

  const handleEditarPrecioUnitario = async (item: OrdenItem, nuevoPrecio: number) => {
    if (!nuevoPrecio || nuevoPrecio === Number(item.precioAplicado)) return
    try {
      await api.put(`/ordenes/${id}/items/${item.id}`, { precioAplicado: nuevoPrecio })
      await fetchOrden()
    } catch {
      setError('Error al actualizar el precio')
    }
  }

  const abrirModalCobro = () => {
    setPassword('')
    setErrorModal('')
    setModalCobro(true)
  }

  const handleConfirmarCobro = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return
    const metodo = METODOS_UI.find((m) => m.key === metodoUI)!.backend
    setErrorModal('')
    setCobrando(true)
    try {
      const { data: verificacion } = await api.post('/auth/verificar-password', { password })
      if (!verificacion.valido) {
        setErrorModal('Contraseña incorrecta')
        return
      }

      const { data } = await api.post(`/ordenes/${id}/cobrar`, { metodo })
      setOrden(data)
      setMensajeExito('Orden cobrada exitosamente')
      setModalCobro(false)
    } catch {
      setErrorModal('Error al cobrar la orden')
    } finally {
      setCobrando(false)
    }
  }

  const handleAcreditar = async () => {
    setAcreditando(true)
    try {
      const { data } = await api.put(`/ordenes/${id}/acreditar`)
      setOrden(data)
    } catch {
      setError('Error al confirmar la acreditación')
    } finally {
      setAcreditando(false)
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

  // Precio unitario "en vivo": si el item tiene servicio vinculado, refleja el método de pago
  // seleccionado actualmente (igual que recalcula el backend al cobrar). Si no, se mantiene fijo.
  const precioUnitarioMostrado = (item: OrdenItem) =>
    item.servicio ? precioParaMetodo(item.servicio, metodoUI) : Number(item.precioAplicado)

  const subtotalMostrado = (item: OrdenItem) => precioUnitarioMostrado(item) * item.cantidad

  const total =
    orden.estado === 'ABIERTA'
      ? orden.items.reduce((suma, item) => suma + subtotalMostrado(item), 0)
      : Number(orden.pagos[0]?.monto ?? 0)

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
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-text-muted border-b border-border">
                      <th className="py-2 font-medium">Servicio</th>
                      <th className="py-2 font-medium w-16">Nº</th>
                      <th className="py-2 font-medium w-28">Precio Unitario</th>
                      <th className="py-2 font-medium w-28">Subtotal</th>
                      {orden.estado === 'ABIERTA' && <th className="py-2 w-8" />}
                    </tr>
                  </thead>
                  <tbody>
                    {orden.items.map((item) => {
                      const unitario = precioUnitarioMostrado(item)
                      const subtotal = unitario * item.cantidad
                      const editable = orden.estado === 'ABIERTA'
                      return (
                        <tr key={item.id} className="border-b border-border last:border-0">
                          <td className="py-2 text-text">{item.descripcion}</td>
                          <td className="py-2 text-text-muted">
                            {editable ? (
                              <input
                                type="number"
                                min={1}
                                defaultValue={item.cantidad}
                                onBlur={(e) => handleEditarCantidad(item, Number(e.target.value))}
                                className="w-14 border border-border rounded px-2 py-1 outline-none focus:border-primary transition-colors"
                              />
                            ) : (
                              item.cantidad
                            )}
                          </td>
                          <td className="py-2 text-text-muted">
                            {editable && !item.servicio ? (
                              <input
                                type="number"
                                defaultValue={item.precioAplicado}
                                onBlur={(e) => handleEditarPrecioUnitario(item, Number(e.target.value))}
                                className="w-24 border border-border rounded px-2 py-1 outline-none focus:border-primary transition-colors"
                              />
                            ) : (
                              formatoMoneda(unitario)
                            )}
                          </td>
                          <td className="py-2 font-medium text-text">{formatoMoneda(subtotal)}</td>
                          {orden.estado === 'ABIERTA' && (
                            <td className="py-2 text-right">
                              <button
                                onClick={() => handleEliminarItem(item.id)}
                                className="text-text-muted hover:text-red-600 transition-colors"
                                aria-label="Eliminar item"
                              >
                                ✕
                              </button>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {orden.estado === 'ABIERTA' && (
              <form onSubmit={handleAgregarItem} className="flex items-end gap-3 mt-6 pt-6 border-t border-border">
                <div className="flex flex-col flex-1 relative">
                  <label className="text-sm font-medium text-text mb-2">Servicio</label>
                  <input
                    value={busquedaServicio}
                    onChange={(e) => handleCambiarBusqueda(e.target.value)}
                    placeholder="Buscar servicio..."
                    autoComplete="off"
                    className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                  />
                  {busquedaServicio.trim() && !servicioSeleccionado && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-sm z-10 max-h-48 overflow-y-auto">
                      {buscandoServicio ? (
                        <p className="px-3 py-2 text-sm text-text-muted">Buscando...</p>
                      ) : resultadosServicio.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-text-muted">Sin resultados</p>
                      ) : (
                        resultadosServicio.map((s) => (
                          <button
                            type="button"
                            key={s.id}
                            onClick={() => handleSeleccionarServicio(s)}
                            className="w-full text-left px-3 py-2 hover:bg-surface transition-colors border-b border-border last:border-0"
                          >
                            <p className="text-sm font-medium text-text">{s.nombre}</p>
                            <p className="text-xs text-text-muted">
                              Efectivo {formatoMoneda(Number(s.precioEfectivo))} · Tarjeta{' '}
                              {formatoMoneda(Number(s.precioTarjeta))}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col w-16">
                  <label className="text-sm font-medium text-text mb-2">Nº</label>
                  <input
                    type="number"
                    min={1}
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div className="flex flex-col w-32">
                  <label className="text-sm font-medium text-text mb-2">Precio Unitario</label>
                  <input
                    type="number"
                    value={precioUnitario}
                    onChange={(e) => setPrecioUnitario(e.target.value)}
                    className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={agregando || !servicioSeleccionado}
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
            <p className="text-3xl font-bold text-text mt-1">{formatoMoneda(total)}</p>

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
              <>
                <div className="mt-4">
                  <p className="text-sm font-medium text-text mb-2">Método de pago</p>
                  <div className="grid grid-cols-4 gap-2">
                    {METODOS_UI.map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setMetodoUI(m.key)}
                        className={`text-sm font-medium rounded-lg py-2 transition-colors border ${
                          metodoUI === m.key
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white text-text border-border hover:bg-surface'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={abrirModalCobro}
                  disabled={cobrando || orden.items.length === 0}
                  className="w-full mt-4 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg py-2 transition-colors disabled:opacity-60"
                >
                  {cobrando ? 'Cobrando...' : 'Cobrar'}
                </button>
              </>
            )}

            {orden.estado === 'COBRADA' && pago && (
              <div className="mt-4 bg-green-50 border border-green-100 rounded-lg px-3 py-3">
                <p className="text-sm text-green-700">
                  Cobrada con {METODO_LABEL_LARGO[pago.metodo] ?? pago.metodo}
                </p>
                <p className="text-lg font-bold text-green-700 mt-1">{formatoMoneda(Number(pago.monto))}</p>
              </div>
            )}

            {orden.estado === 'COBRADA' && pago && pago.metodo !== 'EFECTIVO' && !pago.acreditado && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg px-3 py-3">
                <p className="text-sm font-medium text-amber-700">⏳ Pendiente de acreditación</p>
                <button
                  onClick={handleAcreditar}
                  disabled={acreditando}
                  className="w-full mt-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg py-2 transition-colors disabled:opacity-60"
                >
                  {acreditando ? 'Confirmando...' : 'Confirmar acreditación'}
                </button>
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

      {modalCobro && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-sm border border-border w-full max-w-sm py-8 px-8">
            <h2 className="text-lg font-bold text-text mb-6">Confirmar cobro</h2>

            <div className="flex flex-col gap-2 text-sm mb-4 pb-4 border-b border-border">
              <div className="flex justify-between">
                <span className="text-text-muted">Cliente</span>
                <span className="text-text">
                  {orden.cliente.nombre} {orden.cliente.apellido}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Profesional</span>
                <span className="text-text">
                  {orden.profesional.nombre} {orden.profesional.apellido}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-text-muted">Servicios</span>
                {orden.items.map((item) => (
                  <span key={item.id} className="text-text">
                    {item.descripcion}
                    {item.cantidad > 1 ? ` x${item.cantidad}` : ''}
                  </span>
                ))}
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Método</span>
                <span className="text-text">
                  {METODO_LABEL_LARGO[METODOS_UI.find((m) => m.key === metodoUI)!.backend]}
                </span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-text">Total</span>
                <span className="text-text">{formatoMoneda(total)}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmarCobro} className="flex flex-col">
              <label className="text-sm font-medium text-text mb-2">
                Confirmá tu contraseña para registrar el cobro
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                required
                className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
              />

              {errorModal && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-4">
                  {errorModal}
                </p>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setModalCobro(false)}
                  className="flex-1 border border-border text-text-muted font-medium rounded-lg py-2 transition-colors hover:bg-surface"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cobrando}
                  className="flex-1 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg py-2 transition-colors disabled:opacity-60"
                >
                  {cobrando ? 'Confirmando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
