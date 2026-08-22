import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

type Metodo = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'MERCADO_PAGO'
type Tipo = 'INGRESO' | 'EGRESO'

interface Movimiento {
  id: number
  tipo: Tipo
  metodo: Metodo
  monto: string
  concepto: string
  fecha: string
  acreditado: boolean
}

interface Totales {
  ingresos: number
  egresos: number
  balance: number
  totalAcreditado: number
  totalPendiente: number
}

const METODO_BADGE: Record<Metodo, string> = {
  EFECTIVO: 'bg-green-50 text-green-700',
  TARJETA: 'bg-blue-50 text-blue-700',
  TRANSFERENCIA: 'bg-[#EDE9FE] text-primary',
  MERCADO_PAGO: 'bg-sky-50 text-sky-700',
}

const METODO_LABEL: Record<Metodo, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
  MERCADO_PAGO: 'Mercado Pago',
}

const TIPO_BADGE: Record<Tipo, string> = {
  INGRESO: 'bg-green-50 text-green-700',
  EGRESO: 'bg-red-50 text-red-600',
}

const TIPO_LABEL: Record<Tipo, string> = {
  INGRESO: 'Ingreso',
  EGRESO: 'Egreso',
}

function hoyISO(): string {
  const hoy = new Date()
  const anio = hoy.getFullYear()
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

const formatoMoneda = (valor: number) => `$${valor.toLocaleString('es-AR')}`
const formatoHora = (fecha: string) =>
  new Date(fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

export default function Caja() {
  const [fecha, setFecha] = useState(hoyISO())
  const [tipoFiltro, setTipoFiltro] = useState('')

  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [totales, setTotales] = useState<Totales>({
    ingresos: 0,
    egresos: 0,
    balance: 0,
    totalAcreditado: 0,
    totalPendiente: 0,
  })
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [modalAbierto, setModalAbierto] = useState(false)
  const [nuevoTipo, setNuevoTipo] = useState<Tipo>('EGRESO')
  const [nuevoMetodo, setNuevoMetodo] = useState<Metodo>('EFECTIVO')
  const [nuevoMonto, setNuevoMonto] = useState('')
  const [nuevoConcepto, setNuevoConcepto] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorModal, setErrorModal] = useState('')

  const fetchCaja = async () => {
    setCargando(true)
    setError('')
    try {
      const { data } = await api.get('/caja', {
        params: { fecha, ...(tipoFiltro ? { tipo: tipoFiltro } : {}) },
      })
      setMovimientos(data.movimientos)
      setTotales(data.totales)
    } catch {
      setError('No se pudieron cargar los movimientos de caja')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    fetchCaja()
  }, [fecha, tipoFiltro])

  const abrirModal = () => {
    setNuevoTipo('EGRESO')
    setNuevoMetodo('EFECTIVO')
    setNuevoMonto('')
    setNuevoConcepto('')
    setErrorModal('')
    setModalAbierto(true)
  }

  const handleRegistrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorModal('')
    setGuardando(true)

    try {
      await api.post('/caja', {
        tipo: nuevoTipo,
        metodo: nuevoMetodo,
        monto: Number(nuevoMonto),
        concepto: nuevoConcepto,
      })
      setModalAbierto(false)
      await fetchCaja()
    } catch (err: any) {
      setErrorModal(err.response?.data?.error ?? 'Error al registrar el movimiento')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Layout titulo="Caja">
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
            <label className="text-sm font-medium text-text mb-2">Tipo</label>
            <select
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors bg-white min-w-[160px]"
            >
              <option value="">Todos</option>
              <option value="INGRESO">Ingresos</option>
              <option value="EGRESO">Egresos</option>
            </select>
          </div>
        </div>

        <button
          onClick={abrirModal}
          className="bg-primary hover:bg-primary-dark text-white font-medium rounded-lg px-4 py-2 transition-colors"
        >
          Registrar movimiento
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-border p-5">
          <p className="text-sm text-text-muted">✅ Acreditado</p>
          <p className="text-2xl font-bold text-green-700 mt-2">{formatoMoneda(totales.totalAcreditado)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-border p-5">
          <p className="text-sm text-text-muted">⏳ Pendiente</p>
          <p className="text-2xl font-bold text-amber-600 mt-2">{formatoMoneda(totales.totalPendiente)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-border p-5">
          <p className="text-sm text-text-muted">Total Egresos</p>
          <p className="text-2xl font-bold text-red-600 mt-2">{formatoMoneda(totales.egresos)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-border p-5">
          <p className="text-sm text-text-muted">Balance del día</p>
          <p className="text-2xl font-bold text-primary mt-2">{formatoMoneda(totales.balance)}</p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-muted border-b border-border">
              <th className="px-5 py-3 font-medium">Hora</th>
              <th className="px-5 py-3 font-medium">Concepto</th>
              <th className="px-5 py-3 font-medium">Método</th>
              <th className="px-5 py-3 font-medium">Tipo</th>
              <th className="px-5 py-3 font-medium text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-text-muted">
                  Cargando...
                </td>
              </tr>
            ) : movimientos.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-text-muted">
                  No hay movimientos para esta fecha
                </td>
              </tr>
            ) : (
              movimientos.map((m, i) => (
                <tr
                  key={m.id}
                  className={`border-b border-border last:border-0 ${i % 2 === 1 ? 'bg-surface' : ''}`}
                >
                  <td className="px-5 py-3 text-text-muted tabular-nums">{formatoHora(m.fecha)}</td>
                  <td className="px-5 py-3 text-text font-medium">{m.concepto}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${METODO_BADGE[m.metodo]}`}>
                      {!m.acreditado && '⏳ '}
                      {METODO_LABEL[m.metodo]}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${TIPO_BADGE[m.tipo]}`}>
                      {TIPO_LABEL[m.tipo]}
                    </span>
                  </td>
                  <td
                    className={`px-5 py-3 text-right font-semibold ${
                      m.tipo === 'INGRESO' ? 'text-green-700' : 'text-red-600'
                    }`}
                  >
                    {m.tipo === 'EGRESO' ? '-' : ''}
                    {formatoMoneda(Number(m.monto))}
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
            <h2 className="text-lg font-bold text-text mb-6">Registrar movimiento</h2>

            <form onSubmit={handleRegistrar} className="flex flex-col">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-text mb-2">Tipo</label>
                <select
                  value={nuevoTipo}
                  onChange={(e) => setNuevoTipo(e.target.value as Tipo)}
                  className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors bg-white"
                >
                  <option value="EGRESO">Egreso</option>
                  <option value="INGRESO">Ingreso</option>
                </select>
              </div>

              <div className="flex flex-col mt-4">
                <label className="text-sm font-medium text-text mb-2">Método</label>
                <select
                  value={nuevoMetodo}
                  onChange={(e) => setNuevoMetodo(e.target.value as Metodo)}
                  className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors bg-white"
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TARJETA">Tarjeta</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="MERCADO_PAGO">Mercado Pago</option>
                </select>
              </div>

              <div className="flex flex-col mt-4">
                <label className="text-sm font-medium text-text mb-2">Monto</label>
                <input
                  type="number"
                  value={nuevoMonto}
                  onChange={(e) => setNuevoMonto(e.target.value)}
                  required
                  className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="flex flex-col mt-4">
                <label className="text-sm font-medium text-text mb-2">Concepto</label>
                <input
                  value={nuevoConcepto}
                  onChange={(e) => setNuevoConcepto(e.target.value)}
                  placeholder="Ej: Pago a proveedor, compra de insumos..."
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
