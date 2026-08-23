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
  }
  totalIngresos: number
  totalEgresos: number
  egresosEfectivo: number
  fondoCambio: number
  efectivoEsperado: number
}

const TIPO_LABEL: Record<TipoTurno, string> = {
  MANIANA: 'Mañana',
  TARDE: 'Tarde',
}

const FONDO_CAMBIO_DEFAULT = 5000

const formatoMoneda = (valor: number) => `$${valor.toLocaleString('es-AR')}`
const formatoHora = (fecha: string) =>
  new Date(fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

export default function CierreTurno() {
  const [cargando, setCargando] = useState(true)
  const [turno, setTurno] = useState<Turno | null>(null)
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [error, setError] = useState('')

  const [cajeraNombre, setCajeraNombre] = useState('')
  const [fondoCambio, setFondoCambio] = useState(String(FONDO_CAMBIO_DEFAULT))
  const [abriendo, setAbriendo] = useState<TipoTurno | null>(null)

  const [modalCierre, setModalCierre] = useState(false)
  const [efectivoContado, setEfectivoContado] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [cerrando, setCerrando] = useState(false)
  const [errorModal, setErrorModal] = useState('')

  const [cierreFinal, setCierreFinal] = useState<{ turno: Turno; resumen: Resumen } | null>(null)

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

  const abrirModalCierre = () => {
    setEfectivoContado('')
    setObservaciones('')
    setErrorModal('')
    setModalCierre(true)
  }

  const diferenciaPreview =
    turno && resumen && efectivoContado !== '' ? Number(efectivoContado) - resumen.efectivoEsperado : null

  const handleConfirmarCierre = async (e: React.FormEvent) => {
    e.preventDefault()
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
    fetchActivo()
  }

  if (cargando) {
    return (
      <Layout titulo="Cierre de Turno">
        <p className="text-text-muted">Cargando...</p>
      </Layout>
    )
  }

  // Vista: recibo del turno recién cerrado
  if (cierreFinal) {
    const { turno: t, resumen: r } = cierreFinal
    const cuadra = Math.abs(Number(t.diferencia)) < 0.01
    return (
      <Layout titulo="Cierre de Turno">
        <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-border p-6" id="recibo-turno">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text">Resumen del cierre</h2>
            <button
              onClick={() => window.print()}
              className="text-xs font-medium text-primary hover:text-primary-dark transition-colors"
            >
              Imprimir
            </button>
          </div>

          <p className="text-sm text-text-muted">
            Turno {TIPO_LABEL[t.tipo]} · {t.cajera}
          </p>
          <p className="text-sm text-text-muted">
            {formatoHora(t.abiertaEn)} - {t.cerradaEn && formatoHora(t.cerradaEn)}
          </p>

          <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Fondo de cambio</span>
              <span className="text-text">{formatoMoneda(r.fondoCambio)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Ingresos Efectivo</span>
              <span className="text-text">{formatoMoneda(r.porMetodo.EFECTIVO)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Ingresos Tarjeta</span>
              <span className="text-text">{formatoMoneda(r.porMetodo.TARJETA)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Ingresos Mercado Pago</span>
              <span className="text-text">{formatoMoneda(r.porMetodo.MERCADO_PAGO)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Egresos Efectivo</span>
              <span className="text-text">-{formatoMoneda(r.egresosEfectivo)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-text">Efectivo esperado</span>
              <span className="text-text">{formatoMoneda(r.efectivoEsperado)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-text">Efectivo contado</span>
              <span className="text-text">{formatoMoneda(Number(t.efectivoContado))}</span>
            </div>
            {t.observaciones && (
              <div className="flex justify-between">
                <span className="text-text-muted">Observaciones</span>
                <span className="text-text">{t.observaciones}</span>
              </div>
            )}
          </div>

          <div
            className={`flex items-center justify-between mt-4 pt-4 border-t border-border rounded-lg px-3 py-3 ${
              cuadra ? 'bg-green-50' : 'bg-red-50'
            }`}
          >
            <p className={`font-semibold ${cuadra ? 'text-green-700' : 'text-red-600'}`}>Diferencia</p>
            <p className={`text-2xl font-bold ${cuadra ? 'text-green-700' : 'text-red-600'}`}>
              {formatoMoneda(Number(t.diferencia))}
            </p>
          </div>

          <button
            onClick={handleVolver}
            className="w-full mt-6 border border-border text-text font-medium rounded-lg py-2 transition-colors hover:bg-surface"
          >
            Volver
          </button>
        </div>
      </Layout>
    )
  }

  // Vista: no hay turno abierto -> abrir uno nuevo
  if (!turno) {
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

  // Vista: turno abierto -> resumen en vivo + cierre
  return (
    <Layout titulo="Cierre de Turno">
      <div className="flex items-center justify-between mb-6">
        <span className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full bg-[#EDE9FE] text-primary">
          {turno.tipo === 'MANIANA' ? '☀️' : '🌙'} Turno {TIPO_LABEL[turno.tipo]} · {turno.cajera} · desde{' '}
          {formatoHora(turno.abiertaEn)} · Fondo {formatoMoneda(Number(turno.fondoCambio))}
        </span>
        <button
          onClick={abrirModalCierre}
          className="bg-primary hover:bg-primary-dark text-white font-medium rounded-lg px-4 py-2 transition-colors"
        >
          Cerrar Turno
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      {resumen && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded-2xl shadow-sm border border-border p-5">
              <p className="text-sm text-text-muted">💵 Efectivo</p>
              <p className="text-2xl font-bold text-green-700 mt-2">{formatoMoneda(resumen.porMetodo.EFECTIVO)}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-border p-5">
              <p className="text-sm text-text-muted">💳 Tarjeta</p>
              <p className="text-2xl font-bold text-blue-700 mt-2">{formatoMoneda(resumen.porMetodo.TARJETA)}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-border p-5">
              <p className="text-sm text-text-muted">📱 Mercado Pago</p>
              <p className="text-2xl font-bold text-sky-700 mt-2">{formatoMoneda(resumen.porMetodo.MERCADO_PAGO)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-border p-5">
              <p className="text-sm text-text-muted">Total Egresos</p>
              <p className="text-2xl font-bold text-red-600 mt-2">{formatoMoneda(resumen.totalEgresos)}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-border p-5">
              <p className="text-sm text-text-muted">Efectivo esperado en caja</p>
              <p className="text-2xl font-bold text-primary mt-2">{formatoMoneda(resumen.efectivoEsperado)}</p>
            </div>
          </div>
        </>
      )}

      {modalCierre && resumen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-sm border border-border w-full max-w-sm py-8 px-8">
            <h2 className="text-lg font-bold text-text mb-6">Cerrar turno</h2>

            <form onSubmit={handleConfirmarCierre} className="flex flex-col">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-text mb-2">Efectivo contado en caja $</label>
                <input
                  type="number"
                  value={efectivoContado}
                  onChange={(e) => setEfectivoContado(e.target.value)}
                  autoFocus
                  required
                  className="border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
                />
              </div>

              {diferenciaPreview !== null && (
                <div
                  className={`flex items-center justify-between mt-4 rounded-lg px-3 py-3 ${
                    Math.abs(diferenciaPreview) < 0.01 ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  <p
                    className={`text-sm font-medium ${
                      Math.abs(diferenciaPreview) < 0.01 ? 'text-green-700' : 'text-red-600'
                    }`}
                  >
                    Diferencia
                  </p>
                  <p
                    className={`text-lg font-bold ${
                      Math.abs(diferenciaPreview) < 0.01 ? 'text-green-700' : 'text-red-600'
                    }`}
                  >
                    {formatoMoneda(diferenciaPreview)}
                  </p>
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
                  type="submit"
                  disabled={cerrando}
                  className="flex-1 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg py-2 transition-colors disabled:opacity-60"
                >
                  {cerrando ? 'Cerrando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
