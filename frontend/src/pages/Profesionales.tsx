import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

interface Profesional {
  id: number
  nombre: string
  apellido: string
  tipo: 'ESTILISTA' | 'MANICURA' | 'AYUDANTE'
  porcentaje: string | null
  sueldoBase: string | null
  activo: boolean
}

const TIPO_BADGE: Record<Profesional['tipo'], string> = {
  ESTILISTA: 'bg-[#EDE9FE] text-primary',
  MANICURA: 'bg-pink-50 text-pink-600',
  AYUDANTE: 'bg-gray-100 text-gray-600',
}

const TIPO_LABEL: Record<Profesional['tipo'], string> = {
  ESTILISTA: 'Estilista',
  MANICURA: 'Manicura',
  AYUDANTE: 'Ayudante',
}

export default function Profesionales() {
  const [profesionales, setProfesionales] = useState<Profesional[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<Profesional | null>(null)
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [tipo, setTipo] = useState<Profesional['tipo']>('ESTILISTA')
  const [porcentaje, setPorcentaje] = useState('')
  const [sueldoBase, setSueldoBase] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorModal, setErrorModal] = useState('')

  const fetchProfesionales = async () => {
    setCargando(true)
    try {
      const { data } = await api.get('/profesionales')
      setProfesionales(data)
    } catch {
      setError('No se pudieron cargar los profesionales')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    fetchProfesionales()
  }, [])

  const abrirNuevo = () => {
    setEditando(null)
    setNombre('')
    setApellido('')
    setTipo('ESTILISTA')
    setPorcentaje('')
    setSueldoBase('')
    setErrorModal('')
    setModalAbierto(true)
  }

  const abrirEditar = (p: Profesional) => {
    setEditando(p)
    setNombre(p.nombre)
    setApellido(p.apellido)
    setTipo(p.tipo)
    setPorcentaje(p.porcentaje ?? '')
    setSueldoBase(p.sueldoBase ?? '')
    setErrorModal('')
    setModalAbierto(true)
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorModal('')
    setGuardando(true)

    const esComision = tipo === 'ESTILISTA' || tipo === 'MANICURA'
    const body = {
      nombre,
      apellido,
      tipo,
      porcentaje: esComision && porcentaje ? Number(porcentaje) : undefined,
      sueldoBase: !esComision && sueldoBase ? Number(sueldoBase) : undefined,
    }

    try {
      if (editando) {
        await api.put(`/profesionales/${editando.id}`, body)
      } else {
        await api.post('/profesionales', body)
      }
      setModalAbierto(false)
      await fetchProfesionales()
    } catch (err: any) {
      setErrorModal(err.response?.data?.error ?? 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async (p: Profesional) => {
    const confirmar = window.confirm(`¿Eliminar a ${p.nombre} ${p.apellido}?`)
    if (!confirmar) return

    try {
      await api.delete(`/profesionales/${p.id}`)
      setProfesionales((prev) => prev.filter((item) => item.id !== p.id))
    } catch {
      setError('Error al eliminar el profesional')
    }
  }

  const esComision = tipo === 'ESTILISTA' || tipo === 'MANICURA'

  return (
    <Layout titulo="Profesionales">
      <div className="flex justify-end mb-4">
        <button
          onClick={abrirNuevo}
          className="bg-primary hover:bg-primary-dark text-white font-medium rounded-lg px-4 py-2 transition-colors"
        >
          Nuevo Profesional
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
              <th className="px-5 py-3 font-medium">Tipo</th>
              <th className="px-5 py-3 font-medium">Comisión / Sueldo</th>
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
            ) : profesionales.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-text-muted">
                  No hay profesionales cargados
                </td>
              </tr>
            ) : (
              profesionales.map((p, i) => (
                <tr
                  key={p.id}
                  className={`border-b border-border last:border-0 ${i % 2 === 1 ? 'bg-surface' : ''}`}
                >
                  <td className="px-5 py-3 text-text font-medium">
                    {p.nombre} {p.apellido}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${TIPO_BADGE[p.tipo]}`}>
                      {TIPO_LABEL[p.tipo]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-text">
                    {p.tipo === 'AYUDANTE'
                      ? p.sueldoBase
                        ? `$${Number(p.sueldoBase).toLocaleString('es-AR')}`
                        : '—'
                      : p.porcentaje
                        ? `${Number(p.porcentaje)}%`
                        : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        p.activo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => abrirEditar(p)}
                      className="text-primary hover:text-primary-dark font-medium mr-4 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleEliminar(p)}
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
              {editando ? 'Editar profesional' : 'Nuevo profesional'}
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
                <label className="text-sm font-medium text-text mb-2">Apellido</label>
                <input
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  required
                  className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="flex flex-col mt-4">
                <label className="text-sm font-medium text-text mb-2">Tipo</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as Profesional['tipo'])}
                  className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors bg-white"
                >
                  <option value="ESTILISTA">Estilista</option>
                  <option value="MANICURA">Manicura</option>
                  <option value="AYUDANTE">Ayudante</option>
                </select>
              </div>

              {esComision ? (
                <div className="flex flex-col mt-4">
                  <label className="text-sm font-medium text-text mb-2">Comisión %</label>
                  <input
                    type="number"
                    value={porcentaje}
                    onChange={(e) => setPorcentaje(e.target.value)}
                    className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                  />
                </div>
              ) : (
                <div className="flex flex-col mt-4">
                  <label className="text-sm font-medium text-text mb-2">Sueldo base $</label>
                  <input
                    type="number"
                    value={sueldoBase}
                    onChange={(e) => setSueldoBase(e.target.value)}
                    className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                  />
                </div>
              )}

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
