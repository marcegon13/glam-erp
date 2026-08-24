import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

interface Vale {
  id: number
  monto: string
  concepto: string | null
  profesional: { nombre: string; apellido: string }
}

interface Gasto {
  id: number
  descripcion: string
  monto: string
  fecha: string
}

interface Resumen {
  totalEfectivoEntregado: number
  totalTarjetas: number
  totalVales: number
  totalGastos: number
  neto: number
}

function periodoActual(): string {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
}

const formatoMoneda = (valor: number) => `$${valor.toLocaleString('es-AR')}`

export default function GastosAdmin() {
  const [periodo, setPeriodo] = useState(periodoActual())

  const [vales, setVales] = useState<Vale[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState('')
  const [guardando, setGuardando] = useState(false)

  const fetchTodo = async () => {
    setCargando(true)
    setError('')
    try {
      const [valesRes, gastosRes, resumenRes] = await Promise.all([
        api.get('/vales', { params: { periodo } }),
        api.get('/gastos-admin', { params: { periodo } }),
        api.get('/gastos-admin/resumen', { params: { periodo } }),
      ])
      setVales(valesRes.data)
      setGastos(gastosRes.data)
      setResumen(resumenRes.data)
    } catch {
      setError('No se pudo cargar la información del período')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    fetchTodo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo])

  const handleAgregarGasto = async () => {
    if (!descripcion.trim() || !monto) return
    setGuardando(true)
    setError('')
    try {
      await api.post('/gastos-admin', {
        descripcion: descripcion.trim(),
        monto: Number(monto),
        periodo,
      })
      setDescripcion('')
      setMonto('')
      await fetchTodo()
    } catch {
      setError('Error al registrar el gasto')
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminarGasto = async (id: number) => {
    try {
      await api.delete(`/gastos-admin/${id}`)
      await fetchTodo()
    } catch {
      setError('No se pudo eliminar el gasto')
    }
  }

  const totalVales = vales.reduce((suma, v) => suma + Number(v.monto), 0)
  const totalGastos = gastos.reduce((suma, g) => suma + Number(g.monto), 0)

  return (
    <Layout titulo="Gastos Administrativos">
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
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      {cargando ? (
        <p className="text-text-muted">Cargando...</p>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Panel Vales */}
            <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
              <h3 className="font-semibold text-text mb-4">Vales</h3>
              {vales.length === 0 ? (
                <p className="text-sm text-text-muted">Sin vales registrados en este período</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-text-muted border-b border-border">
                      <th className="py-2 font-medium">Empleado</th>
                      <th className="py-2 font-medium text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vales.map((v) => (
                      <tr key={v.id} className="border-b border-border last:border-0">
                        <td className="py-2 text-text">
                          {v.profesional.nombre} {v.profesional.apellido}
                        </td>
                        <td className="py-2 text-text text-right">{formatoMoneda(Number(v.monto))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border font-semibold">
                      <td className="py-2 text-text">Total Vales</td>
                      <td className="py-2 text-text text-right">{formatoMoneda(totalVales)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            {/* Panel Gastos */}
            <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
              <h3 className="font-semibold text-text mb-4">Gastos fuera de planilla</h3>

              <div className="flex gap-3 items-start mb-4">
                <input
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Descripción"
                  className="flex-1 border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors text-sm"
                />
                <input
                  type="number"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="$"
                  className="w-28 border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors text-sm"
                />
                <button
                  onClick={handleAgregarGasto}
                  disabled={guardando || !descripcion.trim() || !monto}
                  className="bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg w-9.5 h-9.5 flex items-center justify-center transition-colors disabled:opacity-60"
                  title="Registrar gasto"
                >
                  +
                </button>
              </div>

              {gastos.length === 0 ? (
                <p className="text-sm text-text-muted">Sin gastos registrados en este período</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-text-muted border-b border-border">
                      <th className="py-2 font-medium">Descripción</th>
                      <th className="py-2 font-medium text-right">Monto</th>
                      <th className="py-2 font-medium text-right w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {gastos.map((g) => (
                      <tr key={g.id} className="border-b border-border last:border-0">
                        <td className="py-2 text-text">{g.descripcion}</td>
                        <td className="py-2 text-text text-right">{formatoMoneda(Number(g.monto))}</td>
                        <td className="py-2 text-right">
                          <button
                            onClick={() => handleEliminarGasto(g.id)}
                            title="Eliminar gasto"
                            className="text-text-muted hover:text-red-600 transition-colors"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border font-semibold">
                      <td className="py-2 text-text">Total Gastos</td>
                      <td className="py-2 text-text text-right" colSpan={2}>
                        {formatoMoneda(totalGastos)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>

          {/* Panel Resumen */}
          {resumen && (
            <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
              <h3 className="font-semibold text-text mb-4">Resumen</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-6">
                <div className="flex flex-col">
                  <span className="text-text-muted">EF entregado</span>
                  <span className="font-medium text-text">{formatoMoneda(resumen.totalEfectivoEntregado)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-text-muted">Total Tarjetas</span>
                  <span className="font-medium text-text">{formatoMoneda(resumen.totalTarjetas)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-text-muted">Total Vales</span>
                  <span className="font-medium text-text">{formatoMoneda(resumen.totalVales)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-text-muted">Total Gastos Admin</span>
                  <span className="font-medium text-text">{formatoMoneda(resumen.totalGastos)}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-between">
                <span className="text-sm text-text-muted">
                  EF entregado − (Vales + Gastos) = <span className="font-medium text-text">Neto del período</span>
                </span>
                <span
                  className={`text-3xl font-bold ${resumen.neto >= 0 ? 'text-primary' : 'text-red-600'}`}
                >
                  {formatoMoneda(resumen.neto)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}
