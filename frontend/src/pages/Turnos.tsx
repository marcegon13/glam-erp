import { useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

interface Cliente {
  id: number
  nombre: string
  apellido: string
  telefono: string | null
  email: string | null
}

interface Profesional {
  id: number
  nombre: string
  apellido: string
  tipo: string
}

type EstadoTurno = 'PENDIENTE' | 'CONFIRMADO' | 'CANCELADO' | 'ARCHIVADO'

interface Turno {
  id: number
  fecha: string
  hora: string
  servicios: string
  observaciones: string | null
  estado: EstadoTurno
  cliente: Cliente
  profesional: Profesional
}

const ESTADO_BADGE: Record<EstadoTurno, string> = {
  PENDIENTE: 'bg-gray-100 text-gray-600',
  CONFIRMADO: 'bg-green-50 text-green-700',
  CANCELADO: 'bg-red-50 text-red-600',
  ARCHIVADO: 'bg-gray-600 text-white',
}

const ESTADO_LABEL: Record<EstadoTurno, string> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADO: 'Confirmado',
  CANCELADO: 'Cancelado',
  ARCHIVADO: 'Archivado',
}

const HORAS: string[] = []
for (let hora = 9; hora <= 20; hora++) {
  for (const minuto of [0, 30]) {
    HORAS.push(`${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`)
  }
}

function hoyISO(): string {
  const hoy = new Date()
  const anio = hoy.getFullYear()
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

function horaActualHHMM(): string {
  const ahora = new Date()
  return `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`
}

function colorSemaforo(fecha: string, hora: string): string {
  const fechaTurno = fecha.slice(0, 10)
  const hoy = hoyISO()

  if (fechaTurno < hoy) return 'border-l-red-500'
  if (fechaTurno > hoy) return 'border-l-blue-500'
  return hora < horaActualHHMM() ? 'border-l-red-500' : 'border-l-green-500'
}

function armarMensajeWhatsapp(turno: Turno): string {
  return (
    `¡Hola ${turno.cliente.nombre}! ✨\n\n` +
    `Te confirmamos tu turno en Glam:\n\n` +
    `📅 Fecha: ${turno.fecha.slice(0, 10).split('-').reverse().join('/')}\n` +
    `🕒 Hora: ${turno.hora}\n` +
    `💇 Profesional: ${turno.profesional.nombre} ${turno.profesional.apellido}\n` +
    `✂️ Servicios: ${turno.servicios}\n\n` +
    `¡Te esperamos!`
  )
}

export default function Turnos() {
  const [fecha, setFecha] = useState(hoyISO())
  const [profesionales, setProfesionales] = useState<Profesional[]>([])
  const [profesionalFiltro, setProfesionalFiltro] = useState('')

  const [turnos, setTurnos] = useState<Turno[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [advertencia, setAdvertencia] = useState('')

  const [modalAbierto, setModalAbierto] = useState(false)
  const [clienteBusqueda, setClienteBusqueda] = useState('')
  const [clienteResultados, setClienteResultados] = useState<Cliente[]>([])
  const [buscandoCliente, setBuscandoCliente] = useState(false)
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null)
  const [profesionalId, setProfesionalId] = useState('')
  const [fechaTurno, setFechaTurno] = useState(hoyISO())
  const [horaTurno, setHoraTurno] = useState('')
  const [servicios, setServicios] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [creando, setCreando] = useState(false)
  const [errorModal, setErrorModal] = useState('')

  const [modalCliente, setModalCliente] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoApellido, setNuevoApellido] = useState('')
  const [nuevoTelefono, setNuevoTelefono] = useState('')
  const [guardandoCliente, setGuardandoCliente] = useState(false)
  const [errorCliente, setErrorCliente] = useState('')

  const fetchProfesionales = async () => {
    try {
      const { data } = await api.get('/profesionales')
      setProfesionales(data)
    } catch {
      setProfesionales([])
    }
  }

  const fetchTurnos = async () => {
    setCargando(true)
    setError('')
    try {
      const { data } = await api.get('/turnos', {
        params: {
          fecha,
          ...(profesionalFiltro ? { profesionalId: profesionalFiltro } : {}),
        },
      })
      setTurnos(data)
    } catch {
      setError('No se pudieron cargar los turnos')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    fetchProfesionales()
  }, [])

  useEffect(() => {
    fetchTurnos()
  }, [fecha, profesionalFiltro])

  useEffect(() => {
    if (!clienteBusqueda.trim()) {
      setClienteResultados([])
      return
    }

    setBuscandoCliente(true)
    const timeout = setTimeout(async () => {
      try {
        const { data } = await api.get('/clientes', { params: { busqueda: clienteBusqueda } })
        setClienteResultados(data)
      } catch {
        setClienteResultados([])
      } finally {
        setBuscandoCliente(false)
      }
    }, 400)

    return () => clearTimeout(timeout)
  }, [clienteBusqueda])

  const abrirModal = () => {
    setClienteBusqueda('')
    setClienteResultados([])
    setClienteSeleccionado(null)
    setProfesionalId('')
    setFechaTurno(fecha)
    setHoraTurno('')
    setServicios('')
    setObservaciones('')
    setErrorModal('')
    setModalAbierto(true)
  }

  const handleCrearTurno = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clienteSeleccionado || !profesionalId || !fechaTurno || !horaTurno || !servicios) return

    setErrorModal('')
    setCreando(true)

    try {
      const { data } = await api.post('/turnos', {
        clienteId: clienteSeleccionado.id,
        profesionalId: Number(profesionalId),
        fecha: fechaTurno,
        hora: horaTurno,
        servicios,
        observaciones: observaciones || undefined,
      })

      setModalAbierto(false)
      setAdvertencia(data.advertencia ?? '')
      await fetchTurnos()
    } catch (err: any) {
      setErrorModal(err.response?.data?.error ?? 'Error al crear turno')
    } finally {
      setCreando(false)
    }
  }

  const abrirModalCliente = () => {
    setNuevoNombre('')
    setNuevoApellido('')
    setNuevoTelefono('')
    setErrorCliente('')
    setModalCliente(true)
  }

  const handleGuardarCliente = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorCliente('')
    setGuardandoCliente(true)

    try {
      const { data } = await api.post('/clientes', {
        nombre: nuevoNombre,
        apellido: nuevoApellido,
        telefono: nuevoTelefono || undefined,
      })
      setClienteSeleccionado(data)
      setClienteResultados([])
      setModalCliente(false)
    } catch (err: any) {
      setErrorCliente(err.response?.data?.error ?? 'Error al crear cliente')
    } finally {
      setGuardandoCliente(false)
    }
  }

  const handleConfirmar = async (turno: Turno) => {
    try {
      await api.post(`/turnos/${turno.id}/confirmar`)
      setTurnos((prev) => prev.map((t) => (t.id === turno.id ? { ...t, estado: 'CONFIRMADO' } : t)))
    } catch {
      setError('No se pudo confirmar el turno')
    }
  }

  const handleCancelar = async (turno: Turno) => {
    const confirmar = window.confirm(`¿Cancelar el turno de ${turno.cliente.nombre} ${turno.cliente.apellido}?`)
    if (!confirmar) return

    try {
      await api.post(`/turnos/${turno.id}/cancelar`)
      setTurnos((prev) => prev.map((t) => (t.id === turno.id ? { ...t, estado: 'CANCELADO' } : t)))
    } catch {
      setError('No se pudo cancelar el turno')
    }
  }

  const handleWhatsapp = (turno: Turno) => {
    const telefono = (turno.cliente.telefono ?? '').replace(/\D/g, '')
    if (!telefono) {
      setError('Este cliente no tiene teléfono cargado')
      return
    }
    const mensaje = encodeURIComponent(armarMensajeWhatsapp(turno))
    window.open(`https://wa.me/549${telefono}?text=${mensaje}`, '_blank')
  }

  const sinResultadosCliente =
    clienteBusqueda.trim() !== '' && !buscandoCliente && clienteResultados.length === 0 && !clienteSeleccionado

  const puedeCrear = useMemo(
    () => !!(clienteSeleccionado && profesionalId && fechaTurno && horaTurno && servicios),
    [clienteSeleccionado, profesionalId, fechaTurno, horaTurno, servicios]
  )

  return (
    <Layout titulo="Turnos">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-text mb-2">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors bg-white"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-text mb-2">Profesional</label>
            <select
              value={profesionalFiltro}
              onChange={(e) => setProfesionalFiltro(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors bg-white min-w-[200px]"
            >
              <option value="">Todos</option>
              {profesionales.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} {p.apellido}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={abrirModal}
          className="bg-primary hover:bg-primary-dark text-white font-medium rounded-lg px-4 py-2 transition-colors"
        >
          + Nuevo Turno
        </button>
      </div>

      {advertencia && (
        <div className="flex items-start justify-between gap-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
          <span>⚠️ {advertencia}</span>
          <button onClick={() => setAdvertencia('')} className="text-amber-700 hover:text-amber-900 font-medium">
            ✕
          </button>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-muted border-b border-border">
              <th className="px-5 py-3 font-medium">Hora</th>
              <th className="px-5 py-3 font-medium">Cliente</th>
              <th className="px-5 py-3 font-medium">Teléfono</th>
              <th className="px-5 py-3 font-medium">Profesional</th>
              <th className="px-5 py-3 font-medium">Servicios</th>
              <th className="px-5 py-3 font-medium">Estado</th>
              <th className="px-5 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={7} className="px-5 py-6 text-center text-text-muted">
                  Cargando...
                </td>
              </tr>
            ) : turnos.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-6 text-center text-text-muted">
                  No hay turnos para esta fecha
                </td>
              </tr>
            ) : (
              turnos.map((turno) => (
                <tr
                  key={turno.id}
                  className={`border-b border-border last:border-b-0 border-l-4 ${colorSemaforo(turno.fecha, turno.hora)}`}
                >
                  <td className="px-5 py-3 text-text font-semibold tabular-nums">{turno.hora}</td>
                  <td className="px-5 py-3 text-text font-medium">
                    {turno.cliente.nombre} {turno.cliente.apellido}
                  </td>
                  <td className="px-5 py-3 text-text-muted">{turno.cliente.telefono ?? '—'}</td>
                  <td className="px-5 py-3 text-text">
                    {turno.profesional.nombre} {turno.profesional.apellido}
                  </td>
                  <td className="px-5 py-3 text-text-muted">{turno.servicios}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${ESTADO_BADGE[turno.estado]}`}>
                      {ESTADO_LABEL[turno.estado]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    {turno.estado === 'PENDIENTE' && (
                      <button
                        onClick={() => handleConfirmar(turno)}
                        className="text-green-700 hover:text-green-800 font-medium mr-4 transition-colors"
                      >
                        Confirmar
                      </button>
                    )}
                    <button
                      onClick={() => handleWhatsapp(turno)}
                      className="text-[#25D366] hover:text-[#1DA851] font-medium mr-4 transition-colors"
                    >
                      WhatsApp
                    </button>
                    {(turno.estado === 'PENDIENTE' || turno.estado === 'CONFIRMADO') && (
                      <button
                        onClick={() => handleCancelar(turno)}
                        className="text-red-600 hover:text-red-700 font-medium transition-colors"
                      >
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-sm border border-border w-full max-w-md py-8 px-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-text mb-6">Nuevo turno</h2>

            <form onSubmit={handleCrearTurno} className="flex flex-col">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-text mb-2">Cliente</label>
                {clienteSeleccionado ? (
                  <div className="flex items-center justify-between border border-border rounded-lg px-3 py-2 bg-surface">
                    <span className="text-text font-medium">
                      {clienteSeleccionado.nombre} {clienteSeleccionado.apellido}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setClienteSeleccionado(null)
                        setClienteBusqueda('')
                      }}
                      className="text-sm text-primary hover:text-primary-dark font-medium"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      value={clienteBusqueda}
                      onChange={(e) => setClienteBusqueda(e.target.value)}
                      placeholder="Buscar por nombre, apellido o teléfono..."
                      className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                    />
                    {clienteResultados.length > 0 && (
                      <div className="mt-2 border border-border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                        {clienteResultados.map((c) => (
                          <button
                            type="button"
                            key={c.id}
                            onClick={() => {
                              setClienteSeleccionado(c)
                              setClienteResultados([])
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-surface transition-colors border-b border-border last:border-0"
                          >
                            <p className="text-sm font-medium text-text">
                              {c.nombre} {c.apellido}
                            </p>
                            <p className="text-xs text-text-muted">{c.telefono ?? 'Sin teléfono'}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    {sinResultadosCliente && (
                      <div className="mt-2 flex flex-col items-start gap-2">
                        <p className="text-xs text-text-muted">No se encontró el cliente</p>
                        <button
                          type="button"
                          onClick={abrirModalCliente}
                          className="text-sm text-primary hover:text-primary-dark font-medium"
                        >
                          + Crear cliente
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex flex-col mt-4">
                <label className="text-sm font-medium text-text mb-2">Profesional</label>
                <select
                  value={profesionalId}
                  onChange={(e) => setProfesionalId(e.target.value)}
                  required
                  className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors bg-white"
                >
                  <option value="" disabled>
                    Seleccioná un profesional
                  </option>
                  {profesionales.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.apellido}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4 mt-4">
                <div className="flex flex-col flex-1">
                  <label className="text-sm font-medium text-text mb-2">Fecha</label>
                  <input
                    type="date"
                    value={fechaTurno}
                    onChange={(e) => setFechaTurno(e.target.value)}
                    required
                    className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div className="flex flex-col flex-1">
                  <label className="text-sm font-medium text-text mb-2">Hora</label>
                  <select
                    value={horaTurno}
                    onChange={(e) => setHoraTurno(e.target.value)}
                    required
                    className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors bg-white"
                  >
                    <option value="" disabled>
                      --:--
                    </option>
                    {HORAS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col mt-4">
                <label className="text-sm font-medium text-text mb-2">Servicios</label>
                <input
                  value={servicios}
                  onChange={(e) => setServicios(e.target.value)}
                  placeholder="Ej: Corte + Color"
                  required
                  className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="flex flex-col mt-4">
                <label className="text-sm font-medium text-text mb-2">
                  Observaciones <span className="text-text-muted font-normal">(opcional)</span>
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={2}
                  className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors resize-none"
                />
              </div>

              {errorModal && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-4">
                  {errorModal}
                </p>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="flex-1 border border-border text-text-muted font-medium rounded-lg py-2 transition-colors hover:bg-surface"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creando || !puedeCrear}
                  className="flex-1 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg py-2 transition-colors disabled:opacity-60"
                >
                  {creando ? 'Creando...' : 'Crear Turno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalCliente && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4 z-[60]">
          <div className="bg-white rounded-2xl shadow-sm border border-border w-full max-w-sm py-8 px-8">
            <h2 className="text-lg font-bold text-text mb-6">Nuevo cliente</h2>

            <form onSubmit={handleGuardarCliente} className="flex flex-col">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-text mb-2">Nombre</label>
                <input
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  required
                  className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="flex flex-col mt-4">
                <label className="text-sm font-medium text-text mb-2">Apellido</label>
                <input
                  value={nuevoApellido}
                  onChange={(e) => setNuevoApellido(e.target.value)}
                  required
                  className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="flex flex-col mt-4">
                <label className="text-sm font-medium text-text mb-2">Teléfono</label>
                <input
                  value={nuevoTelefono}
                  onChange={(e) => setNuevoTelefono(e.target.value)}
                  className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                />
              </div>

              {errorCliente && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-4">
                  {errorCliente}
                </p>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setModalCliente(false)}
                  className="flex-1 border border-border text-text-muted font-medium rounded-lg py-2 transition-colors hover:bg-surface"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoCliente}
                  className="flex-1 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg py-2 transition-colors disabled:opacity-60"
                >
                  {guardandoCliente ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
