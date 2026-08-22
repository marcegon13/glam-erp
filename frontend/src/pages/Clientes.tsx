import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import ModalCliente from '../components/ModalCliente'
import api from '../api/axios'

interface Cliente {
  id: number
  nombre: string
  apellido: string
  telefono: string | null
  email: string | null
  ultimaVisita?: string | null
}

const LIMITE = 10

const formatoFecha = (fecha: string | null | undefined) =>
  fecha ? new Date(fecha).toLocaleDateString('es-AR') : '—'

export default function Clientes() {
  const navigate = useNavigate()

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [enModoBusqueda, setEnModoBusqueda] = useState(false)

  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)

  const fetchClientes = async (paginaDestino = page) => {
    setCargando(true)
    try {
      const { data } = await api.get('/clientes', { params: { page: paginaDestino, limit: LIMITE } })
      setClientes(data.data)
      setTotal(data.total)
      setPage(data.page)
    } catch {
      setError('No se pudieron cargar los clientes')
    } finally {
      setCargando(false)
    }
  }

  const fetchBusqueda = async (texto: string) => {
    setBuscando(true)
    try {
      const { data } = await api.get('/clientes/buscar', { params: { q: texto } })
      setEnModoBusqueda(true)
      setClientes(data)
    } catch {
      setClientes([])
    } finally {
      setBuscando(false)
    }
  }

  useEffect(() => {
    if (!busqueda.trim()) {
      setEnModoBusqueda(false)
      fetchClientes(1)
      return
    }

    const timeout = setTimeout(() => fetchBusqueda(busqueda), 400)
    return () => clearTimeout(timeout)
  }, [busqueda])

  const cambiarPagina = (nuevaPagina: number) => {
    fetchClientes(nuevaPagina)
  }

  const abrirNuevo = () => {
    setEditando(null)
    setModalAbierto(true)
  }

  const abrirEditar = (cliente: Cliente) => {
    setEditando(cliente)
    setModalAbierto(true)
  }

  const handleGuardado = () => {
    if (enModoBusqueda) {
      fetchBusqueda(busqueda)
    } else {
      fetchClientes(page)
    }
  }

  const totalPaginas = Math.max(Math.ceil(total / LIMITE), 1)

  return (
    <Layout titulo="Clientes">
      <div className="flex items-center justify-between gap-4 mb-4">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, apellido o teléfono..."
          className="flex-1 bg-white border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary transition-colors shadow-sm"
        />
        <button
          onClick={abrirNuevo}
          className="bg-primary hover:bg-primary-dark text-white font-medium rounded-lg px-4 py-2 transition-colors whitespace-nowrap"
        >
          Nuevo Cliente
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-muted border-b border-border">
              <th className="px-5 py-3 font-medium">Nombre</th>
              <th className="px-5 py-3 font-medium">Apellido</th>
              <th className="px-5 py-3 font-medium">Teléfono</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Última visita</th>
              <th className="px-5 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando || buscando ? (
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
                  <td className="px-5 py-3 text-text font-medium">{c.nombre}</td>
                  <td className="px-5 py-3 text-text">{c.apellido}</td>
                  <td className="px-5 py-3 text-text-muted">{c.telefono ?? '—'}</td>
                  <td className="px-5 py-3 text-text-muted">{c.email ?? '—'}</td>
                  <td className="px-5 py-3 text-text-muted">{formatoFecha(c.ultimaVisita)}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => navigate(`/clientes/${c.id}`)}
                      className="text-primary hover:text-primary-dark font-medium mr-4 transition-colors"
                    >
                      Ver Ficha
                    </button>
                    <button
                      onClick={() => abrirEditar(c)}
                      className="text-primary hover:text-primary-dark font-medium transition-colors"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!enModoBusqueda && !cargando && clientes.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-text-muted">
            Página {page} de {totalPaginas} · {total} clientes
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => cambiarPagina(page - 1)}
              disabled={page <= 1}
              className="border border-border text-text font-medium rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-surface disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              onClick={() => cambiarPagina(page + 1)}
              disabled={page >= totalPaginas}
              className="border border-border text-text font-medium rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-surface disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {modalAbierto && (
        <ModalCliente
          cliente={editando}
          onClose={() => setModalAbierto(false)}
          onSaved={handleGuardado}
        />
      )}
    </Layout>
  )
}
