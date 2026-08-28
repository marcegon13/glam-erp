import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/axios'

type TipoTurno = 'MANIANA' | 'TARDE'

interface Turno {
  id: number
  tipo: TipoTurno
  cajera: string
  fondoCambio: string
  estado: 'ABIERTO' | 'CERRADO'
  efectivoContado: string | null
  diferencia: string | null
  observaciones: string | null
  abiertaEn: string
  cerradaEn: string | null
}

interface Resumen {
  porMetodo: {
    EFECTIVO: number
    TARJETA: number
    TRANSFERENCIA: number
    MERCADO_PAGO: number
    TARJETA_DEBITO: number
    TARJETA_CREDITO: number
  }
  debe: number
  totalIngresos: number
  totalEgresos: number
  egresosEfectivo: number
  egresosDetalle: { id: number; concepto: string; monto: number }[]
  fondoCambio: number
  efectivoEsperado: number
}

const TIPO_LABEL: Record<TipoTurno, string> = {
  MANIANA: 'Mañana',
  TARDE: 'Tarde',
}

const FILAS_INGRESOS: { key: keyof Resumen['porMetodo']; label: string }[] = [
  { key: 'EFECTIVO', label: 'Efectivo' },
  { key: 'TARJETA_DEBITO', label: 'Tarjeta Débito' },
  { key: 'TARJETA_CREDITO', label: 'Tarjeta Crédito' },
  { key: 'MERCADO_PAGO', label: 'Mercado Pago' },
  { key: 'TRANSFERENCIA', label: 'Transferencia' },
]

const FONDO_CAMBIO_DEFAULT = 5000

const formatoMoneda = (valor: number) => `$${valor.toLocaleString('es-AR')}`
const formatoDif = (valor: number) =>
  `${valor > 0 ? '+' : valor < 0 ? '−' : ''}$${Math.abs(valor).toLocaleString('es-AR')}`
const formatoHora = (fecha: string) =>
  new Date(fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
const formatoFecha = (fecha: string) =>
  new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

/* ── Piezas de la planilla ─────────────────────────────────────────────── */

function SeccionHeader({ children }: { children: React.ReactNode }) {
  return (
    <tr>
      <td
        colSpan={3}
        className="bg-[#F1F0F7] text-[#1A1A2E] font-bold tracking-wide text-xs uppercase px-4 py-2 border-y border-border"
      >
        {children}
      </td>
    </tr>
  )
}

function Fila({
  label,
  valor,
  negrita,
  className = '',
  signo,
}: {
  label: React.ReactNode
  valor: number
  negrita?: boolean
  className?: string
  signo?: '−' | '+'
}) {
  return (
    <tr className={`border-b border-border last:border-0 ${className}`}>
      <td className={`px-4 py-2 ${negrita ? 'font-bold text-text' : 'text-text-muted'}`} colSpan={2}>
        {label}
      </td>
      <td className={`px-4 py-2 text-right tabular-nums ${negrita ? 'font-bold text-text' : 'text-text'}`}>
        {signo && <span className="text-text-muted mr-0.5">{signo}</span>}
        {formatoMoneda(valor)}
      </td>
    </tr>
  )
}

/* ── Página ────────────────────────────────────────────────────────────── */

export default function CierreTurno() {
  const [cargando, setCargando] = useState(true)
  const [turno, setTurno] = useState<Turno | null>(null)
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [error, setError] = useState('')

  const [cajeraNombre, setCajeraNombre] = useState('')
  const [fondoCambio, setFondoCambio] = useState(String(FONDO_CAMBIO_DEFAULT))
  const [abriendo, setAbriendo] = useState<TipoTurno | null>(null)

  const [efectivoContado, setEfectivoContado] = useState('')
  const [modalCierre, setModalCierre] = useState(false)
  const [observaciones, setObservaciones] = useState('')
  const [cerrando, setCerrando] = useState(false)
  const [errorModal, setErrorModal] = useState('')

  const [cierreFinal, setCierreFinal] = useState<{ turno: Turno; resumen: Resumen } | null>(null)

  const [nuevoConcepto, setNuevoConcepto] = useState('')
  const [nuevoMonto, setNuevoMonto] = useState('')
  const [guardandoEgreso, setGuardandoEgreso] = useState(false)
  const [errorEgreso, setErrorEgreso] = useState('')
  const [eliminandoId, setEliminandoId] = useState<number | null>(null)

  const fetchActivo = async () => {
    setCargando(true)
    setError('')
    try {
      const { data } = await api.get('/turnos-caja/activo')
      setTurno(data.turno)
      setResumen(data.resumen)
    } catch {
      setError('No se pudo cargar el turno activo')
    } finally {
      setCargando(false)
    }
  }

  const refrescarResumen = async () => {
    try {
      const { data } = await api.get('/turnos-caja/activo')
      setTurno(data.turno)
      setResumen(data.resumen)
    } catch {
      setError('No se pudo actualizar el resumen del turno')
    }
  }

  const handleAgregarEgreso = async () => {
    if (!nuevoConcepto.trim() || !nuevoMonto) return
    setErrorEgreso('')
    setGuardandoEgreso(true)
    try {
      await api.post('/caja', {
        tipo: 'EGRESO',
        metodo: 'EFECTIVO',
        monto: Number(nuevoMonto),
        concepto: nuevoConcepto.trim(),
      })
      setNuevoConcepto('')
      setNuevoMonto('')
      await refrescarResumen()
    } catch (err: any) {
      setErrorEgreso(err.response?.data?.error ?? 'Error al registrar el egreso')
    } finally {
      setGuardandoEgreso(false)
    }
  }

  const handleEliminarEgreso = async (id: number) => {
    setEliminandoId(id)
    try {
      await api.delete(`/caja/${id}`)
      await refrescarResumen()
    } catch {
      setError('No se pudo eliminar el egreso')
    } finally {
      setEliminandoId(null)
    }
  }

  useEffect(() => {
    fetchActivo()
  }, [])

  const handleAbrirTurno = async (tipo: TipoTurno) => {
    if (!cajeraNombre.trim() || !fondoCambio) return
    setError('')
    setAbriendo(tipo)
    try {
      await api.post('/turnos-caja/abrir', {
        tipo,
        cajera: cajeraNombre,
        fondoCambio: Number(fondoCambio),
      })
      await fetchActivo()
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Error al abrir el turno')
    } finally {
      setAbriendo(null)
    }
  }

  const diferenciaPreview =
    turno && resumen && efectivoContado !== '' ? Number(efectivoContado) - resumen.efectivoEsperado : null

  const abrirModalCierre = () => {
    setObservaciones('')
    setErrorModal('')
    setModalCierre(true)
  }

  const handleConfirmarCierre = async () => {
    if (!turno || efectivoContado === '') return
    setErrorModal('')
    setCerrando(true)
    try {
      const { data } = await api.post(`/turnos-caja/${turno.id}/cerrar`, {
        efectivoContado: Number(efectivoContado),
        observaciones: observaciones || undefined,
      })
      setModalCierre(false)
      setCierreFinal(data)
      setTurno(null)
      setResumen(null)
    } catch (err: any) {
      setErrorModal(err.response?.data?.error ?? 'Error al cerrar el turno')
    } finally {
      setCerrando(false)
    }
  }

  const handleVolver = () => {
    setCierreFinal(null)
    setCajeraNombre('')
    setFondoCambio(String(FONDO_CAMBIO_DEFAULT))
    setEfectivoContado('')
    fetchActivo()
  }

  if (cargando) {
    return (
      <Layout titulo="Cierre de Turno">
        <p className="text-text-muted">Cargando...</p>
      </Layout>
    )
  }

  /* ── Vista: no hay turno abierto → apertura ──────────────────────────── */
  if (!turno && !cierreFinal) {
    return (
      <Layout titulo="Cierre de Turno">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-border p-6">
          <h2 className="font-semibold text-text mb-4">Abrir turno de caja</h2>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>
          )}

          <div className="flex flex-col">
            <label className="text-sm font-medium text-text mb-2">Nombre de la cajera</label>
            <input
              value={cajeraNombre}
              onChange={(e) => setCajeraNombre(e.target.value)}
              placeholder="Ej: Sofía Ruiz"
              className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex flex-col mt-4">
            <label className="text-sm font-medium text-text mb-2">Fondo de cambio $</label>
            <input
              type="number"
              value={fondoCambio}
              onChange={(e) => setFondoCambio(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <button
              onClick={() => handleAbrirTurno('MANIANA')}
              disabled={!cajeraNombre.trim() || !fondoCambio || abriendo !== null}
              className="flex flex-col items-center gap-2 border-2 border-border rounded-2xl py-8 hover:border-primary hover:bg-[#EDE9FE] transition-colors disabled:opacity-60"
            >
              <span className="text-4xl">☀️</span>
              <span className="font-medium text-text">
                {abriendo === 'MANIANA' ? 'Abriendo...' : 'Abrir Turno Mañana'}
              </span>
            </button>
            <button
              onClick={() => handleAbrirTurno('TARDE')}
              disabled={!cajeraNombre.trim() || !fondoCambio || abriendo !== null}
              className="flex flex-col items-center gap-2 border-2 border-border rounded-2xl py-8 hover:border-primary hover:bg-[#EDE9FE] transition-colors disabled:opacity-60"
            >
              <span className="text-4xl">🌙</span>
              <span className="font-medium text-text">
                {abriendo === 'TARDE' ? 'Abriendo...' : 'Abrir Turno Tarde'}
              </span>
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  /* ── Datos de la planilla (turno abierto o recién cerrado) ───────────── */
  const t = (turno ?? cierreFinal!.turno)
  const r = (resumen ?? cierreFinal!.resumen)
  const soloLectura = !turno
  const efectivoNeto = r.efectivoEsperado
  const contadoNum = soloLectura ? Number(t.efectivoContado) : Number(efectivoContado)
  const diferencia = soloLectura
    ? Number(t.diferencia)
    : diferenciaPreview
  const cuadra = diferencia === 0

  return (
    <Layout titulo="Cierre de Turno">
      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        {/* Encabezado de la planilla */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full bg-[#EDE9FE] text-primary">
            {t.tipo === 'MANIANA' ? '☀️' : '🌙'} Turno {TIPO_LABEL[t.tipo]}
            {soloLectura && ' · Cerrado'}
          </span>
          <span className="text-sm text-text-muted">
            {formatoFecha(t.abiertaEn)} · {t.cajera} · {formatoHora(t.abiertaEn)}
            {t.cerradaEn && ` – ${formatoHora(t.cerradaEn)}`}
          </span>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
        )}

        {/* Planilla */}
        <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-bold text-text tracking-wide">PLANILLA DE CAJA</h2>
          </div>

          <table className="w-full text-sm">
            <tbody>
              {/* INGRESOS */}
              <SeccionHeader>Ingresos</SeccionHeader>
              {FILAS_INGRESOS.map((fila) => (
                <Fila key={fila.key} label={fila.label} valor={r.porMetodo[fila.key] ?? 0} />
              ))}
              <Fila
                label={<span className="italic">Debe (pendiente de acreditación)</span>}
                valor={r.debe}
                className="bg-amber-50/60"
              />
              <Fila label="TOTAL INGRESOS" valor={r.totalIngresos} negrita className="bg-[#FAFAFC]" />

              {/* EGRESOS */}
              <SeccionHeader>Egresos</SeccionHeader>
              {r.egresosDetalle.length === 0 && !soloLectura && (
                <tr className="border-b border-border">
                  <td colSpan={3} className="px-4 py-2 text-text-muted italic">
                    Sin egresos registrados en este turno
                  </td>
                </tr>
              )}
              {r.egresosDetalle.map((egreso) => (
                <tr key={egreso.id} className="border-b border-border">
                  <td className="px-4 py-2 text-text-muted" colSpan={2}>
                    {egreso.concepto}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-text">
                    <span className="inline-flex items-center gap-2 justify-end">
                      {formatoMoneda(egreso.monto)}
                      {!soloLectura && (
                        <button
                          onClick={() => handleEliminarEgreso(egreso.id)}
                          disabled={eliminandoId === egreso.id}
                          title="Eliminar egreso"
                          className="text-text-muted hover:text-red-600 transition-colors disabled:opacity-40"
                        >
                          ✕
                        </button>
                      )}
                    </span>
                  </td>
                </tr>
              ))}

              {/* Alta rápida de egreso */}
              {!soloLectura && (
                <tr className="border-b border-border bg-[#FAFAFC]">
                  <td colSpan={3} className="px-4 py-3">
                    <div className="flex gap-2 items-start">
                      <input
                        value={nuevoConcepto}
                        onChange={(e) => setNuevoConcepto(e.target.value)}
                        placeholder="Concepto del egreso"
                        className="flex-1 border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors text-sm"
                      />
                      <input
                        type="number"
                        value={nuevoMonto}
                        onChange={(e) => setNuevoMonto(e.target.value)}
                        placeholder="$"
                        className="w-28 border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors text-sm"
                      />
                      <button
                        onClick={handleAgregarEgreso}
                        disabled={guardandoEgreso || !nuevoConcepto.trim() || !nuevoMonto}
                        className="bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg w-10 h-[38px] flex items-center justify-center transition-colors disabled:opacity-60 shrink-0"
                        title="Agregar egreso"
                      >
                        +
                      </button>
                    </div>
                    {errorEgreso && <p className="text-sm text-red-600 mt-2">{errorEgreso}</p>}
                  </td>
                </tr>
              )}
              <Fila label="TOTAL EGRESOS" valor={r.totalEgresos} negrita className="bg-[#FAFAFC]" />

              {/* RESUMEN FINAL */}
              <SeccionHeader>Resumen final</SeccionHeader>
              <Fila label="Fondo de cambio inicial" valor={r.fondoCambio} />
              <Fila label="Total ingresos efectivo" valor={r.porMetodo.EFECTIVO} signo="+" />
              <Fila label="Total egresos efectivo" valor={r.egresosEfectivo} signo="−" />
              <tr className="border-b border-border last:border-0 bg-[#EDE9FE]">
                <td className="px-4 py-3 font-bold text-primary tracking-wide" colSpan={2}>
                  EFECTIVO NETO EN CAJA
                </td>
                <td className="px-4 py-3 text-right font-bold text-primary text-lg tabular-nums">
                  {formatoMoneda(efectivoNeto)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Arqueo */}
          <div className="px-4 py-4 border-t border-border flex flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
              <label className="text-sm font-medium text-text">Efectivo contado físicamente $</label>
              {soloLectura ? (
                <span className="text-sm font-medium text-text tabular-nums">{formatoMoneda(contadoNum)}</span>
              ) : (
                <input
                  type="number"
                  value={efectivoContado}
                  onChange={(e) => setEfectivoContado(e.target.value)}
                  placeholder="0"
                  className="w-40 border border-border rounded-lg px-3 py-2 text-right outline-none focus:border-primary transition-colors"
                />
              )}
            </div>

            {diferencia !== null && (efectivoContado !== '' || soloLectura) && (
              <div
                className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                  cuadra ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                <span className={`text-sm font-medium ${cuadra ? 'text-green-700' : 'text-red-600'}`}>
                  {cuadra ? 'Caja cuadrada' : 'Diferencia'}
                </span>
                <span className={`text-base font-bold tabular-nums ${cuadra ? 'text-green-700' : 'text-red-600'}`}>
                  {formatoDif(diferencia)}
                </span>
              </div>
            )}

            {soloLectura && t.observaciones && (
              <p className="text-sm text-text-muted">
                <span className="font-medium text-text">Observaciones: </span>
                {t.observaciones}
              </p>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex justify-end">
          {soloLectura ? (
            <button
              onClick={handleVolver}
              className="border border-border text-text font-medium rounded-lg px-5 py-2.5 transition-colors hover:bg-surface"
            >
              Volver
            </button>
          ) : (
            <button
              onClick={abrirModalCierre}
              disabled={efectivoContado === ''}
              className="bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg px-6 py-2.5 transition-colors disabled:opacity-60"
            >
              Cerrar Turno
            </button>
          )}
        </div>
      </div>

      {/* Modal de confirmación */}
      {modalCierre && resumen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4 z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl shadow-sm border border-border w-full max-w-md py-8 px-8">
            <h2 className="text-lg font-bold text-text mb-6">Confirmar cierre de turno</h2>

            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Total ingresos</span>
                <span className="text-text font-medium tabular-nums">{formatoMoneda(resumen.totalIngresos)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Total egresos</span>
                <span className="text-text font-medium tabular-nums">{formatoMoneda(resumen.totalEgresos)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="font-bold text-primary">Efectivo neto en caja</span>
                <span className="font-bold text-primary tabular-nums">{formatoMoneda(resumen.efectivoEsperado)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Efectivo contado</span>
                <span className="text-text font-medium tabular-nums">{formatoMoneda(Number(efectivoContado))}</span>
              </div>
            </div>

            {diferenciaPreview !== null && (
              <div
                className={`flex items-center justify-between rounded-lg px-3 py-2 mt-3 ${
                  diferenciaPreview === 0 ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                <span
                  className={`text-sm font-medium ${
                    diferenciaPreview === 0 ? 'text-green-700' : 'text-red-600'
                  }`}
                >
                  {diferenciaPreview === 0 ? 'Caja cuadrada' : 'Diferencia'}
                </span>
                <span
                  className={`text-base font-bold tabular-nums ${
                    diferenciaPreview === 0 ? 'text-green-700' : 'text-red-600'
                  }`}
                >
                  {formatoDif(diferenciaPreview)}
                </span>
              </div>
            )}

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
                onClick={() => setModalCierre(false)}
                className="flex-1 border border-border text-text-muted font-medium rounded-lg py-2 transition-colors hover:bg-surface"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarCierre}
                disabled={cerrando}
                className="flex-1 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg py-2 transition-colors disabled:opacity-60"
              >
                {cerrando ? 'Cerrando...' : 'Confirmar Cierre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
