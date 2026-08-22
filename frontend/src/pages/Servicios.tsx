import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

interface Servicio {
  id: number
  nombre: string
  precio: string
  tipo: 'PELUQUERIA' | 'MANICURIA' | 'PRODUCTO'
  activo: boolean
}

const TIPO_BADGE: Record<Servicio['tipo'], string> = {
  PELUQUERIA: 'bg-[#EDE9FE] text-primary',
  MANICURIA: 'bg-pink-50 text-pink-600',
  PRODUCTO: 'bg-gray-100 text-gray-600',
}

const TIPO_LABEL: Record<Servicio['tipo'], string> = {
  PELUQUERIA: 'Peluquería',
  MANICURIA: 'Manicuría',
  PRODUCTO: 'Producto',
}

const formatoMoneda = (valor: string) => `$${Number(valor).toLocaleString('es-AR')}`

export default function Servicios() {
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<Servicio | null>(null)
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<Servicio['tipo']>('PELUQUERIA')
  const [precio, setPrecio] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorModal, setErrorModal] = useState('')

  const fetchServicios = async () => {
    setCargando(true)
    try {
      const { data } = await api.get('/servicios')
      setServicios(data)
    } catch {
      setError('No se pudieron cargar los servicios')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    fetchServicios()
  }, [])

  const abrirNuevo = () => {
    setEditando(null)
    setNombre('')
    setTipo('PELUQUERIA')
    setPrecio('')
    setErrorModal('')
    setModalAbierto(true)
  }

  const abrirEditar = (s: Servicio) => {
    setEditando(s)
    setNombre(s.nombre)
    setTipo(s.tipo)
    setPrecio(s.precio)
    setErrorModal('')
    setModalAbierto(true)
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorModal('')
    setGuardando(true)

    const body = { nombre, tipo, precio: Number(precio) }

    try {
      if (editando) {
        await api.put(`/servicios/${editando.id}`, body)
      } else {
        await api.post('/servicios', body)
      }
      setModalAbierto(false)
      await fetchServicios()
    } catch (err: any) {
      setErrorModal(err.response?.data?.error ?? 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async (s: Servicio) => {
    const confirmar = window.confirm(`¿Eliminar el servicio "${s.nombre}"?`)
    if (!confirmar) return

    try {
      await api.delete(`/servicios/${s.id}`)
      setServicios((prev) => prev.filter((item) => item.id !== s.id))
    } catch {
      setError('Error al eliminar el servicio')
    }
  }

  return (
    <Layout titulo="Servicios">
      <div className="flex justify-end mb-4">
        <button
          onClick={abrirNuevo}
          className="bg-primary hover:bg-primary-dark text-white font-medium rounded-lg px-4 py-2 transition-colors"
        >
          Nuevo Servicio
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
              <th className="px-5 py-3 font-medium">Servicio</th>
              <th className="px-5 py-3 font-medium">Tipo</th>
              <th className="px-5 py-3 font-medium">Precio</th>
              <th className="px-5 py-3 font-medium">Estado</th>
              <th className="px-5 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-text-muted">
                  Cargando...
                </td>
              </tr>
            ) : servicios.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-text-muted">
                  No hay servicios cargados
                </td>
              </tr>
            ) : (
              servicios.map((s, i) => (
                <tr
                  key={s.id}
                  className={`border-b border-border last:border-0 ${i % 2 === 1 ? 'bg-surface' : ''}`}
                >
                  <td className="px-5 py-3 text-text font-medium">{s.nombre}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${TIPO_BADGE[s.tipo]}`}>
                      {TIPO_LABEL[s.tipo]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-text">{formatoMoneda(s.precio)}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        s.activo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {s.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => abrirEditar(s)}
                      className="text-primary hover:text-primary-dark font-medium mr-4 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleEliminar(s)}
                      className="text-red-600 hover:text-red-700 font-medium transition-colors"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-sm border border-border w-full max-w-sm py-8 px-8">
            <h2 className="text-lg font-bold text-text mb-6">
              {editando ? 'Editar servicio' : 'Nuevo servicio'}
            </h2>

            <form onSubmit={handleGuardar} className="flex flex-col">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-text mb-2">Nombre</label>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="flex flex-col mt-4">
                <label className="text-sm font-medium text-text mb-2">Tipo</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as Servicio['tipo'])}
                  className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors bg-white"
                >
                  <option value="PELUQUERIA">Peluquería</option>
                  <option value="MANICURIA">Manicuría</option>
                  <option value="PRODUCTO">Producto</option>
                </select>
              </div>

              <div className="flex flex-col mt-4">
                <label className="text-sm font-medium text-text mb-2">Precio</label>
                <input
                  type="number"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  required
                  className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
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
                  disabled={guardando}
                  className="flex-1 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg py-2 transition-colors disabled:opacity-60"
                >
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
