import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

interface UltimoTrabajo {
  id: number
  trabajoRealizado: string
  estilista: string
  fecha: string
}

interface Cliente {
  id: number
  nombre: string
  apellido: string
  ultimaVisita: string | null
  ultimoTrabajo: UltimoTrabajo | null
}

function hoyISO(): string {
  const hoy = new Date()
  const anio = hoy.getFullYear()
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

const formatoFecha = (fecha: string | null) =>
  fecha ? fecha.slice(0, 10).split('-').reverse().join('/') : '—'

const truncar = (texto: string, limite: number) =>
  texto.length > limite ? `${texto.slice(0, limite)}...` : texto

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const [modalNuevo, setModalNuevo] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoApellido, setNuevoApellido] = useState('')
  const [nuevoTrabajo, setNuevoTrabajo] = useState('')
  const [nuevoEstilista, setNuevoEstilista] = useState('')
  const [nuevaFecha, setNuevaFecha] = useState(hoyISO())
  const [guardandoNuevo, setGuardandoNuevo] = useState(false)
  const [errorNuevo, setErrorNuevo] = useState('')

  const [modalAgregar, setModalAgregar] = useState(false)
  const [modalEditar, setModalEditar] = useState(false)
  const [clienteActivo, setClienteActivo] = useState<Cliente | null>(null)
  const [trabajoRealizado, setTrabajoRealizado] = useState('')
  const [estilista, setEstilista] = useState('')
  const [fechaTrabajo, setFechaTrabajo] = useState(hoyISO())
  const [guardandoTrabajo, setGuardandoTrabajo] = useState(false)
  const [errorTrabajo, setErrorTrabajo] = useState('')

  const fetchTodos = async () => {
    setCargando(true)
    setError('')
    try {
      const { data } = await api.get('/clientes')
      setClientes(data)
    } catch {
      setError('No se pudieron cargar los clientes')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    fetchTodos()
  }, [])

  const handleBuscar = async () => {
    if (!busqueda.trim()) {
      fetchTodos()
      return
    }
    setCargando(true)
    setError('')
    try {
      const { data } = await api.get('/clientes/buscar', { params: { q: busqueda } })
      setClientes(data)
    } catch {
      setError('No se pudo realizar la búsqueda')
    } finally {
      setCargando(false)
    }
  }

  const handleMostrarTodos = () => {
    setBusqueda('')
    fetchTodos()
  }

  const abrirModalNuevo = () => {
    setNuevoNombre('')
    setNuevoApellido('')
    setNuevoTrabajo('')
    setNuevoEstilista('')
    setNuevaFecha(hoyISO())
    setErrorNuevo('')
    setModalNuevo(true)
  }

  const handleGuardarNuevo = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorNuevo('')
    setGuardandoNuevo(true)

    try {
      const { data: cliente } = await api.post('/clientes', {
        nombre: nuevoNombre,
        apellido: nuevoApellido,
      })

      if (nuevoTrabajo.trim()) {
        await api.post('/ficha', {
          clienteId: cliente.id,
          trabajoRealizado: nuevoTrabajo,
          estilista: nuevoEstilista || 'Sin especificar',
          fecha: nuevaFecha,
        })
      }

      setModalNuevo(false)
      await fetchTodos()
    } catch (err: any) {
      setErrorNuevo(err.response?.data?.error ?? 'Error al guardar el cliente')
    } finally {
      setGuardandoNuevo(false)
    }
  }

  const abrirAgregarTrabajo = (cliente: Cliente) => {
    setClienteActivo(cliente)
    setTrabajoRealizado('')
    setEstilista('')
    setFechaTrabajo(hoyISO())
    setErrorTrabajo('')
    setModalAgregar(true)
  }

  const abrirEditarTrabajo = (cliente: Cliente) => {
    setClienteActivo(cliente)
    setTrabajoRealizado(cliente.ultimoTrabajo?.trabajoRealizado ?? '')
    setEstilista(cliente.ultimoTrabajo?.estilista ?? '')
    setFechaTrabajo(cliente.ultimoTrabajo ? cliente.ultimoTrabajo.fecha.slice(0, 10) : hoyISO())
    setErrorTrabajo('')
    setModalEditar(true)
  }

  const handleAgregarTrabajo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clienteActivo) return
    setErrorTrabajo('')
    setGuardandoTrabajo(true)

    try {
      await api.post('/ficha', {
        clienteId: clienteActivo.id,
        trabajoRealizado,
        estilista,
        fecha: fechaTrabajo,
      })
      setModalAgregar(false)
      await fetchTodos()
    } catch (err: any) {
      setErrorTrabajo(err.response?.data?.error ?? 'Error al agregar el trabajo')
    } finally {
      setGuardandoTrabajo(false)
    }
  }

  const handleEditarTrabajo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clienteActivo) return
    setErrorTrabajo('')
    setGuardandoTrabajo(true)

    try {
      await api.put(`/ficha/${clienteActivo.id}/ultimo`, {
        trabajoRealizado,
        estilista,
        fecha: fechaTrabajo,
      })
      setModalEditar(false)
      await fetchTodos()
    } catch (err: any) {
      setErrorTrabajo(err.response?.data?.error ?? 'Error al editar el trabajo')
    } finally {
      setGuardandoTrabajo(false)
    }
  }

  const handleEliminar = async (cliente: Cliente) => {
    const confirmar = window.confirm(`¿Eliminar a ${cliente.nombre} ${cliente.apellido}?`)
    if (!confirmar) return

    try {
      await api.delete(`/clientes/${cliente.id}`)
      setClientes((prev) => prev.filter((c) => c.id !== cliente.id))
    } catch {
      setError('No se pudo eliminar el cliente')
    }
  }

  return (
    <Layout titulo="Clientes">
      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
          placeholder="Buscar por nombre o apellido..."
          className="flex-1 bg-white border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
        />
        <button
          onClick={handleBuscar}
          className="bg-primary hover:bg-primary-dark text-white font-medium rounded-lg px-4 py-2 transition-colors"
        >
          Buscar
        </button>
        <button
          onClick={handleMostrarTodos}
          className="border border-border text-text font-medium rounded-lg px-4 py-2 transition-colors hover:bg-surface"
        >
          Todos
        </button>
        <button
          onClick={abrirModalNuevo}
          className="bg-primary hover:bg-primary-dark text-white font-medium rounded-lg px-4 py-2 transition-colors whitespace-nowrap ml-auto"
        >
          Nuevo Cliente
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-muted border-b border-border">
              <th className="px-5 py-3 font-medium">ID</th>
              <th className="px-5 py-3 font-medium">Nombre</th>
              <th className="px-5 py-3 font-medium">Apellido</th>
              <th className="px-5 py-3 font-medium">Última Visita</th>
              <th className="px-5 py-3 font-medium">Último Trabajo</th>
              <th className="px-5 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-text-muted">
                  Cargando...
                </td>
              </tr>
            ) : clientes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-text-muted">
                  No hay clientes para mostrar
                </td>
              </tr>
            ) : (
              clientes.map((c, i) => (
                <tr
                  key={c.id}
                  className={`border-b border-border last:border-0 ${i % 2 === 1 ? 'bg-surface' : ''}`}
                >
                  <td className="px-5 py-3 text-text-muted">{c.id}</td>
                  <td className="px-5 py-3 text-text font-medium">{c.nombre}</td>
                  <td className="px-5 py-3 text-text">{c.apellido}</td>
                  <td className="px-5 py-3 text-text-muted">{formatoFecha(c.ultimaVisita)}</td>
                  <td className="px-5 py-3 text-text-muted">
                    {c.ultimoTrabajo ? (
                      <span className="inline-flex items-center gap-2">
                        <span>{truncar(c.ultimoTrabajo.trabajoRealizado, 30)}</span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#EDE9FE] text-primary whitespace-nowrap">
                          {c.ultimoTrabajo.estilista}
                        </span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => abrirEditarTrabajo(c)}
                        title="Editar último trabajo"
                        className="text-xs font-medium px-2 py-1 rounded bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors whitespace-nowrap"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => abrirAgregarTrabajo(c)}
                        title="Agregar trabajo"
                        className="text-xs font-medium px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 transition-colors whitespace-nowrap"
                      >
                        + Trabajo
                      </button>
                      <button
                        onClick={() => handleEliminar(c)}
                        title="Eliminar cliente"
                        className="text-xs font-medium px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors whitespace-nowrap"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalNuevo && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-sm border border-border w-full max-w-md py-8 px-8">
            <h2 className="text-lg font-bold text-text mb-6">Nuevo Cliente</h2>

            <form onSubmit={handleGuardarNuevo} className="flex flex-col">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-text mb-2">Nombre</label>
                  <input
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    required
                    className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-text mb-2">Apellido</label>
                  <input
                    value={nuevoApellido}
                    onChange={(e) => setNuevoApellido(e.target.value)}
                    required
                    className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="text-sm font-semibold text-text mb-4">Primer Trabajo (Opcional)</h3>

                <div className="flex flex-col">
                  <label className="text-sm font-medium text-text mb-2">Trabajo Realizado</label>
                  <input
                    value={nuevoTrabajo}
                    onChange={(e) => setNuevoTrabajo(e.target.value)}
                    placeholder="Ej: Corte, Tinte"
                    className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div className="flex flex-col mt-4">
                  <label className="text-sm font-medium text-text mb-2">Estilista</label>
                  <input
                    value={nuevoEstilista}
                    onChange={(e) => setNuevoEstilista(e.target.value)}
                    className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div className="flex flex-col mt-4">
                  <label className="text-sm font-medium text-text mb-2">Fecha</label>
                  <input
                    type="date"
                    value={nuevaFecha}
                    onChange={(e) => setNuevaFecha(e.target.value)}
                    className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              {errorNuevo && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-4">
                  {errorNuevo}
                </p>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setModalNuevo(false)}
                  className="flex-1 border border-border text-text-muted font-medium rounded-lg py-2 transition-colors hover:bg-surface"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoNuevo}
                  className="flex-1 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg py-2 transition-colors disabled:opacity-60"
                >
                  {guardandoNuevo ? 'Guardando...' : 'Guardar Cliente y Trabajo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalAgregar && clienteActivo && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-sm border border-border w-full max-w-sm py-8 px-8">
            <h2 className="text-lg font-bold text-text mb-1">Agregar Trabajo</h2>
            <p className="text-sm text-text-muted mb-6">
              {clienteActivo.nombre} {clienteActivo.apellido}
            </p>

            <form onSubmit={handleAgregarTrabajo} className="flex flex-col">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-text mb-2">Trabajo Realizado</label>
                <input
                  value={trabajoRealizado}
                  onChange={(e) => setTrabajoRealizado(e.target.value)}
                  placeholder="Ej: Corte, Tinte"
                  required
                  className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="flex flex-col mt-4">
                <label className="text-sm font-medium text-text mb-2">Estilista</label>
                <input
                  value={estilista}
                  onChange={(e) => setEstilista(e.target.value)}
                  required
                  className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="flex flex-col mt-4">
                <label className="text-sm font-medium text-text mb-2">Fecha</label>
                <input
                  type="date"
                  value={fechaTrabajo}
                  onChange={(e) => setFechaTrabajo(e.target.value)}
                  required
                  className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                />
              </div>

              {errorTrabajo && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-4">
                  {errorTrabajo}
                </p>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setModalAgregar(false)}
                  className="flex-1 border border-border text-text-muted font-medium rounded-lg py-2 transition-colors hover:bg-surface"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoTrabajo}
                  className="flex-1 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg py-2 transition-colors disabled:opacity-60"
                >
                  {guardandoTrabajo ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalEditar && clienteActivo && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-sm border border-border w-full max-w-sm py-8 px-8">
            <h2 className="text-lg font-bold text-text mb-1">Editar Trabajo</h2>
            <p className="text-sm text-text-muted mb-6">
              {clienteActivo.nombre} {clienteActivo.apellido}
            </p>

            <form onSubmit={handleEditarTrabajo} className="flex flex-col">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-text mb-2">Trabajo Realizado</label>
                <input
                  value={trabajoRealizado}
                  onChange={(e) => setTrabajoRealizado(e.target.value)}
                  placeholder="Ej: Corte, Tinte"
                  required
                  className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="flex flex-col mt-4">
                <label className="text-sm font-medium text-text mb-2">Estilista</label>
                <input
                  value={estilista}
                  onChange={(e) => setEstilista(e.target.value)}
                  required
                  className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="flex flex-col mt-4">
                <label className="text-sm font-medium text-text mb-2">Fecha</label>
                <input
                  type="date"
                  value={fechaTrabajo}
                  onChange={(e) => setFechaTrabajo(e.target.value)}
                  required
                  className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                />
              </div>

              {errorTrabajo && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-4">
                  {errorTrabajo}
                </p>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setModalEditar(false)}
                  className="flex-1 border border-border text-text-muted font-medium rounded-lg py-2 transition-colors hover:bg-surface"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoTrabajo}
                  className="flex-1 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg py-2 transition-colors disabled:opacity-60"
                >
                  {guardandoTrabajo ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
