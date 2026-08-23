import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

interface Profesional {
  id: number
  nombre: string
  apellido: string
}

interface Vale {
  id: number
  monto: string
  concepto: string | null
  fecha: string
  periodo: string
  descontado: boolean
  profesional: Profesional
}

function periodoActual(): string {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
}

function hoyISO(): string {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
}

const formatoMoneda = (valor: string) => `$${Number(valor).toLocaleString('es-AR')}`
const formatoFecha = (fecha: string) => fecha.slice(0, 10).split('-').reverse().join('/')

export default function Vales() {
  const [periodo, setPeriodo] = useState(periodoActual())
  const [profesionales, setProfesionales] = useState<Profesional[]>([])

  const [vales, setVales] = useState<Vale[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [modalAbierto, setModalAbierto] = useState(false)
  const [profesionalId, setProfesionalId] = useState('')
  const [monto, setMonto] = useState('')
  const [concepto, setConcepto] = useState('')
  const [fecha, setFecha] = useState(hoyISO())
  const [guardando, setGuardando] = useState(false)
  const [errorModal, setErrorModal] = useState('')

  useEffect(() => {
    api
      .get('/profesionales')
      .then(({ data }) => setProfesionales(data))
      .catch(() => setProfesionales([]))
  }, [])

  const fetchVales = async () => {
    setCargando(true)
    setError('')
    try {
      const { data } = await api.get('/vales', { params: { periodo } })
      setVales(data)
    } catch {
      setError('No se pudieron cargar los vales')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    fetchVales()
  }, [periodo])

  const abrirModal = () => {
    setProfesionalId('')
    setMonto('')
    setConcepto('')
    setFecha(hoyISO())
    setErrorModal('')
    setModalAbierto(true)
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorModal('')
    setGuardando(true)

    try {
      await api.post('/vales', {
        profesionalId: Number(profesionalId),
        monto: Number(monto),
        concepto: concepto || undefined,
        periodo,
        fecha,
      })
      setModalAbierto(false)
      await fetchVales()
    } catch (err: any) {
      setErrorModal(err.response?.data?.error ?? 'Error al guardar el vale')
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async (vale: Vale) => {
    const confirmar = window.confirm(
      `¿Eliminar el vale de ${vale.profesional.nombre} ${vale.profesional.apellido} por ${formatoMoneda(vale.monto)}?`
    )
    if (!confirmar) return

    try {
      await api.delete(`/vales/${vale.id}`)
      setVales((prev) => prev.filter((v) => v.id !== vale.id))
    } catch {
      setError('No se pudo eliminar el vale')
    }
  }

  return (
    <Layout titulo="Vales">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div className="flex flex-col">
          <label className="text-sm font-medium text-text mb-2">Período</label>
          <input
            type="month"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors bg-white"
          />
        </div>

        <button
          onClick={abrirModal}
          className="bg-primary hover:bg-primary-dark text-white font-medium rounded-lg px-4 py-2 transition-colors"
        >
          Nuevo Vale
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-muted border-b border-border">
              <th className="px-5 py-3 font-medium">Profesional</th>
              <th className="px-5 py-3 font-medium">Monto</th>
              <th className="px-5 py-3 font-medium">Concepto</th>
              <th className="px-5 py-3 font-medium">Fecha</th>
              <th className="px-5 py-3 font-medium">Estado</th>
              <th className="px-5 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-text-muted">
                  Cargando...
                </td>
              </tr>
            ) : vales.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-text-muted">
                  No hay vales registrados en este período
                </td>
              </tr>
            ) : (
              vales.map((v, i) => (
                <tr
                  key={v.id}
                  className={`border-b border-border last:border-0 ${i % 2 === 1 ? 'bg-surface' : ''}`}
                >
                  <td className="px-5 py-3 text-text font-medium">
                    {v.profesional.nombre} {v.profesional.apellido}
                  </td>
                  <td className="px-5 py-3 text-text">{formatoMoneda(v.monto)}</td>
                  <td className="px-5 py-3 text-text-muted">{v.concepto ?? '—'}</td>
                  <td className="px-5 py-3 text-text-muted">{formatoFecha(v.fecha)}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        v.descontado ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-600'
                      }`}
                    >
                      {v.descontado ? 'Descontado' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {!v.descontado && (
                      <button
                        onClick={() => handleEliminar(v)}
                        className="text-red-600 hover:text-red-700 font-medium transition-colors"
                      >
                        Eliminar
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
          <div className="bg-white rounded-2xl shadow-sm border border-border w-full max-w-sm py-8 px-8">
            <h2 className="text-lg font-bold text-text mb-6">Nuevo vale</h2>

            <form onSubmit={handleGuardar} className="flex flex-col">
              <div className="flex flex-col">
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

              <div className="flex flex-col mt-4">
                <label className="text-sm font-medium text-text mb-2">Monto</label>
                <input
                  type="number"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  required
                  className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="flex flex-col mt-4">
                <label className="text-sm font-medium text-text mb-2">
                  Concepto <span className="text-text-muted font-normal">(opcional)</span>
                </label>
                <input
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  placeholder="Ej: Adelanto de sueldo"
                  className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="flex flex-col mt-4">
                <label className="text-sm font-medium text-text mb-2">Fecha</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
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
